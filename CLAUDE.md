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
- ✅ **Complete modal system integration across all components (Option A)**
- ✅ **Single-shelf UX improvements for streamlined user experience (Option B)**
- ✅ **Role-based book actions with admin/user permission separation (Option C)**
- ✅ **Complete book removal request system with admin approval workflow**
- ✅ **Cancel removal request functionality with dynamic button states**
- ✅ **Admin location switcher to reduce visual clutter with many books**
- ✅ **Complete Material UI conversion for modern design system**
- ✅ **Deep Purple color palette implementation**
- ✅ **Complete book checkout system with status tracking and history**
- ✅ **Enhanced ISBN scanner with camera controls and Google Books API search integration**
- ✅ **AddBooks component with persistent shelf selection and duplicate detection**

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

- [x] ~~**Book Removal Request System**~~ ✅ **COMPLETED**
  - [x] ~~Create database schema for book_removal_requests table~~ ✅ COMPLETED
  - [x] ~~Implement backend API endpoints for removal request workflow~~ ✅ COMPLETED
  - [x] ~~Update BookLibrary component to submit real removal requests~~ ✅ COMPLETED
  - [x] ~~Add reason selection modal with predefined categories (lost, damaged, missing, other)~~ ✅ COMPLETED
  - [x] ~~Implement comprehensive error handling and user feedback~~ ✅ COMPLETED
  - [x] ~~Create admin interface for managing removal requests~~ ✅ COMPLETED

