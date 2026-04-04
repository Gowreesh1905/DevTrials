"""
SwiftShield ML — FastAPI Service

Endpoints:
  POST /predict/premium  — Dynamic weekly premium calculation (XGBoost)
  POST /predict/fraud    — Claim fraud scoring (Isolation Forest)
  POST /predict/risk     — Weekly risk score (composite)
  GET  /health           — Health check

Usage:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from models.premium_model import PremiumModel
from models.fraud_model import FraudModel
from models.risk_model import RiskModel

# ── Global model instances ──────────────────────────────────────────────────

premium_model = PremiumModel()
fraud_model = FraudModel()
risk_model = RiskModel()


# ── Lifespan: load models on startup ────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load trained model artifacts on startup."""
    artifacts_dir = os.path.join(os.path.dirname(__file__), "models", "artifacts")

    premium_path = os.path.join(artifacts_dir, "premium_model.joblib")
    fraud_path = os.path.join(artifacts_dir, "fraud_model.joblib")

    if os.path.exists(premium_path):
        premium_model.load(premium_path)
        print("✓ Premium model loaded")
    else:
        print("⚠ Premium model artifact not found — run train.py first")

    if os.path.exists(fraud_path):
        fraud_model.load(fraud_path)
        print("✓ Fraud model loaded")
    else:
        print("⚠ Fraud model artifact not found — run train.py first")

    print("✓ Risk model ready (rule-based, no artifact needed)")
    print("🚀 SwiftShield ML service is live")

    yield  # app runs

    print("👋 SwiftShield ML service shutting down")


# ── FastAPI app ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="SwiftShield ML Service",
    description="AI-powered risk assessment, dynamic pricing, and fraud detection for Q-commerce delivery worker insurance.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ──────────────────────────────────────────────

# --- Premium ---

class PremiumRequest(BaseModel):
    zone_flood_history: int = Field(..., ge=0, description="Flood events in zone (past 12 months)")
    zone_heat_history: int = Field(..., ge=0, description="Extreme-heat days in zone (past 12 months)")
    weather_forecast_risk: float = Field(..., ge=0, le=1, description="7-day disruption probability")
    earnings_avg_4wk: float = Field(..., ge=0, description="Worker's 4-week average earnings (₹)")
    claim_rate_pincode: float = Field(..., ge=0, le=1, description="Historical claim rate for pin code")
    seasonal_strike_freq: float = Field(..., ge=0, le=1, description="Seasonal strike/curfew frequency")
    city_tier: int = Field(..., ge=1, le=2, description="1=metro, 2=tier-2")
    vehicle_type: Literal["bike", "scooter", "bicycle"]
    platform: Literal["blinkit", "zepto", "instamart"]
    previous_premium: float | None = Field(None, description="Last week's premium for delta calc")
    weeks_active: int = Field(4, ge=0, description="Weeks since worker joined (cold-start if <4)")

class PremiumResponse(BaseModel):
    weekly_premium: float
    top_3_factors: list[str]
    week_on_week_delta: float | None
    is_cold_start: bool


# --- Fraud ---

class FraudRequest(BaseModel):
    claim_frequency_7d: int = Field(..., ge=0, description="Claims in last 7 days")
    claim_amount: float = Field(..., ge=0, description="Current claim amount (₹)")
    avg_claim_amount_peer: float = Field(..., ge=0, description="Peer-group average claim (₹)")
    time_since_last_claim_hrs: float = Field(..., ge=0, description="Hours since last claim")
    claims_in_zone_1hr: int = Field(..., ge=0, description="Zone-wide claims in last hour")
    is_in_zone: bool = Field(..., description="GPS within 500m of zone boundary")
    was_active_before_trigger: bool = Field(..., description="Active ≥15 min before disruption")
    movement_speed_kmh: float = Field(..., ge=0, description="Average movement speed (km/h)")
    platform_session_active: bool = Field(..., description="Platform confirms active session")
    device_consistency_score: float = Field(..., ge=0, le=1, description="Device fingerprint consistency")
    claim_hour: int = Field(..., ge=0, le=23, description="Hour of day (0–23)")

