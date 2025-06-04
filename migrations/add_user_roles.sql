-- Add user role system
-- This migration adds a user_role column to support admin/user permissions

-- Add user_role column to users table
ALTER TABLE users ADD COLUMN user_role TEXT DEFAULT 'user';

-- Set tim.arnold@gmail.com as admin user
UPDATE users SET user_role = 'admin' WHERE email = 'tim.arnold@gmail.com';

-- Create index for user role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role);