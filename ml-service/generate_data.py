"""
SwiftShield — Data Generation Script

Generates realistic synthetic data that mirrors the Supabase schema
AND directly produces the feature matrices needed by train.py.

Produces two outputs:
  1. DB-shaped CSVs  → data/db/  (mirrors Supabase tables)
  2. ML-ready CSVs   → data/ml/  (ready for train.py --data-dir)

Usage:
  python generate_data.py              # generate everything
  python generate_data.py --workers 200  # scale up

Then train with:
  python train.py --data-dir data/ml
"""

import os
import argparse
import uuid
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_DIR = os.path.join(OUTPUT_DIR, "db")
ML_DIR = os.path.join(OUTPUT_DIR, "ml")

# ── Zone definitions (mirror Supabase delivery_zones + ML extension) ───────

ZONES = [
    {"id": "z-andheri",     "name": "Andheri West",    "city": "Mumbai",    "city_tier": 1, "flood_12m": 6,  "heat_12m": 8,  "strike_freq": 0.05, "congestion": 0.80},
    {"id": "z-bandra",      "name": "Bandra",          "city": "Mumbai",    "city_tier": 1, "flood_12m": 4,  "heat_12m": 5,  "strike_freq": 0.03, "congestion": 0.75},
    {"id": "z-powai",       "name": "Powai",           "city": "Mumbai",    "city_tier": 1, "flood_12m": 3,  "heat_12m": 4,  "strike_freq": 0.02, "congestion": 0.60},
    {"id": "z-cp",          "name": "Connaught Place", "city": "Delhi",     "city_tier": 1, "flood_12m": 5,  "heat_12m": 12, "strike_freq": 0.10, "congestion": 0.85},
    {"id": "z-gurgaon",     "name": "Gurgaon Sec 29",  "city": "Gurgaon",   "city_tier": 1, "flood_12m": 7,  "heat_12m": 10, "strike_freq": 0.06, "congestion": 0.70},
    {"id": "z-koramangala", "name": "Koramangala",     "city": "Bengaluru", "city_tier": 1, "flood_12m": 3,  "heat_12m": 3,  "strike_freq": 0.02, "congestion": 0.65},
    {"id": "z-indiranagar", "name": "Indiranagar",     "city": "Bengaluru", "city_tier": 1, "flood_12m": 2,  "heat_12m": 2,  "strike_freq": 0.01, "congestion": 0.55},
    {"id": "z-mysuru",      "name": "Mysuru Central",  "city": "Mysuru",    "city_tier": 2, "flood_12m": 1,  "heat_12m": 1,  "strike_freq": 0.01, "congestion": 0.35},
    {"id": "z-jaipur",      "name": "Jaipur MI Road",  "city": "Jaipur",    "city_tier": 2, "flood_12m": 2,  "heat_12m": 9,  "strike_freq": 0.04, "congestion": 0.45},
    {"id": "z-lucknow",     "name": "Lucknow Hazratganj", "city": "Lucknow", "city_tier": 2, "flood_12m": 1, "heat_12m": 6,  "strike_freq": 0.03, "congestion": 0.40},
]

PLATFORMS = ["blinkit", "zepto", "instamart"]
VEHICLES  = ["bike", "scooter", "bicycle"]


def gen_uuid():
    return str(uuid.uuid4())


# ── 1. Generate Workers ────────────────────────────────────────────────────

def generate_workers(n: int, rng: np.random.RandomState) -> pd.DataFrame:
    rows = []
    for i in range(n):
        zone = ZONES[rng.randint(0, len(ZONES))]
        is_fraud_prone = rng.random() < 0.10  # ~10% are suspicious profiles

        rows.append({
            "id": gen_uuid(),
            "name": f"Worker_{i+1:03d}",
            "phone": f"9{rng.randint(100000000, 999999999)}",
            "platform": rng.choice(PLATFORMS),
            "vehicle_type": rng.choice(VEHICLES),
            "city": zone["city"],
            "assigned_zone_id": zone["id"],
            "city_tier": zone["city_tier"],
            "joined_date": (datetime.now() - timedelta(days=int(rng.randint(14, 400)))).strftime("%Y-%m-%d"),
            "fraud_score": float(rng.uniform(35, 85)) if is_fraud_prone else float(rng.uniform(0, 20)),
            "is_fraud_prone": is_fraud_prone,
            # Zone-level data (denormalized for ML convenience)
            "zone_flood_history": zone["flood_12m"],
            "zone_heat_history": zone["heat_12m"],
            "seasonal_strike_freq": zone["strike_freq"],
            "zone_congestion": zone["congestion"],
        })
    return pd.DataFrame(rows)


