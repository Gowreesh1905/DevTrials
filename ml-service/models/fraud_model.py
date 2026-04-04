"""
SwiftShield — Isolation Forest Fraud Detection Model

Layer 4 of the 4-layer claim approval system:
  ML anomaly score — claim frequency vs. pin-code peer group (Isolation Forest model)

Features (11 behavioral signals across all 4 detection layers):
  Layer 1 - GPS:           is_in_zone, movement_speed_kmh
  Layer 2 - Platform:      platform_session_active, device_consistency_score
  Layer 3 - Timing:        was_active_before_trigger, time_since_last_claim_hrs
  Layer 4 - ML Behavioral: claim_frequency_7d, claim_amount, avg_claim_amount_peer,
                           claims_in_zone_1hr, claim_hour

Outputs:
  - anomaly_score (0–100)
  - decision: auto_approve / soft_hold / reject
  - flags: list of triggered fraud signals

Decision bands:
  0–40:   auto_approve
  40–70:  soft_hold  (partial payout + step-up verification)
  70–100: reject
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

# ── Feature schema ──────────────────────────────────────────────────────────

FEATURES = [
    "claim_frequency_7d",        # number of claims in last 7 days
    "claim_amount",              # current claim amount (₹)
    "avg_claim_amount_peer",     # average claim amount for pin-code peer group (₹)
    "time_since_last_claim_hrs", # hours since worker's last claim
    "claims_in_zone_1hr",        # total claims filed in this zone in the last hour
    "is_in_zone",                # 1 if GPS is within 500m of zone boundary, else 0
    "was_active_before_trigger", # 1 if worker was active ≥ 15 min before disruption
    "movement_speed_kmh",        # average movement speed (km/h) — detects static/teleport
    "platform_session_active",   # 1 if platform API confirms active session
    "device_consistency_score",  # 0-1 device fingerprint consistency across claims
    "claim_hour",                # hour of day (0–23)
]

# Human-readable flag descriptions
SIGNAL_FLAGS = {
    "claim_frequency_7d":        "Unusually high claim frequency (last 7 days)",
    "claim_amount":              "Claim amount significantly above peer average",
    "time_since_last_claim_hrs": "Claim filed too soon after previous claim",
    "claims_in_zone_1hr":        "Suspicious spike in zone-wide claims (possible ring)",
    "is_in_zone":                "GPS location outside assigned delivery zone",
    "was_active_before_trigger": "Worker was not active before disruption event",
    "movement_speed_kmh":        "Suspicious movement pattern (static or teleport)",
    "platform_session_active":   "No active platform session confirmed",
    "device_consistency_score":  "Device fingerprint inconsistency detected",
    "claim_hour":                "Claim filed during unusual hours",
}

# ── Decision thresholds ─────────────────────────────────────────────────────

THRESHOLD_AUTO_APPROVE = 40   # score 0–40
THRESHOLD_SOFT_HOLD = 70      # score 40–70
# score 70–100 → reject

# ── Ring detection thresholds ───────────────────────────────────────────────

RING_DETECTION_ZONE_CLAIMS = 3  # flag if > 3 claims in same zone within 1 hour


# ── Model wrapper ───────────────────────────────────────────────────────────

class FraudModel:
    """Isolation Forest-based claim fraud detection."""

    def __init__(self):
        self.model: IsolationForest | None = None
        self.scaler: StandardScaler | None = None

    # ── Training ────────────────────────────────────────────────────────

    def train(self, df: pd.DataFrame, contamination: float = 0.08):
        """
        Train the Isolation Forest on a DataFrame with all FEATURES columns.

        contamination: expected proportion of anomalies (~8%: 5% individual + 3% ring)
        """
        X = df[FEATURES].values.astype(float)

        # Standardize features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=200,
            max_samples="auto",
            contamination=contamination,
            max_features=1.0,
            bootstrap=False,
            random_state=42,
        )
        self.model.fit(X_scaled)

        # Report training stats
        scores = self.model.decision_function(X_scaled)
        anomaly_preds = self.model.predict(X_scaled)
        n_anomalies = int((anomaly_preds == -1).sum())

        return {
            "samples": len(X),
            "anomalies_detected": n_anomalies,
            "anomaly_rate": round(n_anomalies / len(X), 4),
            "score_mean": round(float(scores.mean()), 4),
            "score_std": round(float(scores.std()), 4),
        }

    # ── Prediction ──────────────────────────────────────────────────────

    def predict(self, features: dict) -> dict:
        """
        Score a single claim for fraud.

        Args:
            features: dict with keys matching FEATURES

        Returns:
            {
              "anomaly_score": int (0-100),
              "decision": "auto_approve" | "soft_hold" | "reject",
              "flags": [str],             # triggered fraud signals
              "ring_alert": bool,          # zone-level ring detection flag
              "raw_isolation_score": float # raw model score for debugging
            }
        """
        if self.model is None or self.scaler is None:
            raise RuntimeError("Model not trained. Call train() or load() first.")

        row = np.array([[float(features.get(f, 0)) for f in FEATURES]])
        row_scaled = self.scaler.transform(row)

        # Isolation Forest: decision_function returns negative for anomalies
        raw_score = float(self.model.decision_function(row_scaled)[0])

        # Convert to 0-100 anomaly score (higher = more suspicious)
        # decision_function range is roughly [-0.5, 0.5]; map to [0, 100]
        anomaly_score = self._normalize_score(raw_score)

        # Rule-based flag detection
        flags = self._detect_flags(features)

        # Ring detection
        ring_alert = features.get("claims_in_zone_1hr", 0) > RING_DETECTION_ZONE_CLAIMS

        # Boost score if rule-based flags fire
        flag_boost = len(flags) * 8
        anomaly_score = min(100, anomaly_score + flag_boost)

        # Decision
        if anomaly_score <= THRESHOLD_AUTO_APPROVE:
            decision = "auto_approve"
        elif anomaly_score <= THRESHOLD_SOFT_HOLD:
            decision = "soft_hold"
        else:
            decision = "reject"

        # Ring alert escalates to at least soft_hold
        if ring_alert and decision == "auto_approve":
            decision = "soft_hold"
            flags.append("Zone-level claim spike detected — possible coordinated fraud")

        return {
            "anomaly_score": int(anomaly_score),
            "decision": decision,
            "flags": flags,
            "ring_alert": ring_alert,
            "raw_isolation_score": round(raw_score, 4),
        }

    # ── Flag detection (rule-based signals) ─────────────────────────────

    def _detect_flags(self, features: dict) -> list[str]:
        """Detect individual rule-based fraud signals."""
        flags = []

        # Claim frequency too high
        if features.get("claim_frequency_7d", 0) > 3:
            flags.append(SIGNAL_FLAGS["claim_frequency_7d"])

        # Claim amount much higher than peer average
        claim_amt = features.get("claim_amount", 0)
        peer_avg = features.get("avg_claim_amount_peer", 200)
        if peer_avg > 0 and claim_amt > peer_avg * 1.8:
            flags.append(SIGNAL_FLAGS["claim_amount"])

        # Too soon after last claim (< 48 hrs cooling ideally)
        if features.get("time_since_last_claim_hrs", 999) < 48:
            flags.append(SIGNAL_FLAGS["time_since_last_claim_hrs"])

        # Outside assigned zone
        if not features.get("is_in_zone", True):
            flags.append(SIGNAL_FLAGS["is_in_zone"])

        # Not active before trigger
        if not features.get("was_active_before_trigger", True):
            flags.append(SIGNAL_FLAGS["was_active_before_trigger"])

        # Suspicious movement (too slow = static/spoofing, too fast = teleport)
        speed = features.get("movement_speed_kmh", 10)
        if speed < 0.5 or speed > 120:
            flags.append(SIGNAL_FLAGS["movement_speed_kmh"])

        # No platform session
        if not features.get("platform_session_active", True):
            flags.append(SIGNAL_FLAGS["platform_session_active"])

        # Device inconsistency
        if features.get("device_consistency_score", 1.0) < 0.6:
            flags.append(SIGNAL_FLAGS["device_consistency_score"])

        # Unusual hours
        hour = features.get("claim_hour", 12)
        if hour < 5 or hour > 23:
            flags.append(SIGNAL_FLAGS["claim_hour"])

        return flags

    # ── Score normalization ──────────────────────────────────────────────

    def _normalize_score(self, raw_score: float) -> int:
        """
        Convert Isolation Forest decision_function output to 0-100 score.

        decision_function:
          - higher values → more normal
          - lower (more negative) → more anomalous

        We invert and scale so:
          - 0 = very normal
          - 100 = very anomalous
        """
        # Typical range: [-0.5, 0.5]; clamp to [-0.6, 0.6]
        clamped = np.clip(raw_score, -0.6, 0.6)
        # Invert: more negative raw → higher anomaly score
        normalized = (0.6 - clamped) / 1.2  # maps to [0, 1]
        return int(np.clip(normalized * 100, 0, 100))

    # ── Persistence ─────────────────────────────────────────────────────

    def save(self, path: str | None = None):
        path = path or os.path.join(ARTIFACTS_DIR, "fraud_model.joblib")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({"model": self.model, "scaler": self.scaler}, path)

    def load(self, path: str | None = None):
        path = path or os.path.join(ARTIFACTS_DIR, "fraud_model.joblib")
        data = joblib.load(path)
        self.model = data["model"]
        self.scaler = data["scaler"]
