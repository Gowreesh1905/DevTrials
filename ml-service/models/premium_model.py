"""
SwiftShield — XGBoost Dynamic Weekly Premium Engine

Premiums recalculate every Sunday using a Gradient Boosting (XGBoost) model.

Inputs (from README):
  - Zone flood and heat history
  - 7-day weather forecast risk (OpenWeatherMap)
  - Worker's 4-week earnings average
  - Historical claim rate by pin code
  - Seasonal strike/curfew frequency
  - City-tier risk factor (metro vs. tier-2)
  - Vehicle type and platform risk profile

Outputs:
  - weeklyPremium (₹)
  - Human-readable explanation of the top 3 pricing factors
  - Week-on-week premium delta (fairness cap ±20%)
"""

import os
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

# ── Feature schema ──────────────────────────────────────────────────────────

NUMERIC_FEATURES = [
    "zone_flood_history",       # count of flood events in zone (past 12 months)
    "zone_heat_history",        # count of extreme-heat days in zone (past 12 months)
    "weather_forecast_risk",    # 0-1 probability of disruption in next 7 days
    "earnings_avg_4wk",         # worker's 4-week rolling average earnings (₹)
    "claim_rate_pincode",       # historical claim rate for this pin code (0-1)
    "seasonal_strike_freq",     # seasonal strike/curfew frequency (0-1)
    "city_tier",                # 1 = metro, 2 = tier-2
]