# ── 2. Generate Weekly Stats ───────────────────────────────────────────────

def generate_weekly_stats(df_workers: pd.DataFrame, weeks: int, rng: np.random.RandomState) -> pd.DataFrame:
    rows = []
    for _, w in df_workers.iterrows():
        for wk in range(weeks):
            week_date = (datetime.now() - timedelta(weeks=wk)).strftime("%Y-%m-%d")
            rows.append({
                "worker_id": w["id"],
                "week_start_date": week_date,
                "total_deliveries": int(rng.randint(30, 160)),
                "total_earnings": round(float(rng.uniform(2000, 8000)), 2),
                "active_hours": round(float(rng.uniform(15, 50)), 1),
                "avg_rating": round(float(rng.uniform(3.5, 5.0)), 1),
                "total_claims": int(rng.randint(0, 4)) if w["is_fraud_prone"] else int(rng.randint(0, 2)),
            })
    return pd.DataFrame(rows)


# ── 3. Generate ML-Ready Premium Training Data ────────────────────────────

def generate_premium_data(df_workers: pd.DataFrame, df_stats: pd.DataFrame, rng: np.random.RandomState) -> pd.DataFrame:
    """
    Build the feature matrix that matches PremiumModel.ALL_FEATURES.
    One row per worker-week = one premium calculation.
    """
    rows = []
    for _, w in df_workers.iterrows():
        worker_stats = df_stats[df_stats["worker_id"] == w["id"]].sort_values("week_start_date", ascending=False)
        if len(worker_stats) < 4:
            continue

        # 4-week rolling average earnings
        earnings_4wk = worker_stats.head(4)["total_earnings"].mean()

        # Claim rate for this zone (simulate from zone-level data)
        zone_workers = df_workers[df_workers["assigned_zone_id"] == w["assigned_zone_id"]]
        zone_stats = df_stats[df_stats["worker_id"].isin(zone_workers["id"])]
        total_zone_claims = zone_stats["total_claims"].sum()
        total_zone_weeks = len(zone_stats)
        claim_rate = min(total_zone_claims / max(total_zone_weeks, 1), 0.35)

        weather_risk = rng.uniform(0.05, 0.95)

        features = {
            "zone_flood_history":    w["zone_flood_history"],
            "zone_heat_history":     w["zone_heat_history"],
            "weather_forecast_risk": round(weather_risk, 3),
            "earnings_avg_4wk":      round(earnings_4wk, 0),
            "claim_rate_pincode":    round(claim_rate, 3),
            "seasonal_strike_freq":  w["seasonal_strike_freq"],
            "city_tier":             w["city_tier"],
            "vehicle_type":          w["vehicle_type"],
            "platform":              w["platform"],
        }

        # Target premium (known formula + noise for supervised training)
        vehicle_adj = {"bike": 5, "scooter": 3, "bicycle": -2}
        platform_adj = {"blinkit": 2, "zepto": 0, "instamart": 1}

        premium = (
            25
            + 8 * features["zone_flood_history"]
            + 5 * features["zone_heat_history"]
            + 20 * features["weather_forecast_risk"]
            - 0.002 * features["earnings_avg_4wk"]
            + 30 * features["claim_rate_pincode"]
            + 15 * features["seasonal_strike_freq"]
            + (10 if features["city_tier"] == 1 else 0)
            + vehicle_adj.get(features["vehicle_type"], 0)
            + platform_adj.get(features["platform"], 0)
            + rng.normal(0, 5)
        )
        features["weekly_premium"] = round(float(np.clip(premium, 20, 150)), 2)

        rows.append(features)

    return pd.DataFrame(rows)


# ── 4. Generate ML-Ready Fraud Training Data ──────────────────────────────

