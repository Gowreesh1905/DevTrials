-- =========================================
-- GRANT PERMISSIONS TO ANON ROLE
-- =========================================
-- This allows anonymous users to register

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables for registration
GRANT SELECT, INSERT ON users TO anon, authenticated;
GRANT SELECT, INSERT ON workers TO anon, authenticated;
GRANT SELECT, INSERT ON worker_vehicles TO anon, authenticated;
GRANT SELECT, INSERT ON admins TO anon, authenticated;

-- Grant UPDATE on users for profile updates
GRANT UPDATE ON users TO authenticated;
GRANT UPDATE ON workers TO authenticated;
GRANT UPDATE ON worker_vehicles TO authenticated;
GRANT UPDATE ON admins TO authenticated;

-- Grant permissions on delivery_zones (read-only for anon)
GRANT SELECT ON delivery_zones TO anon, authenticated;

-- Grant sequence permissions for auto-increment IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant permissions on other tables as needed
GRANT SELECT ON disruptions TO anon, authenticated;
GRANT SELECT ON demand_profiles TO anon, authenticated;
GRANT SELECT ON zone_risk_history TO anon, authenticated;
GRANT SELECT ON disruption_events TO anon, authenticated;
GRANT SELECT ON zone_status TO anon, authenticated;

-- Grant full access to authenticated users on their data tables
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON claims TO authenticated;
GRANT SELECT ON payouts TO authenticated;
GRANT SELECT ON wallet_transactions TO authenticated;
GRANT SELECT ON worker_weekly_stats TO authenticated;
GRANT SELECT ON worker_activity_logs TO authenticated;
GRANT SELECT ON income_predictions TO authenticated;
GRANT SELECT ON worker_risk_scores TO authenticated;
GRANT SELECT ON disruption_impacts TO authenticated;
GRANT SELECT ON claim_verifications TO authenticated;
GRANT SELECT ON payout_queue TO authenticated;
GRANT SELECT, INSERT ON admin_actions TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
