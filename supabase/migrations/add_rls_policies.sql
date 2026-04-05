-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow public user registration" ON users;
DROP POLICY IF EXISTS "Allow public user read" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Allow read delivery zones" ON delivery_zones;
DROP POLICY IF EXISTS "Admins can modify delivery zones" ON delivery_zones;
DROP POLICY IF EXISTS "Allow worker registration" ON workers;
DROP POLICY IF EXISTS "Allow public worker read" ON workers;
DROP POLICY IF EXISTS "Workers can update own data" ON workers;
DROP POLICY IF EXISTS "Allow vehicle registration" ON worker_vehicles;
DROP POLICY IF EXISTS "Workers can read own vehicles" ON worker_vehicles;
DROP POLICY IF EXISTS "Workers can update own vehicles" ON worker_vehicles;
DROP POLICY IF EXISTS "Workers can insert own orders" ON orders;
DROP POLICY IF EXISTS "Workers can read own orders" ON orders;
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
DROP POLICY IF EXISTS "Workers can create claims" ON claims;
DROP POLICY IF EXISTS "Workers can read own claims" ON claims;
DROP POLICY IF EXISTS "Admins can read all claims" ON claims;
DROP POLICY IF EXISTS "Admins can update claims" ON claims;
DROP POLICY IF EXISTS "Allow read disruptions" ON disruptions;
DROP POLICY IF EXISTS "Admins can modify disruptions" ON disruptions;
DROP POLICY IF EXISTS "Allow admin registration" ON admins;
DROP POLICY IF EXISTS "Allow public admin read" ON admins;
DROP POLICY IF EXISTS "Admins can update own data" ON admins;
DROP POLICY IF EXISTS "Workers can read own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow transaction inserts" ON wallet_transactions;
DROP POLICY IF EXISTS "Workers can read own payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can read all payouts" ON payouts;
DROP POLICY IF EXISTS "Workers can read own stats" ON worker_weekly_stats;
DROP POLICY IF EXISTS "Workers can read own activity" ON worker_activity_logs;
DROP POLICY IF EXISTS "Workers can read own predictions" ON income_predictions;
DROP POLICY IF EXISTS "Workers can read own risk scores" ON worker_risk_scores;
DROP POLICY IF EXISTS "Allow read demand profiles" ON demand_profiles;
DROP POLICY IF EXISTS "Allow read zone risk history" ON zone_risk_history;
DROP POLICY IF EXISTS "Allow read disruption events" ON disruption_events;
DROP POLICY IF EXISTS "Allow read zone status" ON zone_status;
DROP POLICY IF EXISTS "Workers can read own impacts" ON disruption_impacts;
DROP POLICY IF EXISTS "Workers can read own claim verifications" ON claim_verifications;
DROP POLICY IF EXISTS "Admins can read payout queue" ON payout_queue;
DROP POLICY IF EXISTS "Admins can read admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can create admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow insert audit logs" ON audit_logs;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_weekly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_risk_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE disruption_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE disruption_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USERS TABLE POLICIES
-- =========================================

-- Allow anyone to register (INSERT) - completely open for sign-up
CREATE POLICY "Allow public user registration"
ON users FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to read users (for login/auth checks)
CREATE POLICY "Allow public user read"
ON users FOR SELECT
TO anon, authenticated
USING (true);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid()::uuid)
WITH CHECK (id = auth.uid()::uuid);

-- =========================================
-- DELIVERY ZONES POLICIES
-- =========================================

-- Allow anyone to read delivery zones
CREATE POLICY "Allow read delivery zones"
ON delivery_zones FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can modify delivery zones
CREATE POLICY "Admins can modify delivery zones"
ON delivery_zones FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- =========================================
-- WORKERS TABLE POLICIES
-- =========================================

-- Allow worker registration (INSERT) - completely open for sign-up
CREATE POLICY "Allow worker registration"
ON workers FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public read for workers (for dashboards, maps, etc.)
CREATE POLICY "Allow public worker read"
ON workers FOR SELECT
TO anon, authenticated
USING (true);

-- Workers can update their own data
CREATE POLICY "Workers can update own data"
ON workers FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::uuid)
WITH CHECK (user_id = auth.uid()::uuid);

-- =========================================
-- WORKER VEHICLES POLICIES
-- =========================================