def generate_fraud_data(df_workers: pd.DataFrame, df_stats: pd.DataFrame, rng: np.random.RandomState) -> pd.DataFrame:
    """
    Build the feature matrix that matches FraudModel.FEATURES.
    Generates ~92% normal, ~5% individual fraud, ~3% ring fraud claims.
    """
    rows = []

    for _, w in df_workers.iterrows():
        is_fraudster = w["is_fraud_prone"]
        num_claims = rng.randint(3, 7) if is_fraudster else rng.randint(1, 3)

        worker_stats = df_stats[df_stats["worker_id"] == w["id"]]
        avg_earnings = worker_stats["total_earnings"].mean() if len(worker_stats) > 0 else 4000

        # Peer average claim amount (zone-level)
        zone_workers = df_workers[df_workers["assigned_zone_id"] == w["assigned_zone_id"]]
        peer_avg = float(rng.uniform(150, 300))

        for c in range(num_claims):
            if is_fraudster:
                is_ring = rng.random() < 0.4  # 40% of fraud claims are ring-type

                if is_ring:
                    row = {
                        "claim_frequency_7d":        int(rng.choice([2, 3, 4])),
                        "claim_amount":              round(float(rng.uniform(280, 500)), 2),
                        "avg_claim_amount_peer":     round(peer_avg, 2),
                        "time_since_last_claim_hrs": round(float(rng.uniform(10, 48)), 1),
                        "claims_in_zone_1hr":        int(rng.choice([5, 6, 7, 8, 10])),
                        "is_in_zone":                1,  # spoofed GPS
                        "was_active_before_trigger": int(rng.choice([0, 1], p=[0.3, 0.7])),
                        "movement_speed_kmh":        round(float(rng.uniform(0, 3)), 1),
                        "platform_session_active":   1,
                        "device_consistency_score":  round(float(rng.uniform(0.4, 0.8)), 2),
                        "claim_hour":                int(rng.choice(range(8, 22))),
                    }
                else:
                    row = {
                        "claim_frequency_7d":        int(rng.choice([3, 4, 5, 6])),
                        "claim_amount":              round(float(rng.uniform(350, 800)), 2),
                        "avg_claim_amount_peer":     round(peer_avg, 2),
                        "time_since_last_claim_hrs": round(float(rng.uniform(2, 40)), 1),
                        "claims_in_zone_1hr":        int(rng.choice([1, 2])),
                        "is_in_zone":                int(rng.choice([0, 1], p=[0.4, 0.6])),
                        "was_active_before_trigger": int(rng.choice([0, 1], p=[0.5, 0.5])),
                        "movement_speed_kmh":        float(rng.choice([0.0, 0.1, 150.0, 200.0])),
                        "platform_session_active":   int(rng.choice([0, 1], p=[0.3, 0.7])),
                        "device_consistency_score":  round(float(rng.uniform(0.2, 0.7)), 2),
                        "claim_hour":                int(rng.choice([0, 1, 2, 3, 4, 23])),
                    }
            else:
                row = {
                    "claim_frequency_7d":        int(rng.choice([0, 1, 1, 1, 2])),
                    "claim_amount":              round(float(rng.uniform(80, 400)), 2),
                    "avg_claim_amount_peer":     round(peer_avg, 2),
                    "time_since_last_claim_hrs": round(float(rng.uniform(48, 336)), 1),
                    "claims_in_zone_1hr":        int(rng.choice([1, 2, 3], p=[0.6, 0.3, 0.1])),
                    "is_in_zone":                1,
                    "was_active_before_trigger": 1,
                    "movement_speed_kmh":        round(float(rng.uniform(5, 40)), 1),
                    "platform_session_active":   1,
                    "device_consistency_score":  round(float(rng.uniform(0.85, 1.0)), 2),
                    "claim_hour":                int(rng.choice(range(6, 23))),
                }

            rows.append(row)

    return pd.DataFrame(rows)


# ── 5. Generate DB-Shaped CSVs ─────────────────────────────────────────────

def save_db_csvs(df_workers, df_stats):
    """Save CSVs that mirror Supabase table structure."""
    os.makedirs(DB_DIR, exist_ok=True)

    # Workers table
    db_workers = df_workers[["id", "name", "phone", "platform", "city",
                              "assigned_zone_id", "joined_date", "fraud_score"]].copy()
    db_workers.to_csv(os.path.join(DB_DIR, "workers.csv"), index=False)

    # Vehicles table
    vehicles = []
    for _, w in df_workers.iterrows():
        vehicles.append({
            "id": gen_uuid(),
            "worker_id": w["id"],
            "vehicle_type": w["vehicle_type"],
            "is_primary": True,
        })
    pd.DataFrame(vehicles).to_csv(os.path.join(DB_DIR, "worker_vehicles.csv"), index=False)

    # Weekly stats table
    db_stats = df_stats[["worker_id", "week_start_date", "total_deliveries",
                          "total_earnings", "active_hours", "avg_rating", "total_claims"]].copy()
    db_stats.to_csv(os.path.join(DB_DIR, "worker_weekly_stats.csv"), index=False)

    # Zones table
    zones_df = pd.DataFrame(ZONES)
    zones_df.to_csv(os.path.join(DB_DIR, "delivery_zones.csv"), index=False)

    print(f"  📂 DB CSVs saved to {DB_DIR}/")


