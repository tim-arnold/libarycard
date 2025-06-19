# LibraryCard Development Todos

This file tracks active development tasks and future enhancements for the LibraryCard project.

> **Note**: For completed features and fixes, see [CHANGELOG.md](./CHANGELOG.md)

## ✅ Recently Completed (June 2025)

### Enhanced Book Features - Star Rating System - COMPLETE!
- [x] **Library-Specific Star Rating System**: Implemented complete location-scoped star rating system with user ratings and library averages
- [x] **Database Schema**: Added book_ratings table with user ratings, reviews, and rating calculation columns
- [x] **Star Rating Components**: Created StarRating display component with 3 variants (display, mini, chip) for space-efficient UI
- [x] **Interactive Rating Input**: Built StarRatingInput component with hover effects and clear functionality
- [x] **Rating Modal Interface**: Developed RatingModal with book details, star input, and optional text reviews
- [x] **API Endpoints**: Implemented POST /api/books/{id}/rate and rating calculation with location-specific averages
- [x] **UI Integration**: Integrated ratings into all book views (Grid, Compact, List) with progressive disclosure design
- [x] **Google Books Separation**: Separated library ratings from Google Books ratings (Google ratings only in "More Details" modal)
- [x] **UX Design**: No empty stars shown initially, click-to-rate functionality, optional text reviews displayed in More Details

### Enhanced Duplicate Book Detection System - COMPLETE!
- [x] **Sophisticated Duplicate Detection**: Implemented three-tier duplicate detection algorithm (exact, potential, non-duplicate)
- [x] **Publication Date Comparison**: Added publication year comparison for accurate edition distinction
- [x] **ISBN Mismatch Handling**: Enhanced logic to prevent false positives when books have different ISBNs
- [x] **Add Anyway Functionality**: Created confirmation modal for potential duplicate override with detailed warnings
- [x] **False Positive Resolution**: Fixed issues with different editions being incorrectly flagged as duplicates
- [x] **User Experience Enhancement**: Improved duplicate status indicators and user feedback system

### Admin Dashboard & Management System - COMPLETE!
- [x] **Complete Admin Dashboard**: Implemented comprehensive admin dashboard with analytics, user management, and notification center
- [x] **Admin Analytics**: Created AdminAnalytics.tsx with location overview, user activity stats, and system metrics
- [x] **User Management**: Built AdminUserManager.tsx with comprehensive user management and permission controls
- [x] **Notification Center**: Developed AdminNotificationCenter.tsx for checkout reminders and removal request notifications
- [x] **Admin Integration**: Integrated all admin components into main app navigation for admin users only

### Data Quality & Duplicate Prevention - COMPLETE!
- [x] **Duplicate Location Fix**: Resolved duplicate locations issue for admin users who are both owners and members
- [x] **Duplicate Books Fix**: Fixed duplicate books appearing in admin dropdowns and lists due to multiple user roles
- [x] **Database Query Optimization**: Implemented DISTINCT queries in getUserLocations and getUserBooks
- [x] **Admin Interface Cleanup**: Optimized admin book and location data fetching for cleaner interface

### Genre System Refinements - COMPLETE!
- [x] **Genre Chip Restoration**: Restored genre chip display on book cards after user feedback
- [x] **Dropdown/Filter Separation**: Separated dropdown generation logic from filtering logic for better management
- [x] **Enhanced Genre Filtering**: Improved genre filtering to find books with Fantasy in OpenLibrary subjects
- [x] **Genre System Balance**: Optimized balance between dropdown simplicity and comprehensive search

### OCR Feature Removal - COMPLETE!
- [x] **Strategic Decision**: Removed OCR bookshelf scanning feature due to reliability issues and complexity concerns
- [x] **Frontend Cleanup**: Removed BookshelfScanner component and all OCR-related state from AddBooks.tsx
- [x] **Code Simplification**: Eliminated ~700+ lines of OCR-related code for better maintainability
- [x] **User Experience Focus**: Streamlined book addition to two reliable methods (ISBN scanning and search)
- [x] **Resource Reallocation**: Development focus shifted to Enhanced Book Features multi-select system

### Google OAuth Invitation Support - COMPLETE!
- [x] **Google OAuth Invitation Flow**: Implemented complete Google OAuth support for invitation acceptance workflow
- [x] **Authentication Choice**: Enhanced sign-in page to offer all authentication options for invited users
- [x] **Seamless Integration**: Added automatic invitation token handling in Google OAuth callback URLs
- [x] **User Experience**: Created smooth invitation acceptance flow without requiring email/password registration
- [x] **Authentication Reliability**: Fixed critical user creation bugs and verification status management
- [x] **Invitation System Robustness**: Enhanced invitation revocation with verification checks and error handling

