-- Add Role-Based Access Control (RBAC) support
-- Version: 1.1.0

-- 1. Create the user_role enum
CREATE TYPE user_role AS ENUM ('user', 'zonal_admin', 'control_admin');

-- 2. Add the role column to the workers table with a default value
ALTER TABLE workers 
ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- 3. Create an index for the role column to optimize lookups
CREATE INDEX idx_workers_role ON workers(role);

-- 4. Update the audit_logs table to use the new user_role if preferred (optional)
-- For now, we'll keep the user_type as VARCHAR(20) but we can note it in comments
COMMENT ON COLUMN audit_logs.user_type IS 'Type of user: user, zonal_admin, control_admin, or system';

-- 5. Seed some admin users for testing
-- We'll promote a few existing users from the seed data if they exist
-- 9111222333 -> zonal_admin
-- 9777888999 -> control_admin

UPDATE workers SET role = 'zonal_admin' WHERE phone = '9111222333';
UPDATE workers SET role = 'control_admin' WHERE phone = '9777888999';

-- If they don't exist yet, we can insert them later or provide the user with these numbers.