def save_ml_csvs(df_premium, df_fraud):
    """Save CSVs ready for train.py --data-dir."""
    os.makedirs(ML_DIR, exist_ok=True)

    df_premium.to_csv(os.path.join(ML_DIR, "premium_data.csv"), index=False)
    df_fraud.to_csv(os.path.join(ML_DIR, "fraud_data.csv"), index=False)

    print(f"  📂 ML CSVs saved to {ML_DIR}/")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SwiftShield Data Generator")
    parser.add_argument("--workers", type=int, default=200, help="Number of workers to generate")
    parser.add_argument("--weeks", type=int, default=12, help="Weeks of history per worker")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    rng = np.random.RandomState(args.seed)

    print("╔══════════════════════════════════════════════╗")
    print("║   SwiftShield — Data Generation Pipeline     ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"  Config: {args.workers} workers, {args.weeks} weeks, seed={args.seed}")

    # Step 1: Workers
    print("\n  [1/4] Generating workers...")
    df_workers = generate_workers(args.workers, rng)
    fraud_count = df_workers["is_fraud_prone"].sum()
    print(f"    → {len(df_workers)} workers ({fraud_count} fraud-prone profiles)")

    # Step 2: Weekly stats
    print("  [2/4] Generating weekly stats...")
    df_stats = generate_weekly_stats(df_workers, args.weeks, rng)
    print(f"    → {len(df_stats)} weekly records")

    # Step 3: ML-ready premium data
    print("  [3/4] Building premium training features...")
    df_premium = generate_premium_data(df_workers, df_stats, rng)
    print(f"    → {len(df_premium)} premium samples")
    print(f"    → Premium range: ₹{df_premium['weekly_premium'].min():.0f} – ₹{df_premium['weekly_premium'].max():.0f}")

    # Step 4: ML-ready fraud data
    print("  [4/4] Building fraud training features...")
    df_fraud = generate_fraud_data(df_workers, df_stats, rng)
    fraud_claims = len(df_fraud[df_fraud["claim_frequency_7d"] >= 3])
    print(f"    → {len(df_fraud)} fraud samples ({fraud_claims} suspicious)")

    # Save outputs
    print("\n  Saving outputs...")
    save_db_csvs(df_workers, df_stats)
    save_ml_csvs(df_premium, df_fraud)

    # Verify column alignment with ML models
    print("\n  ✅ Column verification:")
    premium_expected = ["zone_flood_history", "zone_heat_history", "weather_forecast_risk",
                        "earnings_avg_4wk", "claim_rate_pincode", "seasonal_strike_freq",
                        "city_tier", "vehicle_type", "platform", "weekly_premium"]
    fraud_expected = ["claim_frequency_7d", "claim_amount", "avg_claim_amount_peer",
                      "time_since_last_claim_hrs", "claims_in_zone_1hr", "is_in_zone",
                      "was_active_before_trigger", "movement_speed_kmh", "platform_session_active",
                      "device_consistency_score", "claim_hour"]

    premium_ok = all(c in df_premium.columns for c in premium_expected)
    fraud_ok = all(c in df_fraud.columns for c in fraud_expected)

    print(f"    Premium features ({len(premium_expected)} cols): {'✅ MATCH' if premium_ok else '❌ MISMATCH'}")
    print(f"    Fraud features ({len(fraud_expected)} cols):   {'✅ MATCH' if fraud_ok else '❌ MISMATCH'}")

    if not premium_ok:
        missing = [c for c in premium_expected if c not in df_premium.columns]
        print(f"    ⚠ Missing premium columns: {missing}")
    if not fraud_ok:
        missing = [c for c in fraud_expected if c not in df_fraud.columns]
        print(f"    ⚠ Missing fraud columns: {missing}")

    print(f"\n  🎉 Done! Train with: python train.py --data-dir {ML_DIR}")


if __name__ == "__main__":
    main()
