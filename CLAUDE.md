# LibaryCard Development Notes

This file contains development todos, notes, and context for AI assistants working on this project.

## Current Project Status
- ✅ Google OAuth authentication implemented
- ✅ Email/password authentication with email verification 
- ✅ Strong password validation (8+ chars, uppercase, lowercase, number, special char)
- ✅ Development mode fallbacks for testing
- ✅ Basic book management and ISBN scanning
- ✅ Location and shelf management

## Development Todos

### High Priority - Next Session Focus
- [ ] **Edit Profile Feature**
  - [ ] Create profile editing UI with conditional fields based on auth provider (email changeable for email/password users only)
  - [ ] Add profile navigation link/button to main application layout
  - [ ] Implement profile update functionality with proper validation and error handling

### Medium Priority - UI Improvements & Core Features
- [ ] **UI Enhancements**
  - [ ] Replace inline styles with proper CSS modules or styled-components for better maintainability
  - [ ] Improve responsive design for mobile devices and tablets
  - [ ] Add proper navigation header with user menu, profile link, and sign-out functionality
  - [ ] Enhance book management interface with better cards, grid layout, and action buttons
  - [ ] Add loading states and better form styling throughout the application

- [ ] **Core Functionality**
  - [ ] Add search and filtering functionality for book collections
  - [ ] Implement proper location and shelf management UI with CRUD operations

### Low Priority - Future Enhancements
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

---
Last updated: December 2024