-- =========================================
-- COMPLETE FIX FOR REGISTRATION PERMISSIONS
-- =========================================
-- Run this entire file in Supabase SQL Editor

-- Step 1: Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_weekly_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE demand_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE zone_risk_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE disruption_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE disruptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE zone_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE disruption_impacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE claim_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE payout_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_risk_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant full permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verification query - run this after to confirm
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
