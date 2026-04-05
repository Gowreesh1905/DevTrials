-- =========================================
-- VERIFICATION SCRIPT
-- =========================================
-- Run this in Supabase SQL Editor to check current state

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'workers', 'worker_vehicles', 'admins')
ORDER BY tablename;

-- Expected: All should show rowsecurity = false

-- 2. Check table structure for users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Expected: Should show columns: id, name, phone, role, created_at

-- 3. Check permissions for anon role
SELECT 
    grantee, 
    table_name, 
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name = 'users'
AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- Expected: Should show INSERT, SELECT, UPDATE for both anon and authenticated

-- 4. Try inserting a test record (will fail if permissions are wrong)
INSERT INTO users (name, phone, role) 
VALUES ('Test User', '9999999999', 'worker')
RETURNING *;

-- If this works, delete it:
-- DELETE FROM users WHERE phone = '9999999999';
