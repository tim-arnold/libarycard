# LibaryCard Development Notes

This file contains development todos, notes, and context for AI assistants working on this project.

## Current Project Status
- ✅ Google OAuth authentication implemented
- ✅ Email/password authentication with email verification 
- ✅ Strong password validation (8+ chars, uppercase, lowercase, number, special char)
- ✅ Development mode fallbacks for testing
- ✅ Basic book management and ISBN scanning
- ✅ Location and shelf management with complete CRUD operations
- ✅ Registration and login working in production
- ✅ Email verification with Resend integration
- ✅ Profile API working with proper authentication
- ✅ Database schema migration completed
- ✅ Webpack cache optimization for Cloudflare Pages
- ✅ Next.js API routes properly forwarding to Workers API
- ✅ Book relocation between shelves functionality
- ✅ **Complete user permission system with role-based access control**
- ✅ Admin/user role indicators in UI header
- ✅ Location and shelf management restricted to admin users only
- ✅ Role-based UI button visibility
- ✅ **Complete invitation system with email notifications**
- ✅ **Location-scoped user visibility with admin cleanup functionality**
- ✅ **Invitation revocation system for admin users**
- ✅ **Complete email verification and invitation flow with proper UX**
- ✅ **User location management with leave functionality and modal-based UI**

## Development Todos

### High Priority - Next Session Focus
- [x] ~~**User Permission System**~~ ✅ **COMPLETED**
  - [x] ~~Add user_role column to users table (admin, user)~~ ✅ COMPLETED
  - [x] ~~Set tim.arnold@gmail.com as admin user in database~~ ✅ COMPLETED  
  - [x] ~~Implement permission checks in Workers API for location/shelf operations~~ ✅ COMPLETED
  - [x] ~~Add admin-only endpoints for location management~~ ✅ COMPLETED
  - [x] ~~Restrict regular users to only adding books (no location/shelf creation)~~ ✅ COMPLETED
  - [x] ~~Add role-based UI restrictions and indicators~~ ✅ COMPLETED
  - [x] ~~Create invitation link system for admins to invite users to locations~~ ✅ COMPLETED
  - [x] ~~Implement location-scoped user visibility (users only see their assigned location)~~ ✅ COMPLETED

