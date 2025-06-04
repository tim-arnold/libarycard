-- Migration to add email/password authentication columns to existing users table
-- Run this if the production database was created before these columns existed

-- Add password_hash column if it doesn't exist
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Add auth_provider column if it doesn't exist  
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';

-- Add email_verified column if it doesn't exist
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Add email_verification_token column if it doesn't exist
ALTER TABLE users ADD COLUMN email_verification_token TEXT;

-- Add email_verification_expires column if it doesn't exist
ALTER TABLE users ADD COLUMN email_verification_expires DATETIME;

-- Update existing users to be email verified (since they were created before verification)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;