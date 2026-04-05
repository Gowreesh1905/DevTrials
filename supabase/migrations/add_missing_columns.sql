-- Add name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Add name and phone to workers table if missing
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone VARCHAR(15);