### Medium Priority - UI Improvements & Core Features
- [x] ~~**Email Configuration**~~ ✅ **COMPLETED**
  - [x] ~~Verify custom domain in Resend (https://resend.com/domains) for production email sending~~ ✅ COMPLETED
  - [x] ~~Update FROM_EMAIL in wrangler.toml to use verified domain (e.g., noreply@yourdomain.com)~~ ✅ COMPLETED  
  - [x] ~~Currently using libary@tim52.io as verified domain email address~~ ✅ COMPLETED

- [ ] **UI Enhancements**
  - [ ] Replace inline styles with proper SCSS modules and refactor to use SCSS for better maintainability
  - [ ] Improve responsive design for mobile devices and tablets
  - [ ] Add proper navigation header with user menu, profile link, and sign-out functionality
  - [ ] Enhance book management interface with better cards, grid layout, list view, and action buttons
  - [ ] Add loading states and better form styling throughout the application
  - [x] ~~Replace system alerts with Bootstrap modal system for consistent UI~~ ✅ COMPLETED (profile page)
  - [x] ~~Create reusable modal components for confirmations, alerts, and forms~~ ✅ COMPLETED
  - [ ] Add confirmation dialogs for remaining admin actions (book removal, shelf deletion, etc.)
  - [ ] Show different book action menus based on user role (admin vs regular user)
  - [ ] Extend modal system to book management and admin actions throughout the application

- [ ] **Core Functionality**
  - [ ] Add search and filtering functionality for book collections
  - [x] ~~Implement proper location and shelf management UI with CRUD operations~~ ✅ COMPLETED
  - [ ] Complete profile editing UI with conditional fields based on auth provider
  - [ ] Enhancement to admin view ("My Libary" should be "Libraries" and books should be listed by location)
  - [ ] Regular users viewing a library with only one shelf should not be prompted to select a shelf when scanning a book, or see the "Shelf:" select list when viewing books in their library
  - [ ] Auto-select the only available shelf when adding books to single-shelf libraries
  - [ ] Hide location selection for users with access to only one location
  - [ ] Implement contextual help text that changes based on user role and available options

- [ ] **Book Checkout System**
  - [ ] Regular users should not be able to "Remove" books. They can "Request Removal" and should be prompted for a reason (lost, missing, other)
  - [ ] Implement "Request Removal" workflow with admin approval system
  - [ ] Add admin notification system for user requests (removal requests, etc.)
  - [ ] Add book status field (available, checked_out, checked_out_by, checked_out_date)
  - [ ] Allow users to mark books as "currently reading" (checkout)
  - [ ] Show book availability status in book listings
  - [ ] Add checkout history and return functionality
  - [ ] Implement checkout notifications and due date reminders

### Low Priority - Future Enhancements

- [ ] **Admin Dashboard & Analytics**
  - [ ] Create separate admin dashboard with location overview, user management, and pending requests
  - [ ] Add bulk actions for admin users (bulk book approval, multi-user invitations, etc.)
  - [ ] Implement admin analytics (books per location, user activity, etc.)

- [ ] **Other Enhancements**
  - [ ] Add book details modal/page with full information, cover image, and editing options
  - [ ] Improve ISBN scanner interface with better camera controls and feedback
  - [ ] Add profile picture upload functionality with image resizing and storage
  - [ ] Implement dark mode toggle with persistent user preference
  - [ ] Add export functionality for book collections (CSV, PDF formats)
  - [ ] Add support for multiple locations for regular users

## Technical Architecture

### Authentication
- NextAuth.js with Google OAuth and credentials providers
- Workers API backend with password hashing using Web Crypto API
- Email verification system (simulated in development)
- Session management with conditional features based on auth provider

### Database Schema
- Users table supports multiple auth providers
- Books, locations, shelves with proper relationships
- Email verification tokens and expiration handling

### Development Environment
- Local development uses mock authentication for testing
- Workers API for production authentication and data storage
- Strong password validation on both frontend and backend

## Environment Setup Notes
- Development mode simulates email verification
- Users can test registration and immediate sign-in
- Production points to Cloudflare Workers API

## Recent Changes
- Added comprehensive email/password authentication
- Implemented strong password validation
- Created development mode testing workflow
- Fixed Suspense boundary issues with Next.js
- Enhanced sign-in UI with proper form states and error handling

### Session June 2025 Fixes
- **FIXED**: "Unauthorized" registration errors by moving authentication check after public endpoints
- **FIXED**: Database schema missing columns by running migration to add auth fields
- **FIXED**: Webpack cache size issues for Cloudflare Pages deployment (34.7MB → optimized)
- **FIXED**: Profile API 500 errors by implementing email-to-user-ID lookup in Workers API
- **IMPLEMENTED**: Production email verification with Resend integration
- **DEPLOYED**: All fixes to production - registration, login, and email verification now working
- **OPTIMIZED**: Environment configuration for Netlify production deployment
- **COMPLETED**: Full location and shelf CRUD operations with book relocation
- **FIXED**: Next.js API routes (replaced 501 placeholders with proper Workers API calls)
- **UPDATED**: Database schema with updated_at columns for locations and shelves
- **IMPLEMENTED**: Complete user permission system with role-based access control
- **DEPLOYED**: Admin/user role restrictions for all location and shelf operations
- **ADDED**: Visual role indicators in UI header (a) for admin, (u) for user
- **UPDATED**: UI to hide admin-only buttons for regular users
- **IMPLEMENTED**: Complete invitation system with email notifications using Resend
- **ADDED**: Admin invitation management UI with status tracking and email templates
- **ENHANCED**: Sign-in flow to support invitation acceptance for new and existing users
- **COMPLETED**: Location-scoped user visibility with dynamic shelf tiles and role-based UI
- **IMPLEMENTED**: Admin user cleanup functionality with cascading deletes
- **UPDATED**: BookLibrary component to use real shelf data instead of hardcoded locations
- **ENHANCED**: UI navigation to hide admin features from regular users
- **IMPLEMENTED**: User location management with leave functionality in profile page
- **ADDED**: POST `/api/locations/{id}/leave` endpoint with validation and data cleanup
- **ENHANCED**: Profile page with location listing, leave buttons, and informative messaging
- **REPLACED**: Browser confirm() dialogs with custom modal system for better UX
- **COMPLETED**: Modal-based confirmation and success/error feedback for leave location flow

### Session January 2025 - Invitation System Enhancements & Production URL Migration
- **FIXED**: Email invitation delivery issues by configuring Resend with verified domain (tim52.io)
- **UPDATED**: FROM_EMAIL to use librarian@tim52.io for production email sending
- **RESOLVED**: Double slash URL issue in invitation emails by fixing URL concatenation
- **ENHANCED**: Invitation flow to pre-populate email addresses for better UX
- **FIXED**: Email validation to properly support '+' characters in email addresses
- **IMPLEMENTED**: Admin invitation revocation system with confirmation dialogs
- **ADDED**: DELETE `/api/invitations/{id}/revoke` endpoint for admin users
- **UPDATED**: Invitation UI to show revoke buttons only for pending invitations
- **ENHANCED**: Error handling for invitation acceptance with new user registration
- **MIGRATED**: Production URLs to new domain - App: https://libarycard.tim52.io, API: https://api.libarycard.tim52.io
- **UPDATED**: All frontend components and documentation to use new production URLs

### Session June 2025 - Email Verification & Invitation Flow Completion
- **DIAGNOSED**: Email verification flow issues causing "Invalid email or password" errors after invitation acceptance
- **FIXED**: Development mode bypass preventing proper email verification flow testing
- **CORRECTED**: Workers API deployment to use production environment with proper environment variables
- **RESOLVED**: Missing `requires_verification: true` flag in registration API responses
- **ENHANCED**: Frontend to properly handle email verification requirements and hide sign-in buttons during verification
- **IMPLEMENTED**: Invitation context preservation through email verification process
- **OPTIMIZED**: Verification email URLs to use proper API route structure
- **IMPROVED**: User experience by hiding Google OAuth and email sign-in buttons when verification is required
- **COMPLETED**: End-to-end invitation acceptance flow with seamless email verification
- **VERIFIED**: Full invitation workflow now functioning: Accept invite → Create account → Verify email → Sign in → Auto-accept invitation → Access granted

### Session December 2024 - Permission System Implementation
- **COMPLETED**: Added user_role column to database schema with migration
- **DEPLOYED**: Database migration to production (tim.arnold@gmail.com set as admin)
- **IMPLEMENTED**: Admin-only restrictions for location/shelf create, update, delete operations
- **UPDATED**: Workers API with comprehensive permission checking system
- **ENHANCED**: UI with role-based button visibility and user messaging
- **TESTED**: Permission system working correctly in production
- **REMOVED**: Redundant Next.js API routes (now using Workers API directly)

### Next Priority: UI/UX Improvements
- Replace inline styles with proper SCSS modules for better maintainability
- Improve responsive design for mobile devices and tablets
- Enhance book management interface with better cards and grid layout
- Add search and filtering functionality for book collections
- Implement dark mode toggle with persistent user preference

---
Last updated: June 2025