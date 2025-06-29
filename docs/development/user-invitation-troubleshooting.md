# User Invitation System Troubleshooting

## Current Issues (December 2024)

### 1. Email Verification Still Being Sent to Invited Users

**Problem**: When users register with email/password using an invitation link, they still receive email verification emails, even though they shouldn't need verification (invited users should be pre-verified).

**Expected Behavior**: 
- Google OAuth with invitation: ✅ Works correctly - no verification email, immediate login
- Email/password with invitation: ❌ Still sends verification email (should skip this)

**Root Cause**: The invitation token isn't properly flowing from frontend → NextJS API → Worker backend for email/password registration.

**Investigation Done**:
- ✅ Frontend correctly passes `invitationToken` in registration request (signin/page.tsx:233)
- ✅ NextJS API route correctly forwards `invitation_token` to worker (register/route.ts:70)
- ✅ Worker has correct logic to skip verification for invited users (index.ts:459)
- ❌ Debug logging added but no logs appear in `npx wrangler tail`

**Next Steps**:
- Use browser Network tab to trace request flow
- Verify if NextJS API is actually calling the worker
- Check if there's a development vs production routing issue

### 2. Invitation List Not Refreshing Immediately

**Problem**: After sending invitations (both single and bulk), the invitation list doesn't update immediately. Users must refresh the page to see new invitations.

**Expected Behavior**: Invitation list should update immediately after sending, like the user list does.

**Investigation Done**:
- ✅ Identified that user list refresh works correctly with simple `await loadUsers()`
- ✅ Found invitation list was using complex pattern: `setInvitations([])` + `await loadInvitations()`
- ✅ Simplified invitation refresh to match working user list pattern
- ❌ Issue affects both single and bulk invitations
- ✅ Changes committed and deployed

**Files Modified**:
- `src/components/AdminUserManager.tsx` - simplified refresh logic in:
  - `sendSingleInvitation()` (line 597)
  - `sendBulkInvitations()` (line 681) 
  - `revokeInvitation()` (line 722)

**Next Steps**:
- Test if simplified refresh approach resolves the issue

### 3. Invitation Emails Not Being Sent (New Issue)

**Problem**: Invitation emails stopped being sent entirely during testing.

**Possible Causes**:
- Resend API key or configuration issue
- Rate limiting
- Email service disruption

**Next Steps**:
- Check Resend dashboard for errors
- Verify API key is still valid
- Test email sending functionality

## Technical Context

### Request Flow for Email/Password Registration
```
Frontend (signin/page.tsx)
  ↓ POST /api/auth/register with invitationToken
NextJS API (register/route.ts) 
  ↓ POST to worker with invitation_token
Cloudflare Worker (index.ts registerUser)
  ↓ Should skip verification if invitation found
```

### Debug Logging Added
- Worker now logs: `🔧 DEBUG registerUser called - email: X, has invitation_token: true/false`
- Use `npx wrangler tail` to monitor worker logs during registration

### Key Files
- **Frontend**: `src/app/auth/signin/page.tsx` (handles registration form)
- **NextJS API**: `src/app/api/auth/register/route.ts` (middleware to worker)
- **Worker**: `workers/index.ts` (registerUser function, line 377)
- **Admin UI**: `src/components/AdminUserManager.tsx` (invitation management)

## Git Commits
- `02ac56c` - add debug logging for invitation token registration flow
- `3794917` - fix: simplify invitation list refresh to match working user list pattern
- `1ce99ff` - bump version to force frontend redeploy
- `ab01d56` - fix: resolve email verification and invitation list refresh issues

## Previous Work Context
This troubleshooting session was a continuation of previous invitation system refactoring work. The user reported that despite previous fixes, two critical issues persisted with the invitation system.