### Admin Signup Approval System - COMPLETE!
- [x] **Database Schema Enhancement**: Created signup_approval_requests table with comprehensive tracking fields
- [x] **Dual Registration Workflow**: Implemented invitation-based vs approval-based registration paths
- [x] **Admin Approval Interface**: Built AdminSignupManager component with table-based request management
- [x] **Email Notification System**: Added admin notifications for new requests and user notifications for decisions
- [x] **API Endpoints**: Created complete approval workflow with get, approve, and deny endpoints
- [x] **User Experience Enhancement**: Modified signup form to handle pending approval states with clear messaging
- [x] **Security Implementation**: Added role-based access control and duplicate prevention
- [x] **Error Handling**: Implemented graceful email notification failures to prevent approval flow disruption

### Privacy Compliance & Cookie Notice System - COMPLETE!
- [x] **Cookie Consent Banner**: Implemented comprehensive "We value your privacy" cookie notice with customizable consent options
- [x] **Granular Consent Categories**: Created essential vs functional cookie categories with detailed explanations
- [x] **Privacy Policy Page**: Built complete privacy policy explaining data collection, storage, and user rights
- [x] **Storage Utility System**: Created consent-aware storage utilities that respect user preferences
- [x] **Component Integration**: Updated all localStorage usage across components to use new consent-aware storage system
- [x] **User Experience**: Designed non-intrusive bottom banner with expand/collapse options and clear messaging

### Admin Tab Consolidation & UI Simplification - COMPLETE!
- [x] **Redundant Tab Removal**: Removed main navigation tabs (Locations, Requests) for admin users that duplicated admin dashboard functionality
- [x] **Navigation Simplification**: Simplified admin main navigation to: Libraries, Add Books, Admin Dashboard for cleaner user experience
- [x] **Session Storage Updates**: Enhanced legacy tab handling to automatically redirect users with saved 'locations' or 'requests' tabs to admin dashboard
- [x] **Functionality Preservation**: Ensured all location/request management remains accessible through centralized admin dashboard
- [x] **Code Organization**: Improved organization by removing duplicate imports and tab rendering logic

### User Invitation System Refactoring - PARTIALLY COMPLETE!
- [x] **Phase 1**: Moved invitation management from LocationManager to AdminUserManager component
- [x] **Phase 3**: Added enhanced features (bulk invitations, location selection, improved status tracking)
- [ ] **Phase 2**: Implement global invitation overview across all locations with filtering and search
- [ ] **Phase 4**: Create new API endpoints for admin-level invitation management and analytics

### Search Result Pagination & UX Enhancements - COMPLETE!
- [x] **Pagination State Preservation**: Implemented complete state preservation across book search workflow - users return to exact same page after adding/cancelling book selections
- [x] **Progressive Loading**: Enhanced search results to show 40 books with progressive loading (10 initially, "Load more" for additional batches)
- [x] **Smart Autoscroll**: Added autoscroll functionality that takes users to newly added books marked as "Book Added!" in search results
- [x] **Cancel Workflow Enhancement**: Created autoscroll to cancelled books when returning from book selection screen for seamless navigation
- [x] **State Management Architecture**: Moved search results state to parent component for persistence across component re-renders
- [x] **Auto-search Prevention**: Prevented unwanted auto-search triggers when returning from cancelled book selections
- [x] **Technical Infrastructure**: Enhanced BookSearch component with comprehensive prop interface and robust scroll effect system

## Active Development Todos

### High Priority - Next Session Focus

- [ ] **Enhanced Book Features - Bulk Operations (Phases 1-3)**
  - [ ] Create "multi-select" capability in search results (ISBN scan and search) so multiple books can be selected and added in bulk.
  - [ ] Bulk adding books should share a single shelf selector and action buttons
  - [ ] Implement shopping cart UX approach with selection mode toggle and bulk review modal

- [ ] **Additional Admin Features**
  - [ ] User permission granularity (allow users to delete books, add/delete shelves, etc.)
  - [ ] Add bulk actions for admin users (bulk book approval, multi-user invitations, etc.)

### Low Priority - Future Enhancements

- [ ] **User Invitation System Refactoring - Remaining Phases** (See [detailed plan](../development/user-invitation-refactor-plan.md))
  - [ ] **Phase 2**: Implement global invitation overview across all locations with filtering and search
  - [ ] **Phase 4**: Create new API endpoints for admin-level invitation management and analytics

- [ ] **Future Admin Enhancements**
  - [ ] Implement automated email notifications for admin actions
  - [ ] Add configurable notification preferences for admin users
  - [ ] Expand notification system with more detailed reporting features

---

**Last updated**: June 2025