-- Allow vehicle registration
CREATE POLICY "Allow vehicle registration"
ON worker_vehicles FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Workers can read their own vehicles
CREATE POLICY "Workers can read own vehicles"
ON worker_vehicles FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Workers can update their own vehicles
CREATE POLICY "Workers can update own vehicles"
ON worker_vehicles FOR UPDATE
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- =========================================
-- ORDERS POLICIES
-- =========================================

-- Workers can insert their own orders
CREATE POLICY "Workers can insert own orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Workers can read their own orders
CREATE POLICY "Workers can read own orders"
ON orders FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Admins can read all orders
CREATE POLICY "Admins can read all orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- =========================================
-- CLAIMS POLICIES
-- =========================================

-- Workers can create claims
CREATE POLICY "Workers can create claims"
ON claims FOR INSERT
TO authenticated
WITH CHECK (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Workers can read their own claims
CREATE POLICY "Workers can read own claims"
ON claims FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Admins can read all claims
CREATE POLICY "Admins can read all claims"
ON claims FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- Admins can update claims (approve/reject)
CREATE POLICY "Admins can update claims"
ON claims FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- =========================================
-- DISRUPTIONS POLICIES
-- =========================================

-- Allow anyone to read disruptions
CREATE POLICY "Allow read disruptions"
ON disruptions FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can create/modify disruptions
CREATE POLICY "Admins can modify disruptions"
ON disruptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- =========================================
-- ADMINS TABLE POLICIES
-- =========================================

-- Allow admin registration - completely open for sign-up
CREATE POLICY "Allow admin registration"
ON admins FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public read for admins
CREATE POLICY "Allow public admin read"
ON admins FOR SELECT
TO anon, authenticated
USING (true);

-- Admins can update their own data
CREATE POLICY "Admins can update own data"
ON admins FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::uuid)
WITH CHECK (user_id = auth.uid()::uuid);

-- =========================================
-- WALLET TRANSACTIONS POLICIES
-- =========================================

-- Workers can read their own transactions
CREATE POLICY "Workers can read own transactions"
ON wallet_transactions FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- System can insert transactions (for payouts)
CREATE POLICY "Allow transaction inserts"
ON wallet_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- =========================================
-- PAYOUTS POLICIES
-- =========================================

-- Workers can read their own payouts
CREATE POLICY "Workers can read own payouts"
ON payouts FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Admins can read all payouts
CREATE POLICY "Admins can read all payouts"
ON payouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- =========================================
-- REMAINING TABLES - READ POLICIES
-- =========================================

-- Worker weekly stats
CREATE POLICY "Workers can read own stats"
ON worker_weekly_stats FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Worker activity logs
CREATE POLICY "Workers can read own activity"
ON worker_activity_logs FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Income predictions
CREATE POLICY "Workers can read own predictions"
ON income_predictions FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Worker risk scores
CREATE POLICY "Workers can read own risk scores"
ON worker_risk_scores FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Demand profiles - public read
CREATE POLICY "Allow read demand profiles"
ON demand_profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Zone risk history - public read
CREATE POLICY "Allow read zone risk history"
ON zone_risk_history FOR SELECT
TO anon, authenticated
USING (true);

-- Disruption events - public read
CREATE POLICY "Allow read disruption events"
ON disruption_events FOR SELECT
TO anon, authenticated
USING (true);

-- Zone status - public read
CREATE POLICY "Allow read zone status"
ON zone_status FOR SELECT
TO anon, authenticated
USING (true);

-- Disruption impacts
CREATE POLICY "Workers can read own impacts"
ON disruption_impacts FOR SELECT
TO authenticated
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()::uuid
  )
);

-- Claim verifications
CREATE POLICY "Workers can read own claim verifications"
ON claim_verifications FOR SELECT
TO authenticated
USING (
  claim_id IN (
    SELECT id FROM claims
    WHERE worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()::uuid
    )
  )
);

-- Payout queue
CREATE POLICY "Admins can read payout queue"
ON payout_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

-- Admin actions
CREATE POLICY "Admins can read admin actions"
ON admin_actions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

CREATE POLICY "Admins can create admin actions"
ON admin_actions FOR INSERT
TO authenticated
WITH CHECK (
  admin_id IN (
    SELECT id FROM admins WHERE user_id = auth.uid()::uuid
  )
);

-- Audit logs
CREATE POLICY "Admins can read audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()::uuid
  )
);

CREATE POLICY "Allow insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
