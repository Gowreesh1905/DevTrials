-- SwiftShield ML Service Extensions
-- Adds fields and tables required for XGBoost Premium, Isolation Forest Fraud, and Risk Scoring

-- 1. Add City Tier to Zones (for Premium Engine)
-- 1 = Metro (higher base risk), 2 = Tier-2 (lower base risk)
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS city_tier INTEGER DEFAULT 1;
COMMENT ON COLUMN delivery_zones.city_tier IS '1 = Metro, 2 = Tier-2. Used by XGBoost premium engine.';

-- 2. Trajectory Logs (for Fraud Engine: speed & teleport detection)
CREATE TABLE IF NOT EXISTS worker_location_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_location_logs_worker_time ON worker_location_logs(worker_id, recorded_at DESC);

-- 3. Detailed Risk Components (for Risk Scorer Dashboard)
-- Allows the UI to show the breakdown of why a score is high/low
ALTER TABLE worker_risk_scores 
ADD COLUMN IF NOT EXISTS weather_risk_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS traffic_risk_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS behavior_risk_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fraud_risk_score DECIMAL(5,2) DEFAULT 0;

-- 4. Historical Zone Metrics (for Premium Engine: seasonal trends)
ALTER TABLE zone_risk_history 
ADD COLUMN IF NOT EXISTS flood_count_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS heat_count_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS strike_freq_seasonal DECIMAL(3,2) DEFAULT 0;

-- 5. Seed some data for the new city_tier column
UPDATE delivery_zones SET city_tier = 1 WHERE city IN ('Mumbai', 'Delhi', 'Bengaluru');
UPDATE delivery_zones SET city_tier = 2 WHERE city NOT IN ('Mumbai', 'Delhi', 'Bengaluru');