CATEGORICAL_FEATURES = [
    "vehicle_type",             # bike / scooter / bicycle
    "platform",                 # blinkit / zepto / instamart
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Human-readable names for explainability
FEATURE_DISPLAY_NAMES = {
    "zone_flood_history":    "Flood history in your zone",
    "zone_heat_history":     "Heat-wave history in your zone",
    "weather_forecast_risk": "7-day weather forecast risk",
    "earnings_avg_4wk":      "Your 4-week average earnings",
    "claim_rate_pincode":    "Historical claim rate in your area",
    "seasonal_strike_freq":  "Seasonal strike/curfew frequency",
    "city_tier":             "City risk tier",
    "vehicle_type":          "Vehicle type risk profile",
    "platform":              "Platform risk profile",
}

# Fairness cap: week-on-week premium cannot change more than ±20%
FAIRNESS_CAP_PCT = 0.20

# Premium floor and ceiling
PREMIUM_MIN = 20.0
PREMIUM_MAX = 150.0

# ── Cold-start peer-group priors ────────────────────────────────────────────

# Fallback premium when worker has < 4 weeks of data
# Keyed by (city_tier, platform) → average premium from peer group
COLD_START_PRIORS = {
    (1, "blinkit"):   55.0,
    (1, "zepto"):     52.0,
    (1, "instamart"): 50.0,
    (2, "blinkit"):   38.0,
    (2, "zepto"):     36.0,
    (2, "instamart"): 35.0,
}


# ── Label Encoders ──────────────────────────────────────────────────────────

def _build_label_encoders():
    """Pre-fit label encoders for categorical features."""
    encoders = {}

    le_vehicle = LabelEncoder()
    le_vehicle.fit(["bike", "scooter", "bicycle"])
    encoders["vehicle_type"] = le_vehicle

    le_platform = LabelEncoder()
    le_platform.fit(["blinkit", "zepto", "instamart"])
    encoders["platform"] = le_platform

    return encoders


# ── Model wrapper ───────────────────────────────────────────────────────────

class PremiumModel:
    """XGBoost-based dynamic weekly premium engine."""

    def __init__(self):
        self.model: XGBRegressor | None = None
        self.encoders = _build_label_encoders()

    # ── Training ────────────────────────────────────────────────────────

    def train(self, df: pd.DataFrame):
        """
        Train the XGBoost model on a DataFrame that contains
        all ALL_FEATURES columns + a 'weekly_premium' target column.
        """
        X = self._prepare_features(df)
        y = df["weekly_premium"].values

        self.model = XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
        )
        self.model.fit(X, y)

        # Training RMSE
        preds = self.model.predict(X)
        rmse = float(np.sqrt(np.mean((preds - y) ** 2)))
        return {"rmse": round(rmse, 2), "samples": len(y)}

    # ── Prediction ──────────────────────────────────────────────────────

    def predict(
        self,
        features: dict,
        previous_premium: float | None = None,
        weeks_active: int = 4,
    ) -> dict:
        """
        Predict weekly premium for a single worker.

        Args:
            features: dict with keys matching ALL_FEATURES
            previous_premium: last week's premium (for delta + fairness cap)
            weeks_active: how many weeks the worker has been active

        Returns:
            {
              "weekly_premium": float,
              "top_3_factors": [str, str, str],
              "week_on_week_delta": float | None,
              "is_cold_start": bool,
            }
        """
        # Cold-start fallback
        if weeks_active < 4:
            key = (features.get("city_tier", 1), features.get("platform", "blinkit"))
            fallback = COLD_START_PRIORS.get(key, 45.0)
            return {
                "weekly_premium": round(fallback, 2),
                "top_3_factors": [
                    "New worker — using zone peer-group average",
                    f"City tier: {'metro' if key[0] == 1 else 'tier-2'}",
                    f"Platform: {key[1]}",
                ],
                "week_on_week_delta": None,
                "is_cold_start": True,
            }

        if self.model is None:
            raise RuntimeError("Model not trained. Call train() or load() first.")

        row = pd.DataFrame([features])
        X = self._prepare_features(row)
        raw_premium = float(self.model.predict(X)[0])

        # Clamp to valid range
        premium = float(np.clip(raw_premium, PREMIUM_MIN, PREMIUM_MAX))

        # Apply fairness cap
        delta = None
        if previous_premium is not None and previous_premium > 0:
            max_change = previous_premium * FAIRNESS_CAP_PCT
            capped = np.clip(premium, previous_premium - max_change, previous_premium + max_change)
            delta = round(capped - previous_premium, 2)
            premium = float(capped)

        premium = round(premium, 2)

        # Explainability — top 3 factors
        top_3 = self._get_top_factors(features, 3)

        return {
            "weekly_premium": premium,
            "top_3_factors": top_3,
            "week_on_week_delta": delta,
            "is_cold_start": False,
        }

    # ── Explainability ──────────────────────────────────────────────────

    def _get_top_factors(self, features: dict, k: int = 3) -> list[str]:
        """Return human-readable top-k pricing factors using feature importance."""
        if self.model is None:
            return ["Model not loaded"]

        importances = self.model.feature_importances_

        # Map encoded feature indices to original feature names
        feature_names = NUMERIC_FEATURES + CATEGORICAL_FEATURES
        indexed = sorted(
            zip(feature_names, importances),
            key=lambda x: x[1],
            reverse=True,
        )

        explanations = []
        for feat_name, imp in indexed[:k]:
            display = FEATURE_DISPLAY_NAMES.get(feat_name, feat_name)
            val = features.get(feat_name, "N/A")

            if feat_name == "city_tier":
                val_str = "Metro" if val == 1 else "Tier-2"
            elif feat_name in ("weather_forecast_risk", "claim_rate_pincode", "seasonal_strike_freq"):
                val_str = f"{float(val) * 100:.0f}%"
            elif feat_name == "earnings_avg_4wk":
                val_str = f"₹{val}"
            else:
                val_str = str(val)

            explanations.append(f"{display}: {val_str}")

        return explanations

    # ── Feature engineering ─────────────────────────────────────────────

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        """Convert a DataFrame with raw features into a numeric matrix."""
        result = df[NUMERIC_FEATURES].copy().astype(float)

        for cat_col in CATEGORICAL_FEATURES:
            le = self.encoders[cat_col]
            encoded = le.transform(df[cat_col].values)
            result[cat_col] = encoded

        return result.values

    # ── Persistence ─────────────────────────────────────────────────────

    def save(self, path: str | None = None):
        """Save model + encoders to disk."""
        path = path or os.path.join(ARTIFACTS_DIR, "premium_model.joblib")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({"model": self.model, "encoders": self.encoders}, path)

    def load(self, path: str | None = None):
        """Load model + encoders from disk."""
        path = path or os.path.join(ARTIFACTS_DIR, "premium_model.joblib")
        data = joblib.load(path)
        self.model = data["model"]
        self.encoders = data["encoders"]
