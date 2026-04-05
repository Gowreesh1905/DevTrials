-- Migration: 005_auth_refactor.sql
-- Goal: Create a centralized 'users' table for identity and authentication.

-- 1. Ensure the user_role enum exists (from previous migration if not already)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'zonal_admin', 'control_admin');
    END IF;
END $$;

-- 2. Create the users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Populate users from existing workers
INSERT INTO users (id, name, phone, role)
SELECT id, name, phone, COALESCE(role::user_role, 'user'::user_role)
FROM workers
ON CONFLICT (phone) DO NOTHING;

-- 4. Refactor workers table to link to users
-- Note: id in workers is currently independent. We'll add user_id.
-- Since we copied IDs above, current workers.id matches users.id.
-- We'll add a foreign key constraint to formalize it.

ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Update existing workers with user_id
UPDATE workers SET user_id = id WHERE user_id IS NULL;

-- Make user_id NOT NULL and UNIQUE for delivery partners
ALTER TABLE workers 
ALTER COLUMN user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);

-- 5. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() IN (SELECT auth_user_id FROM workers WHERE user_id = users.id));

-- 6. Add Audit Log Support for Users
COMMENT ON COLUMN audit_logs.user_id IS 'References users.id or workers.id';

-- 7. Verification function updated (optional but good practice)
-- (We'll update our TypeScript APIs to use 'users' table directly)
