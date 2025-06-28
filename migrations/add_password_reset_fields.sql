-- Migration: Add password reset fields
-- Date: June 28, 2025
-- Description: Adds password reset token and expiration fields to users table for forgot password functionality

-- Add password reset fields to users table
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME;

-- Add index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires ON users(password_reset_expires);