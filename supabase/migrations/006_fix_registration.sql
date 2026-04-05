-- =========================================
-- FIX REGISTRATION PERMISSIONS AND SCHEMA
-- =========================================
-- Run this in Supabase SQL Editor to fix registration issues

-- Step 1: Ensure RLS is disabled for service role access
-- (The service role key should bypass RLS, but let's be sure)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant registration permissions to anon (for unauthenticated registration)
GRANT SELECT, INSERT ON users TO anon;
GRANT SELECT, INSERT ON workers TO anon;
GRANT SELECT, INSERT ON worker_vehicles TO anon;
GRANT SELECT ON delivery_zones TO anon;

-- Step 3: Add missing columns to workers table for better data storage
-- Add upi_id column for payment info
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workers' AND column_name = 'upi_id') THEN
        ALTER TABLE workers ADD COLUMN upi_id VARCHAR(100);
    END IF;
END $$;

-- Add city column directly to workers for easier access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workers' AND column_name = 'city') THEN
        ALTER TABLE workers ADD COLUMN city VARCHAR(100);
    END IF;
END $$;

-- Add phone column to workers for quick lookup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workers' AND column_name = 'phone') THEN
        ALTER TABLE workers ADD COLUMN phone VARCHAR(15);
    END IF;
END $$;

-- Verification: Check table permissions
-- SELECT grantee, table_name, privilege_type 
-- FROM information_schema.table_privileges 
-- WHERE table_name IN ('users', 'workers', 'worker_vehicles');
