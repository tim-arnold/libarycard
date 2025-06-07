# LibaryCard Development Todos

This file tracks active development tasks and future enhancements for the LibaryCard project.

> **Note**: For completed features and fixes, see [CHANGELOG.md](./CHANGELOG.md)

## ✅ Recently Completed (January 2025)

### OCR Migration to Cloudflare Workers - COMPLETE!
- [x] **Bookshelf Photo Scanning Migration**: Successfully migrated Google Vision API OCR processing from Netlify Functions to Cloudflare Workers
- [x] **Production Deployment**: OCR feature now fully functional in production with 80-90% accuracy
- [x] **Infrastructure Enhancement**: Complete transition to Cloudflare Workers backend architecture
- [x] **Service Account Authentication**: Implemented proper Google Cloud service account credentials with JWT authentication
- [x] **Cross-Environment Testing**: Verified functionality in both local development and production environments

## Active Development Todos

### High Priority - Next Session Focus

- [ ] **Admin Notification System**
  - [ ] Add admin notification system for user requests (removal requests, etc.)
  - [ ] Implement checkout notifications and due date reminders
  - [ ] Create notification center for pending admin actions

### Low Priority - Future Enhancements

- [ ] **Admin Dashboard & Analytics**
  - [ ] Implement admin analytics (books per location, user activity, etc.)
  - [ ] Create separate admin dashboard with location overview, user management, and pending requests
  - [ ] Add bulk actions for admin users (bulk book approval, multi-user invitations, etc.)

- [ ] **Enhanced Book Features**
  - [ ] Add star rating system, just display average rating for each book from scoped to the location

---

**Last updated**: June 2025