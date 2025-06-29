# Password Reset Feature Implementation Plan

## Overview
Add a "Forgot Password?" link to the email login screen that enables users to reset their passwords via email verification.

## Database Changes
1. **Add password reset fields to users table:**
   - `password_reset_token TEXT`
   - `password_reset_expires DATETIME`
   - Create migration script

## Backend API Endpoints (Workers)
2. **POST /api/auth/forgot-password**
   - Accept email address
   - Generate secure reset token (UUID)
   - Set 1-hour expiration
   - Send reset email via Resend
   - Return success message (don't reveal if email exists)

3. **POST /api/auth/reset-password**
   - Accept token and new password
   - Validate token and expiration
   - Hash new password
   - Update user record
   - Invalidate reset token

4. **GET /api/auth/verify-reset-token**
   - Validate reset token for reset form display

## Frontend Components
5. **Enhance sign-in page (`/src/app/auth/signin/page.tsx`)**
   - Add "Forgot Password?" link below password field
   - Show forgot password form when clicked
   - Add email input and submit button
   - Handle API responses and show success/error states

6. **Create password reset page (`/src/app/auth/reset-password/page.tsx`)**
   - Accept token via URL parameter
   - Validate token on page load
   - Show password reset form if valid
   - Include password confirmation field
   - Apply same password strength requirements
   - Handle form submission and redirect to sign-in

## Email Templates
7. **Create password reset email template**
   - Professional HTML template matching existing design
   - Clear reset link with token parameter
   - Security warnings and expiration notice
   - Contact information for issues

## Security Enhancements
8. **Improve password hashing**
   - Upgrade from SHA-256 to Web Crypto API PBKDF2
   - Increase salt complexity
   - Add password history check (prevent reuse of last password)

## UI/UX Flow
1. User clicks "Forgot Password?" on sign-in page
2. Form appears requesting email address
3. User submits email, sees success message
4. User receives email with reset link
5. User clicks link, goes to reset password page
6. User enters new password (with confirmation)
7. User submits, password is updated
8. User is redirected to sign-in with success message

## Security Considerations
- Reset tokens expire in 1 hour
- One-time use tokens (invalidated after use)
- Rate limiting on forgot password requests
- No user enumeration (same response for valid/invalid emails)
- Password strength validation on both frontend and backend
- Audit trail of password reset attempts