class FraudResponse(BaseModel):
    anomaly_score: int
    decision: Literal["auto_approve", "soft_hold", "reject"]
    flags: list[str]
    ring_alert: bool
    raw_isolation_score: float


# --- Risk ---

class RiskRequest(BaseModel):
    zone_id: str = Field(..., description="Delivery zone ID")
    city: str = Field(..., description="City name")
    season: str = Field("auto", description="Season or 'auto' for current")
    weekly_deliveries: int = Field(..., ge=0)
    weekly_active_hours: float = Field(..., ge=0)
    avg_rating: float = Field(..., ge=1, le=5)
    claim_count_4wk: int = Field(..., ge=0, description="Claims in last 4 weeks")
    fraud_flags_past: int = Field(0, ge=0, description="Historical anomaly flags")
    platform: Literal["blinkit", "zepto", "instamart"]
    vehicle_type: Literal["bike", "scooter", "bicycle"]
    shift_timing: Literal["morning", "afternoon", "evening", "night"]

class RiskResponse(BaseModel):
    risk_score: int
    breakdown: dict[str, int]
    top_3_drivers: list[str]
    risk_level: Literal["low", "medium", "high"]


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "SwiftShield ML",
        "models": {
            "premium": premium_model.model is not None,
            "fraud": fraud_model.model is not None,
            "risk": True,  # rule-based, always ready
        },
    }


@app.post("/predict/premium", response_model=PremiumResponse)
async def predict_premium(req: PremiumRequest):
    """Calculate dynamic weekly premium using XGBoost model."""
    if premium_model.model is None:
        raise HTTPException(status_code=503, detail="Premium model not loaded. Run train.py first.")

    features = {
        "zone_flood_history": req.zone_flood_history,
        "zone_heat_history": req.zone_heat_history,
        "weather_forecast_risk": req.weather_forecast_risk,
        "earnings_avg_4wk": req.earnings_avg_4wk,
        "claim_rate_pincode": req.claim_rate_pincode,
        "seasonal_strike_freq": req.seasonal_strike_freq,
        "city_tier": req.city_tier,
        "vehicle_type": req.vehicle_type,
        "platform": req.platform,
    }

    result = premium_model.predict(
        features,
        previous_premium=req.previous_premium,
        weeks_active=req.weeks_active,
    )
    return PremiumResponse(**result)


@app.post("/predict/fraud", response_model=FraudResponse)
async def predict_fraud(req: FraudRequest):
    """Score a claim for fraud using Isolation Forest model."""
    if fraud_model.model is None:
        raise HTTPException(status_code=503, detail="Fraud model not loaded. Run train.py first.")

    features = {
        "claim_frequency_7d": req.claim_frequency_7d,
        "claim_amount": req.claim_amount,
        "avg_claim_amount_peer": req.avg_claim_amount_peer,
        "time_since_last_claim_hrs": req.time_since_last_claim_hrs,
        "claims_in_zone_1hr": req.claims_in_zone_1hr,
        "is_in_zone": int(req.is_in_zone),
        "was_active_before_trigger": int(req.was_active_before_trigger),
        "movement_speed_kmh": req.movement_speed_kmh,
        "platform_session_active": int(req.platform_session_active),
        "device_consistency_score": req.device_consistency_score,
        "claim_hour": req.claim_hour,
    }

    result = fraud_model.predict(features)
    return FraudResponse(**result)


@app.post("/predict/risk", response_model=RiskResponse)
async def predict_risk(req: RiskRequest):
    """Compute weekly risk score using composite model."""
    features = {
        "zone_id": req.zone_id,
        "city": req.city,
        "season": req.season,
        "weekly_deliveries": req.weekly_deliveries,
        "weekly_active_hours": req.weekly_active_hours,
        "avg_rating": req.avg_rating,
        "claim_count_4wk": req.claim_count_4wk,
        "fraud_flags_past": req.fraud_flags_past,
        "platform": req.platform,
        "vehicle_type": req.vehicle_type,
        "shift_timing": req.shift_timing,
    }

    result = risk_model.predict(features)
    return RiskResponse(**result)