### Medium Priority - UI Improvements & Core Features
- [x] ~~**Email Configuration**~~ ✅ **COMPLETED**
  - [x] ~~Verify custom domain in Resend (https://resend.com/domains) for production email sending~~ ✅ COMPLETED
  - [x] ~~Update FROM_EMAIL in wrangler.toml to use verified domain (e.g., noreply@yourdomain.com)~~ ✅ COMPLETED  
  - [x] ~~Currently using libary@tim52.io as verified domain email address~~ ✅ COMPLETED

- [x] ~~**UI Enhancements**~~ ✅ **COMPLETED**
  - [x] ~~Replace inline styles with proper SCSS modules and refactor to use SCSS for better maintainability~~ ✅ COMPLETED (Material UI)
  - [x] ~~Improve responsive design for mobile devices and tablets~~ ✅ COMPLETED (Material UI responsive system)
  - [x] ~~Add proper navigation header with user menu, profile link, and sign-out functionality~~ ✅ COMPLETED (Material UI AppBar)
  - [x] ~~Enhance book management interface with better cards, grid layout, list view, and action buttons~~ ✅ COMPLETED (Material UI Cards)
  - [x] ~~Add loading states and better form styling throughout the application~~ ✅ COMPLETED (Material UI components)
  - [x] ~~Replace system alerts with Bootstrap modal system for consistent UI~~ ✅ COMPLETED (all components)
  - [x] ~~Create reusable modal components for confirmations, alerts, and forms~~ ✅ COMPLETED
  - [x] ~~Extend modal system to book management and admin actions throughout the application~~ ✅ COMPLETED
  - [x] ~~Show different book action menus based on user role (admin vs regular user)~~ ✅ COMPLETED
  - [x] ~~Implement role-based book actions (admin: remove, user: request removal)~~ ✅ COMPLETED

- [ ] **Core Functionality**
  - [x] ~~Add search and filtering functionality for book collections~~ ✅ COMPLETED
  - [x] ~~Implement proper location and shelf management UI with CRUD operations~~ ✅ COMPLETED
  - [x] ~~Complete profile editing UI with conditional fields based on auth provider~~ ✅ COMPLETED
  - [x] ~~Enhancement to admin view ("My Libary" should be "Libraries" and books should be listed by location)~~ ✅ COMPLETED
  - [x] ~~Regular users viewing a library with only one shelf should not be prompted to select a shelf when scanning a book, or see the "Shelf:" select list when viewing books in their library~~ ✅ COMPLETED
  - [x] ~~Auto-select the only available shelf when adding books to single-shelf libraries~~ ✅ COMPLETED
  - [x] ~~Hide location selection for users with access to only one location~~ ✅ COMPLETED
  - [x] ~~Implement contextual help text that changes based on user role and available options~~ ✅ COMPLETED

- [x] ~~**Book Checkout System**~~ ✅ **COMPLETED**
  - [x] ~~Regular users should not be able to "Remove" books. They can "Request Removal" and should be prompted for a reason (lost, missing, other)~~ ✅ COMPLETED
  - [x] ~~Implement "Request Removal" workflow with admin approval system and database storage~~ ✅ COMPLETED
  - [x] ~~Add book status field (available, checked_out, checked_out_by, checked_out_date)~~ ✅ COMPLETED
  - [x] ~~Allow users to mark books as "currently reading" (checkout)~~ ✅ COMPLETED
  - [x] ~~Show book availability status in book listings~~ ✅ COMPLETED
  - [x] ~~Add checkout history and return functionality~~ ✅ COMPLETED
  - [ ] Add admin notification system for user requests (removal requests, etc.)
  - [ ] Implement checkout notifications and due date reminders

### Low Priority - Future Enhancements

- [ ] **Admin Dashboard & Analytics**
  - [ ] Create separate admin dashboard with location overview, user management, and pending requests
  - [ ] Add bulk actions for admin users (bulk book approval, multi-user invitations, etc.)
  - [ ] Implement admin analytics (books per location, user activity, etc.)

- [ ] **Other Enhancements**
  - [x] ~~When entering ISBN manually on a phone, device should use the numeric keyboard rather than QUERTY~~ ✅ COMPLETED
  - [ ] Add star rating system, just display average rating for each book from scoped to the location
  - [x] ~~Add book details modal/page with full information, cover image, and editing options~~ ✅ COMPLETED
  - [x] ~~Improve ISBN scanner interface with better camera controls and feedback~~ ✅ COMPLETED
  - [ ] Add profile picture upload functionality with image resizing and storage
  - [ ] Implement dark mode toggle with persistent user preference
  - [x] ~~Add export functionality for book collections (CSV, PDF formats)~~ ✅ COMPLETED (Export Library button removed)
  - [ ] If an admin moves a book from a shelf in Location A to a shelf in Location B, that book should no longer be visible to users in Location A.
  - [ ] Add support for multiple locations for regular users
  - [x] ~~Remove "Export Library" button~~ ✅ COMPLETED

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

### Session June 2025 - Book Removal Request System Implementation
- **CREATED**: Database schema for book_removal_requests table with proper foreign key relationships
- **IMPLEMENTED**: Complete backend API with 4 endpoints: create, get, approve, deny removal requests
- **ADDED**: Role-based access control (users create requests, admins approve/deny)
- **ENHANCED**: BookLibrary component with real API integration instead of mock success messages
- **CREATED**: Custom reason selection modal with predefined categories (lost, damaged, missing, other)
- **IMPLEMENTED**: Two-step user flow: reason selection → confirmation → API submission
- **ADDED**: Comprehensive error handling with meaningful user feedback
- **INCLUDED**: Optional details field for users to provide additional context
- **DESIGNED**: Audit trail with requester, reviewer, timestamps, and status tracking
- **PREVENTED**: Duplicate requests for the same book with validation checks
- **COMPLETED**: Full admin interface for managing removal requests with filtering and actions
- **CREATED**: RemovalRequestManager component with tabbed filtering (pending, approved, denied, all)
- **IMPLEMENTED**: Admin approve/deny actions with confirmation dialogs and optional comments
- **ADDED**: Comprehensive request details display with requester info, timestamps, and status badges
- **INTEGRATED**: New "Removal Requests" tab in admin navigation for centralized request management
- **ENHANCED**: Visual status indicators and contextual information for each request
- **INCLUDED**: Automatic list refresh after admin actions and proper error handling
- **ENHANCED**: Cancel removal request functionality with dynamic button states and real-time UI updates

### Session June 2025 - Admin Location Switcher Implementation
- **IMPLEMENTED**: Admin location switcher to address scalability concerns with many books across multiple locations
- **REPLACED**: Grouped location display (showing all locations simultaneously) with location filter dropdown for admin users
- **ADDED**: Conditional display logic: grouped view when "All locations" selected, flat filtered view when specific location selected
- **ENHANCED**: Shelf dropdown filtering to show only shelves from selected location when location filter is active
- **IMPROVED**: Admin user experience with hierarchical filtering (location → shelf → category) for better book organization
- **OPTIMIZED**: Visual layout to reduce clutter when admin users have many books across multiple locations
- **MAINTAINED**: Existing functionality for regular users while adding admin-specific location switching capabilities

### Session June 2025 - Cancel Removal Request Enhancement
- **IMPLEMENTED**: Complete cancel removal request functionality with dynamic button states
- **ADDED**: `cancelRemovalRequest` function with confirmation modal and API integration
- **ENHANCED**: Button logic to show "Cancel Removal Request" (gray) vs "Request Removal" (orange) based on pending status
- **UPDATED**: Real-time state synchronization between request submission and cancellation
- **UTILIZED**: Existing DELETE `/api/book-removal-requests/{id}` endpoint from Workers API
- **IMPROVED**: User experience with immediate UI feedback and automatic state updates
- **ENSURED**: Pending requests are tracked and updated in real-time without page refresh
- **VALIDATED**: Admin view automatically updates when users cancel their requests

### Session June 2025 - Smart UI & UX Improvements (Options A, B & C)
- **COMPLETED**: Option A - Modal System Extension across all components (ISBNScanner, BookLibrary, LocationManager, Profile)
- **REPLACED**: All browser alerts and inline error/success messages with custom modal dialogs
- **ENHANCED**: User feedback consistency with AlertModal and ConfirmationModal components
- **IMPLEMENTED**: Option B - Single-Shelf UX improvements for streamlined experience
- **HIDDEN**: Shelf concept entirely from single-shelf users in ISBN scanner interface
- **SIMPLIFIED**: Button text from "Save to Library" to "Add to Library" for single-shelf users
- **AUTOMATED**: Shelf persistence after successful book saves for continuous scanning workflow
- **OPTIMIZED**: User experience to scale from simple single-shelf to complex multi-shelf scenarios
- **COMPLETED**: Option C - Role-Based Book Actions with permission separation
- **IMPLEMENTED**: Admin users get "Remove" button (red) for permanent deletion
- **ADDED**: Regular users get "Request Removal" button (orange) for admin approval workflow
- **ENHANCED**: Role-based contextual help text explaining available actions
- **IMPROVED**: Header display with proper first name and admin icon (🔧) instead of text indicators
- **REMOVED**: "(u)" indicator for regular users, kept wrench icon for admins only

### Session June 2025 - Invitation System Enhancements & Production URL Migration
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

### Session June 2025 - Material UI Design System Implementation
- **CONVERTED**: All components and pages from legacy CSS to Material UI components
- **REPLACED**: Legacy CSS classes (.btn, .card, inline styles) with Material UI design system
- **IMPLEMENTED**: Comprehensive Material UI theme in `src/lib/theme.ts` with consistent colors, typography, and spacing
- **ENHANCED**: Navigation with Material UI AppBar, Toolbar, and Tabs with proper icons
- **UPGRADED**: All forms to use Material UI TextField, Button, and form components
- **ADDED**: Material UI icons throughout (Google, Email, Person, Location, QrCodeScanner, etc.)
- **CONVERTED**: Loading states to use Material UI CircularProgress components
- **IMPLEMENTED**: Material UI Alert system for consistent error/success messaging
- **ESTABLISHED**: Responsive design foundation with Material UI Container, Paper, and Box layout
- **IMPROVED**: Accessibility through Material UI's built-in accessibility features
- **CREATED**: Professional, cohesive design language across all UI components
- **COMPONENTS CONVERTED**: BookLibrary, ISBNScanner, RemovalRequestManager, LocationManager
- **PAGES CONVERTED**: Main home page, Profile page, Sign-in/Register page
- **ELIMINATED**: All legacy CSS dependencies in favor of Material UI styling system
- **UPDATED**: Theme to use Deep Purple color palette (#673ab7) for sophisticated library aesthetic

### Session June 2025 - Book Checkout System Implementation
- **CREATED**: Database schema for book checkout with status, checked_out_by, checked_out_date, and due_date fields
- **IMPLEMENTED**: Complete checkout/checkin API endpoints with proper permission checking
- **ADDED**: Checkout/Return buttons in BookLibrary component with role-based permissions
- **CREATED**: book_checkout_history table for tracking all checkout and return actions
- **IMPLEMENTED**: Checkout history view in profile page with comprehensive activity tracking
- **ADDED**: Real-time book status updates (available vs checked_out) with user name display
- **ENHANCED**: Material UI buttons for checkout actions with proper loading states and feedback
- **IMPLEMENTED**: Admin override capability (admins can return books checked out by any user)
- **ADDED**: Due date calculation (default 2 weeks) with optional custom due dates and notes
- **CREATED**: GET `/api/books/checkout-history` endpoint for user and admin history viewing
- **IMPLEMENTED**: POST `/api/books/{id}/checkout` and `/api/books/{id}/checkin` endpoints
- **ENHANCED**: Book listings to show checkout status and who has checked out each book
- **OPTIMIZED**: User name display to show only first names for privacy (e.g., "TimTwo" vs "TimTwo Arnold")
- **INTEGRATED**: Checkout system seamlessly with existing book management and permission system
- **VALIDATED**: Complete checkout workflow functioning in production environment

### Session June 2025 - Interface Cleanup & Shelf Navigation Improvements
- **FIXED**: Critical SQL syntax error in `getLocationShelves` function (removed stray '/' character)
- **RESOLVED**: 500 errors on admin locations management screen and regular users not seeing shelves
- **REMOVED**: Export Library button from BookLibrary component header to reduce interface clutter
- **ELIMINATED**: Redundant shelf select dropdown under page heading in favor of tile navigation
- **ADDED**: "All Shelves" tile to shelf navigation showing total book count across all shelves
- **ENHANCED**: Tile-based shelf filtering as the primary navigation method for multi-shelf locations
- **STREAMLINED**: User interface to use single, delightful tile navigation system exclusively
- **IMPROVED**: "All Shelves" tile highlights when no filter is active and clears filters when clicked
- **OPTIMIZED**: Clean, modern interface with reduced redundancy and improved user experience

### Session June 2025 - Enhanced ISBN Scanner & Google Books API Integration
- **RENAMED**: "Scan Books" tab to "Add Books" with improved terminology and user experience
- **IMPLEMENTED**: Unified AddBooks component with tabbed interface (ISBN Scanner + Book Search)
- **ENHANCED**: ISBN scanner with improved camera controls, error handling, and permission management
- **INTEGRATED**: Google Books API search functionality for title/author-based book discovery
- **CREATED**: Hybrid API approach combining Google Books (primary) + OpenLibrary (enhanced genre data)
- **ADDED**: EnhancedBook interface extending basic Book with rich metadata fields (enhancedGenres, series, extendedDescription, subjects, pageCount, averageRating, publisherInfo, openLibraryKey)
- **IMPLEMENTED**: Interactive book display features with clickable authors, series links, and "More Details" modals
- **ADDED**: localStorage preference memory for user's preferred tab choice (Scanner vs Search)
- **REVERSED**: Navigation tab order and corrected spelling to "My Libary" for consistency
- **STREAMLINED**: Removal request button to icon-only design for cleaner interface
- **ENHANCED**: BookLibrary component to display all enhanced book data with full feature parity
- **FIXED**: Enhanced book data persistence issue by resolving field name mapping between frontend (camelCase) and backend (snake_case)
- **DEPLOYED**: Database migration for enhanced book fields (extended_description, subjects, page_count, average_rating, etc.)
- **VALIDATED**: Complete enhanced book workflow functioning with persistent rich metadata display

### Session June 2025 - Book Card UI Improvements & Google Books Rating Clarity
- **OPTIMIZED**: Book card layout to show only first genre instead of up to 4 genres for cleaner appearance
- **RELOCATED**: ISBN number from book cards to More Details modal to reduce visual clutter
- **ENHANCED**: Book image display with proper aspect ratio (80x120px) and object-fit cover to prevent stretching
- **IMPROVED**: Published date display to show only year format for more concise information
- **CLARIFIED**: Google Books rating label from "Average Rating" to "Google Books Rating" for source transparency
- **CONSOLIDATED**: Complete genre list moved to More Details modal under "All Genres" section
- **REFINED**: Book card information hierarchy prioritizing title, author, publication year, single genre, and description
- **MAINTAINED**: Enhanced book data features including clickable authors, series links, and comprehensive More Details modal

### Session June 2025 - AddBooks Component UX Enhancements
- **IMPLEMENTED**: Persistent shelf selection using localStorage to remember user's last chosen shelf across sessions
- **ADDED**: Comprehensive duplicate detection system using ISBN and title/author matching to prevent adding the same book twice
- **ENHANCED**: Search results UI to display "Already in Your Library" for duplicate books with disabled styling and checkmark icon
- **CREATED**: Auto-focus functionality that automatically focuses the correct input field when switching between tabs (Scanner vs Search)
- **OPTIMIZED**: Real-time duplicate checking by loading existing books during component initialization
- **IMPROVED**: Shelf selector to persist user selections for enhanced workflow continuity
- **STREAMLINED**: Field sizing consistency between ISBN manual entry and search input fields
- **ADDED**: CheckCircle icon import and usage for clear duplicate book indication
- **ENHANCED**: User experience with intelligent shelf restoration and duplicate prevention workflow

### Session December 2024 - Permission System Implementation
- **COMPLETED**: Added user_role column to database schema with migration
- **DEPLOYED**: Database migration to production (tim.arnold@gmail.com set as admin)
- **IMPLEMENTED**: Admin-only restrictions for location/shelf create, update, delete operations
- **UPDATED**: Workers API with comprehensive permission checking system
- **ENHANCED**: UI with role-based button visibility and user messaging
- **TESTED**: Permission system working correctly in production
- **REMOVED**: Redundant Next.js API routes (now using Workers API directly)

### Next Priority: Feature Enhancements
- Add admin notification system for user requests and activities  
- Create comprehensive admin dashboard with analytics and bulk actions
- Implement dark mode toggle with persistent user preference
- Add book rating system and enhanced book detail views
- Add checkout notifications and due date reminders

---
Last updated: June 2025