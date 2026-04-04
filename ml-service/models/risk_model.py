"""
SwiftShield — Composite Weekly Risk Score Calculator

Each worker receives a weeklyRiskScore (0–100) with a plain-language breakdown.

4 Components (from README):
  1. Weather exposure risk  — assigned zone + current season
  2. Traffic risk           — zone congestion patterns + typical shift timing
  3. Behavior risk          — delivery activity patterns, active hours, volume
  4. Fraud risk             — claim frequency vs. pin-code peer group, past anomaly flags

Output:
  - weekly_risk_score (0–100)
  - breakdown: dict of 4 component scores (each 0–25)
  - top_3_drivers: plain-language explanation strings
"""

import numpy as np


# ── Zone risk profiles ──────────────────────────────────────────────────────

# Average disruption frequency per zone per season (events / month)
ZONE_WEATHER_RISK = {
    "zone_del_1": {"summer": 0.7, "monsoon": 0.9, "winter": 0.4, "spring": 0.3},
    "zone_del_2": {"summer": 0.6, "monsoon": 0.85, "winter": 0.5, "spring": 0.3},
    "zone_mum_1": {"summer": 0.5, "monsoon": 0.95, "winter": 0.2, "spring": 0.2},
    "zone_blr_1": {"summer": 0.6, "monsoon": 0.8, "winter": 0.15, "spring": 0.25},
}

# Zone congestion factor (0–1, higher = more congested)
ZONE_CONGESTION = {
    "zone_del_1": 0.8,
    "zone_del_2": 0.6,
    "zone_mum_1": 0.75,
    "zone_blr_1": 0.65,
}

# Shift timing risk multiplier
SHIFT_RISK = {
    "morning":  0.6,   # 6am–12pm — moderate traffic
    "afternoon": 0.5,  # 12pm–5pm — lower risk
    "evening":  0.85,  # 5pm–10pm — peak demand + congestion
    "night":    0.7,   # 10pm–6am — low visibility, fewer riders
}

# Season determination by month
MONTH_TO_SEASON = {
    1: "winter", 2: "winter", 3: "spring", 4: "summer",
    5: "summer", 6: "monsoon", 7: "monsoon", 8: "monsoon",
    9: "monsoon", 10: "spring", 11: "winter", 12: "winter",
}


class RiskModel:
    """Composite risk scorer — rule-based engine combining domain knowledge."""

    def predict(self, features: dict) -> dict:
        """
        Compute weekly risk score for a worker.

        Args:
            features: {
                "zone_id": str,
                "city": str,
                "season": str (summer/monsoon/winter/spring) OR "auto" to use current month,
                "weekly_deliveries": int,
                "weekly_active_hours": float,
                "avg_rating": float,
                "claim_count_4wk": int,    # claims in last 4 weeks
                "fraud_flags_past": int,    # past anomaly flags
                "platform": str,
                "vehicle_type": str,
                "shift_timing": str (morning/afternoon/evening/night),
            }

        Returns:
            {
              "risk_score": int (0-100),
              "breakdown": { "weather_exposure": int, "traffic_risk": int,
                            "behavior_risk": int, "fraud_risk": int },
              "top_3_drivers": [str, str, str],
              "risk_level": "low" | "medium" | "high",
            }
        """
        zone_id = features.get("zone_id", "zone_del_1")
        season = features.get("season", "monsoon")
        if season == "auto":
            from datetime import datetime
            season = MONTH_TO_SEASON.get(datetime.now().month, "monsoon")

        shift = features.get("shift_timing", "evening")
        weekly_deliveries = features.get("weekly_deliveries", 100)
        weekly_hours = features.get("weekly_active_hours", 35)
        avg_rating = features.get("avg_rating", 4.5)
        claim_count = features.get("claim_count_4wk", 0)
        fraud_flags = features.get("fraud_flags_past", 0)

        # ── Component 1: Weather Exposure (0–25) ────────────────────────
        zone_risk = ZONE_WEATHER_RISK.get(zone_id, {}).get(season, 0.5)
        weather_score = int(np.clip(zone_risk * 25, 0, 25))

        weather_driver = (
            f"{'High' if zone_risk > 0.7 else 'Moderate' if zone_risk > 0.4 else 'Low'} "
            f"disruption probability in {season} season"
        )

        # ── Component 2: Traffic Risk (0–25) ────────────────────────────
        congestion = ZONE_CONGESTION.get(zone_id, 0.5)
        shift_mult = SHIFT_RISK.get(shift, 0.5)
        traffic_raw = congestion * shift_mult
        traffic_score = int(np.clip(traffic_raw * 25, 0, 25))

        traffic_driver = (
            f"{'Heavy' if congestion > 0.7 else 'Moderate'} zone congestion "
            f"during {shift} shift"
        )

        # ── Component 3: Behavior Risk (0–25) ───────────────────────────
        # Low deliveries or hours = higher exposure risk (less revenue cushion)
        delivery_factor = 1.0 - np.clip(weekly_deliveries / 150, 0, 1)  # fewer = riskier
        hours_factor = 1.0 - np.clip(weekly_hours / 48, 0, 1)
        rating_factor = 1.0 - np.clip((avg_rating - 3.0) / 2.0, 0, 1)  # lower rating = riskier

        behavior_raw = (delivery_factor * 0.4 + hours_factor * 0.35 + rating_factor * 0.25)
        behavior_score = int(np.clip(behavior_raw * 25, 0, 25))

        if delivery_factor > 0.5:
            behavior_driver = f"Below-average delivery volume ({weekly_deliveries}/week)"
        elif hours_factor > 0.5:
            behavior_driver = f"Below-average active hours ({weekly_hours:.0f} hrs/week)"
        else:
            behavior_driver = f"Steady activity pattern ({weekly_deliveries} deliveries, {weekly_hours:.0f} hrs)"

        # ── Component 4: Fraud Risk (0–25) ──────────────────────────────
        claim_factor = np.clip(claim_count / 6, 0, 1)    # ≥6 claims in 4wk → max
        flag_factor = np.clip(fraud_flags / 3, 0, 1)      # ≥3 past flags → max

        fraud_raw = claim_factor * 0.6 + flag_factor * 0.4
        fraud_score = int(np.clip(fraud_raw * 25, 0, 25))

        if fraud_flags > 0:
            fraud_driver = f"{fraud_flags} past anomaly flag(s) on record"
        elif claim_count > 3:
            fraud_driver = f"High claim frequency ({claim_count} claims in 4 weeks)"
        else:
            fraud_driver = "Clean fraud history"

        # ── Aggregate ───────────────────────────────────────────────────
        total_score = weather_score + traffic_score + behavior_score + fraud_score

        breakdown = {
            "weather_exposure": weather_score,
            "traffic_risk": traffic_score,
            "behavior_risk": behavior_score,
            "fraud_risk": fraud_score,
        }

        # Top 3 drivers sorted by component score descending
        drivers_ranked = sorted(
            [
                (weather_score, weather_driver),
                (traffic_score, traffic_driver),
                (behavior_score, behavior_driver),
                (fraud_score, fraud_driver),
            ],
            key=lambda x: x[0],
            reverse=True,
        )
        top_3_drivers = [d[1] for d in drivers_ranked[:3]]

        # Risk level
        if total_score <= 30:
            risk_level = "low"
        elif total_score <= 60:
            risk_level = "medium"
        else:
            risk_level = "high"

        return {
            "risk_score": total_score,
            "breakdown": breakdown,
            "top_3_drivers": top_3_drivers,
            "risk_level": risk_level,
        }
