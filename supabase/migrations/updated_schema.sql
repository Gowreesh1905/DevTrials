-- =========================================
-- EXTENSIONS
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE user_role AS ENUM ('worker', 'zonal_admin', 'control_admin');
CREATE TYPE platform_type AS ENUM ('blinkit', 'zepto', 'instamart');
CREATE TYPE vehicle_type AS ENUM ('bike', 'scooter', 'bicycle');
CREATE TYPE claim_status AS ENUM ('approved', 'rejected');
CREATE TYPE claim_type AS ENUM ('auto', 'manual');
CREATE TYPE payment_status AS ENUM ('pending', 'success');
CREATE TYPE payout_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE trigger_type AS ENUM (
  'rainfall',
  'extreme_heat',
  'flood',
  'cold_fog',
  'civil_unrest',
  'platform_outage'
);

-- =========================================
-- USERS
-- =========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    phone VARCHAR(15) UNIQUE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- DELIVERY ZONES
-- =========================================
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    city VARCHAR(100),
    risk_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- WORKERS
-- =========================================
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(100),
    platform platform_type,

    assigned_zone_id UUID REFERENCES delivery_zones(id),

    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),

    is_logged_in BOOLEAN DEFAULT FALSE,

    fraud_score DECIMAL(5,2) DEFAULT 0,
    cooling_period_until TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- WORKER VEHICLES
-- =========================================
CREATE TABLE worker_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,

    vehicle_type vehicle_type,
    registration_number VARCHAR(20),
    is_primary BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ORDERS (ML CORE)
-- =========================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,

    zone_id UUID REFERENCES delivery_zones(id),

    timestamp TIMESTAMPTZ,
    earnings DECIMAL(10,2),

    time_slot VARCHAR(20),
    day_of_week INTEGER
);

-- =========================================
-- WORKER WEEKLY STATS
-- =========================================
CREATE TABLE worker_weekly_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,

    week_start_date DATE,
    total_earnings DECIMAL(10,2),
    active_hours DECIMAL(5,2),
    total_deliveries INTEGER
);

-- =========================================
-- DEMAND PROFILES
-- =========================================
CREATE TABLE demand_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES delivery_zones(id),

    time_slot VARCHAR(20),
    demand_score DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ZONE RISK HISTORY
-- =========================================
CREATE TABLE zone_risk_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES delivery_zones(id),

    risk_score DECIMAL(3,2),
    claim_count INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- DISRUPTION EVENTS
-- =========================================
CREATE TABLE disruption_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    zone_id UUID REFERENCES delivery_zones(id),

    raw_type VARCHAR(50),
    raw_value DECIMAL(5,2),
    threshold_exceeded BOOLEAN,

    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- DISRUPTIONS
-- =========================================
CREATE TABLE disruptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    zone_id UUID REFERENCES delivery_zones(id),

    trigger_type trigger_type,
    severity_level INTEGER,

    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,

    duration_minutes INTEGER,

    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ZONE STATUS
-- =========================================
CREATE TABLE zone_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    zone_id UUID REFERENCES delivery_zones(id),
    disruption_id UUID REFERENCES disruptions(id),

    status VARCHAR(20),

    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- DISRUPTION IMPACTS
-- =========================================
CREATE TABLE disruption_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    disruption_id UUID REFERENCES disruptions(id),
    worker_id UUID REFERENCES workers(id),

    was_active BOOLEAN,
    eligible BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- CLAIMS
-- =========================================
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    worker_id UUID REFERENCES workers(id),
    disruption_id UUID REFERENCES disruptions(id),

    claim_type claim_type,
    status claim_status,

    claim_time TIMESTAMPTZ DEFAULT NOW(),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,

    orders_before INTEGER,
    orders_during INTEGER,

    claim_hour INTEGER,

    fraud_score DECIMAL(5,2),
    reason TEXT,

    amount DECIMAL(10,2),
    payment_status payment_status,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(worker_id, disruption_id)
);

-- =========================================
-- CLAIM VERIFICATIONS
-- =========================================
CREATE TABLE claim_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID UNIQUE REFERENCES claims(id) ON DELETE CASCADE,

    gps_valid BOOLEAN,
    platform_session_valid BOOLEAN,
    ml_anomaly_score DECIMAL(5,2),

    device_integrity_valid BOOLEAN,
    movement_pattern_valid BOOLEAN,

    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- PAYOUTS
-- =========================================
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    worker_id UUID REFERENCES workers(id),
    claim_id UUID REFERENCES claims(id),

    amount DECIMAL(10,2),
    status payout_status,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- =========================================
-- PAYOUT QUEUE
-- =========================================
CREATE TABLE payout_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES claims(id),

    priority INTEGER DEFAULT 1,
    status VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- WALLET TRANSACTIONS
-- =========================================
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id),

    amount DECIMAL(10,2),
    balance_after DECIMAL(10,2),

    transaction_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- WORKER ACTIVITY LOGS
-- =========================================
CREATE TABLE worker_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id),

    is_active BOOLEAN,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- INCOME PREDICTIONS
-- =========================================
CREATE TABLE income_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id),

    predicted_hourly_income DECIMAL(10,2),
    time_slot VARCHAR(20),

    predicted_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- WORKER RISK SCORES
-- =========================================
CREATE TABLE worker_risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id),

    overall_risk_score DECIMAL(5,2),
    fraud_risk DECIMAL(5,2),
    behavior_risk DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ADMINS (IMPROVED)
-- =========================================
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    role user_role NOT NULL,
    assigned_zone_id UUID REFERENCES delivery_zones(id),

    permissions JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_admin_role
    CHECK (role IN ('zonal_admin', 'control_admin'))
);

-- =========================================
-- ADMIN ACTIONS
-- =========================================
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    admin_id UUID REFERENCES admins(id),
    action_type VARCHAR(100),

    target_id UUID,
    target_type VARCHAR(50),

    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- AUDIT LOGS
-- =========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID,
    user_type VARCHAR(20),

    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,

    old_values JSONB,
    new_values JSONB,
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);