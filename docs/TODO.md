# LibaryCard Development Todos

This file tracks active development tasks and future enhancements for the LibaryCard project.

> **Note**: For completed features and fixes, see [CHANGELOG.md](./CHANGELOG.md)

## Active Development Todos

### High Priority - Next Session Focus

- [ ] **Admin Notification System**
  - [ ] Add admin notification system for user requests (removal requests, etc.)
  - [ ] Implement checkout notifications and due date reminders
  - [ ] Create notification center for pending admin actions

### Medium Priority - UX Improvements

- [ ] **Admin Pagination Logic Refinement**
  - [ ] Current admin pagination flattens all books across locations, paginates globally, then regroups by location
  - [ ] Consider alternative approaches: pagination within each location group, or separate admin pagination strategy
  - [ ] Current approach works but may be confusing when books from different locations appear on same page
  - [ ] Evaluate user feedback and consider per-location pagination for better admin UX

### Low Priority - Future Enhancements

- [ ] **Admin Dashboard & Analytics**
  - [ ] Create separate admin dashboard with location overview, user management, and pending requests
  - [ ] Add bulk actions for admin users (bulk book approval, multi-user invitations, etc.)
  - [ ] Implement admin analytics (books per location, user activity, etc.)

- [ ] **Enhanced Book Features**
  - [ ] Add star rating system, just display average rating for each book from scoped to the location
  - [ ] Add profile picture upload functionality with image resizing and storage

---

**Last updated**: December 2025