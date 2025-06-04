# LibaryCard Development Notes

This file contains development todos, notes, and context for AI assistants working on this project.

## Current Project Status
- ✅ Google OAuth authentication implemented
- ✅ Email/password authentication with email verification 
- ✅ Strong password validation (8+ chars, uppercase, lowercase, number, special char)
- ✅ Development mode fallbacks for testing
- ✅ Basic book management and ISBN scanning
- ✅ Location and shelf management
- ✅ Registration and login working in production
- ✅ Email verification with Resend integration
- ✅ Profile API working with proper authentication
- ✅ Database schema migration completed
- ✅ Webpack cache optimization for Cloudflare Pages

## Development Todos

### High Priority - Next Session Focus
- [ ] **User Permission System**
  - [ ] Add user_role column to users table (admin, user)
  - [ ] Set tim.arnold@gmail.com as admin user in database
  - [ ] Implement permission checks in Workers API for location/shelf operations
  - [ ] Add admin-only endpoints for location management
  - [ ] Create invitation link system for admins to invite users to locations
  - [ ] Restrict regular users to only adding books (no location/shelf creation)
  - [ ] Implement location-scoped user visibility (users only see their assigned location)

### Medium Priority - UI Improvements & Core Features
- [ ] **UI Enhancements**
  - [ ] Replace inline styles with proper SCSS modules and refactor to use SCSS for better maintainability
  - [ ] Improve responsive design for mobile devices and tablets
  - [ ] Add proper navigation header with user menu, profile link, and sign-out functionality
  - [ ] Enhance book management interface with better cards, grid layout, and action buttons
  - [ ] Add loading states and better form styling throughout the application

- [ ] **Core Functionality**
  - [ ] Add search and filtering functionality for book collections
  - [ ] Implement proper location and shelf management UI with CRUD operations
  - [ ] Complete profile editing UI with conditional fields based on auth provider

### Low Priority - Future Enhancements
- [ ] **Book Checkout System**
  - [ ] Add book status field (available, checked_out, checked_out_by, checked_out_date)
  - [ ] Allow users to mark books as "currently reading" (checkout)
  - [ ] Show book availability status in book listings
  - [ ] Add checkout history and return functionality
  - [ ] Implement checkout notifications and due date reminders

- [ ] **Other Enhancements**
  - [ ] Add book details modal/page with full information, cover image, and editing options
  - [ ] Improve ISBN scanner interface with better camera controls and feedback
  - [ ] Add profile picture upload functionality with image resizing and storage
  - [ ] Implement dark mode toggle with persistent user preference
  - [ ] Add export functionality for book collections (CSV, PDF formats)

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

### Next Priority: User Permission System
- Need to implement admin/user roles with location-based access control
- tim.arnold@gmail.com should be set as admin user
- Regular users restricted to book operations only
- Admins can manage locations and generate invitation links

---
Last updated: June 2025