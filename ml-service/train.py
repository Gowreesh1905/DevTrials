"""
SwiftShield ML — Model Training Pipeline

Trains both ML models using synthetic data and saves artifacts to models/artifacts/.

Usage:
  python train.py                    # train with inline synthetic data
  python train.py --data-dir ./data  # train from CSV files (after DB export)

The synthetic data generator is built-in so the models can be trained
and demoed immediately. When the real database schema is ready, pass
--data-dir pointing to exported CSVs.
"""

import argparse
import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))

from models.premium_model import PremiumModel, ALL_FEATURES as PREMIUM_FEATURES
from models.fraud_model import FraudModel, FEATURES as FRAUD_FEATURES


ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "models", "artifacts")


# ── Synthetic data generators ──────────────────────────────────────────────

def generate_premium_data(n: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic premium training data.

    Target formula (with noise):
      base = 25 + 8*zone_flood + 5*zone_heat + 20*weather_risk
             - 0.002*earnings + 30*claim_rate + 15*strike_freq
             + (10 if city_tier==1 else 0) + vehicle_adj + platform_adj
    """
    rng = np.random.RandomState(seed)

    vehicles = ["bike", "scooter", "bicycle"]
    platforms = ["blinkit", "zepto", "instamart"]
    vehicle_adj = {"bike": 5, "scooter": 3, "bicycle": -2}
    platform_adj = {"blinkit": 2, "zepto": 0, "instamart": 1}

    data = {
        "zone_flood_history":    rng.randint(0, 12, n),
        "zone_heat_history":     rng.randint(0, 15, n),
        "weather_forecast_risk": rng.uniform(0.0, 1.0, n).round(3),
        "earnings_avg_4wk":      rng.uniform(2000, 8000, n).round(0),
        "claim_rate_pincode":    rng.uniform(0.02, 0.35, n).round(3),
        "seasonal_strike_freq":  rng.uniform(0.0, 0.5, n).round(3),
        "city_tier":             rng.choice([1, 2], n, p=[0.6, 0.4]),
        "vehicle_type":          rng.choice(vehicles, n),
        "platform":              rng.choice(platforms, n),
    }

    df = pd.DataFrame(data)

    # Compute target using known formula + noise
    premium = (
        25
        + 8 * df["zone_flood_history"]
        + 5 * df["zone_heat_history"]
        + 20 * df["weather_forecast_risk"]
        - 0.002 * df["earnings_avg_4wk"]
        + 30 * df["claim_rate_pincode"]
        + 15 * df["seasonal_strike_freq"]
        + (df["city_tier"] == 1).astype(float) * 10
        + df["vehicle_type"].map(vehicle_adj)
        + df["platform"].map(platform_adj)
        + rng.normal(0, 5, n)     # noise
    )

    # Clamp to realistic range
    df["weekly_premium"] = np.clip(premium, 20, 150).round(2)

    return df


def generate_fraud_data(n: int = 10000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic fraud detection training data.

    ~92% normal workers, ~5% individual fraud, ~3% ring fraud.
    """
    rng = np.random.RandomState(seed)

    n_normal = int(n * 0.92)
    n_individual_fraud = int(n * 0.05)
    n_ring_fraud = n - n_normal - n_individual_fraud

    rows = []

    # Normal workers
    for _ in range(n_normal):
        rows.append({
            "claim_frequency_7d":        rng.choice([0, 1, 1, 1, 2], p=[0.3, 0.3, 0.2, 0.1, 0.1]),
            "claim_amount":              rng.uniform(80, 400),
            "avg_claim_amount_peer":     rng.uniform(150, 300),
            "time_since_last_claim_hrs": rng.uniform(48, 336),   # 2–14 days
            "claims_in_zone_1hr":        rng.choice([1, 2, 3], p=[0.6, 0.3, 0.1]),
            "is_in_zone":               1,
            "was_active_before_trigger": 1,
            "movement_speed_kmh":        rng.uniform(5, 40),
            "platform_session_active":   1,
            "device_consistency_score":  rng.uniform(0.85, 1.0),
            "claim_hour":               rng.choice(range(6, 23)),
        })

    # Individual fraud
    for _ in range(n_individual_fraud):
        rows.append({
            "claim_frequency_7d":        rng.choice([3, 4, 5, 6]),
            "claim_amount":              rng.uniform(350, 800),   # inflated
            "avg_claim_amount_peer":     rng.uniform(150, 250),
            "time_since_last_claim_hrs": rng.uniform(2, 40),     # too soon
            "claims_in_zone_1hr":        rng.choice([1, 2]),
            "is_in_zone":               rng.choice([0, 1], p=[0.4, 0.6]),
            "was_active_before_trigger": rng.choice([0, 1], p=[0.5, 0.5]),
            "movement_speed_kmh":        rng.choice([0.0, 0.1, 150, 200]),  # static or teleport
            "platform_session_active":   rng.choice([0, 1], p=[0.3, 0.7]),
            "device_consistency_score":  rng.uniform(0.2, 0.7),
            "claim_hour":               rng.choice([0, 1, 2, 3, 4, 23]),
        })

    # Ring fraud (coordinated)
    for _ in range(n_ring_fraud):
        rows.append({
            "claim_frequency_7d":        rng.choice([2, 3, 4]),
            "claim_amount":              rng.uniform(280, 500),     # similar amounts
            "avg_claim_amount_peer":     rng.uniform(150, 250),
            "time_since_last_claim_hrs": rng.uniform(10, 48),
            "claims_in_zone_1hr":        rng.choice([5, 6, 7, 8, 10]),  # high zone spike
            "is_in_zone":               1,                          # spoofed GPS
            "was_active_before_trigger": rng.choice([0, 1], p=[0.3, 0.7]),
            "movement_speed_kmh":        rng.uniform(0, 3),        # suspiciously static
            "platform_session_active":   1,
            "device_consistency_score":  rng.uniform(0.4, 0.8),
            "claim_hour":               rng.choice(range(8, 22)),   # normal hours
        })

    df = pd.DataFrame(rows)

    # Round for cleanliness
    for col in ["claim_amount", "avg_claim_amount_peer", "time_since_last_claim_hrs",
                "movement_speed_kmh", "device_consistency_score"]:
        df[col] = df[col].round(2)

    return df


# ── Training pipeline ──────────────────────────────────────────────────────

def train_premium_model(data_dir: str | None = None) -> dict:
    """Train the XGBoost premium model."""
    print("\n" + "=" * 60)
    print("  TRAINING: XGBoost Dynamic Premium Engine")
    print("=" * 60)

    if data_dir and os.path.exists(os.path.join(data_dir, "premium_data.csv")):
        print(f"  Loading data from {data_dir}/premium_data.csv")
        df = pd.read_csv(os.path.join(data_dir, "premium_data.csv"))
    else:
        print("  Generating synthetic training data (5,000 samples)...")
        df = generate_premium_data(n=5000)

    print(f"  Dataset: {len(df)} rows, {len(df.columns)} columns")
    print(f"  Premium range: ₹{df['weekly_premium'].min():.0f} – ₹{df['weekly_premium'].max():.0f}")
    print(f"  Premium mean:  ₹{df['weekly_premium'].mean():.1f}")

    model = PremiumModel()
    metrics = model.train(df)
    model.save()

    print(f"\n  ✓ Training complete")
    print(f"    RMSE: ₹{metrics['rmse']}")
    print(f"    Samples: {metrics['samples']}")
    print(f"    Model saved to: models/artifacts/premium_model.joblib")

    # Quick sanity check
    print("\n  Sanity check — sample predictions:")
    test_cases = [
        {"zone_flood_history": 2, "zone_heat_history": 3, "weather_forecast_risk": 0.3,
         "earnings_avg_4wk": 5000, "claim_rate_pincode": 0.1, "seasonal_strike_freq": 0.05,
         "city_tier": 1, "vehicle_type": "bike", "platform": "blinkit"},
        {"zone_flood_history": 8, "zone_heat_history": 10, "weather_forecast_risk": 0.8,
         "earnings_avg_4wk": 3000, "claim_rate_pincode": 0.3, "seasonal_strike_freq": 0.3,
         "city_tier": 1, "vehicle_type": "scooter", "platform": "zepto"},
        {"zone_flood_history": 1, "zone_heat_history": 1, "weather_forecast_risk": 0.1,
         "earnings_avg_4wk": 6000, "claim_rate_pincode": 0.05, "seasonal_strike_freq": 0.02,
         "city_tier": 2, "vehicle_type": "bicycle", "platform": "instamart"},
    ]
    labels = ["Low-risk metro biker", "High-risk metro scooter", "Low-risk tier-2 cyclist"]

    for label, tc in zip(labels, test_cases):
        result = model.predict(tc)
        print(f"    {label}: ₹{result['weekly_premium']}")
        print(f"      Top factor: {result['top_3_factors'][0]}")

    return metrics


def train_fraud_model(data_dir: str | None = None) -> dict:
    """Train the Isolation Forest fraud model."""
    print("\n" + "=" * 60)
    print("  TRAINING: Isolation Forest Fraud Detection")
    print("=" * 60)

    if data_dir and os.path.exists(os.path.join(data_dir, "fraud_data.csv")):
        print(f"  Loading data from {data_dir}/fraud_data.csv")
        df = pd.read_csv(os.path.join(data_dir, "fraud_data.csv"))
    else:
        print("  Generating synthetic training data (10,000 samples)...")
        df = generate_fraud_data(n=10000)

    print(f"  Dataset: {len(df)} rows, {len(df.columns)} columns")

    model = FraudModel()
    metrics = model.train(df, contamination=0.08)
    model.save()

    print(f"\n  ✓ Training complete")
    print(f"    Samples: {metrics['samples']}")
    print(f"    Anomalies detected: {metrics['anomalies_detected']} ({metrics['anomaly_rate']:.1%})")
    print(f"    Score mean: {metrics['score_mean']}, std: {metrics['score_std']}")
    print(f"    Model saved to: models/artifacts/fraud_model.joblib")

    # Quick sanity check
    print("\n  Sanity check — sample predictions:")
    test_cases = [
        ("Genuine worker", {
            "claim_frequency_7d": 1, "claim_amount": 200, "avg_claim_amount_peer": 220,
            "time_since_last_claim_hrs": 96, "claims_in_zone_1hr": 2, "is_in_zone": 1,
            "was_active_before_trigger": 1, "movement_speed_kmh": 18,
            "platform_session_active": 1, "device_consistency_score": 0.95, "claim_hour": 14,
        }),
        ("Individual fraudster", {
            "claim_frequency_7d": 5, "claim_amount": 600, "avg_claim_amount_peer": 200,
            "time_since_last_claim_hrs": 8, "claims_in_zone_1hr": 1, "is_in_zone": 0,
            "was_active_before_trigger": 0, "movement_speed_kmh": 0.1,
            "platform_session_active": 0, "device_consistency_score": 0.3, "claim_hour": 2,
        }),
        ("Ring fraud member", {
            "claim_frequency_7d": 3, "claim_amount": 350, "avg_claim_amount_peer": 200,
            "time_since_last_claim_hrs": 24, "claims_in_zone_1hr": 8, "is_in_zone": 1,
            "was_active_before_trigger": 1, "movement_speed_kmh": 1.0,
            "platform_session_active": 1, "device_consistency_score": 0.5, "claim_hour": 15,
        }),
    ]

    for label, tc in test_cases:
        result = model.predict(tc)
        decision_emoji = {"auto_approve": "✅", "soft_hold": "⚠️", "reject": "❌"}
        print(f"    {label}:")
        print(f"      Score: {result['anomaly_score']}/100 → {decision_emoji.get(result['decision'], '?')} {result['decision']}")
        if result['flags']:
            print(f"      Flags: {result['flags'][:2]}")
        if result['ring_alert']:
            print(f"      🚨 RING ALERT")

    return metrics


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SwiftShield ML Training Pipeline")
    parser.add_argument("--data-dir", type=str, default=None,
                        help="Directory containing premium_data.csv and fraud_data.csv")
    args = parser.parse_args()

    print("╔" + "═" * 58 + "╗")
    print("║        SwiftShield ML — Model Training Pipeline         ║")
    print("╚" + "═" * 58 + "╝")

    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    premium_metrics = train_premium_model(args.data_dir)
    fraud_metrics = train_fraud_model(args.data_dir)

    print("\n" + "=" * 60)
    print("  ALL MODELS TRAINED SUCCESSFULLY")
    print("=" * 60)
    print(f"  Premium model RMSE: ₹{premium_metrics['rmse']}")
    print(f"  Fraud model anomaly rate: {fraud_metrics['anomaly_rate']:.1%}")
    print(f"  Artifacts saved to: {ARTIFACTS_DIR}/")
    print()

    # List saved artifacts
    for f in sorted(os.listdir(ARTIFACTS_DIR)):
        if f.endswith(".joblib"):
            size = os.path.getsize(os.path.join(ARTIFACTS_DIR, f))
            print(f"    📦 {f} ({size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
