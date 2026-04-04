-- =========================================
-- TEMPORARILY DISABLE RLS FOR REGISTRATION
-- =========================================
-- Use this for testing registration flow
-- Re-enable RLS in production after proper Auth setup

-- Disable RLS on registration tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on sensitive tables
-- ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
