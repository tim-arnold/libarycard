# Librarian Role Implementation Plan

## Overview
Add a new "Librarian" role that provides admin-level permissions but scoped to specific locations. Librarians can manage books, shelves, users, and operations within their assigned locations, but cannot access global admin functions or locations they're not assigned to.

## Phase 1: Database Schema Changes

### 1.1 Update User Roles
- Modify `users.user_role` to support `'admin'`, `'librarian'`, `'user'`
- Keep global admins with system-wide access
- Add librarians with location-scoped permissions

### 1.2 Location-Librarian Assignment Table
Create new table `location_librarians`:
```sql
CREATE TABLE location_librarians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL, -- Admin who assigned this role
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE(location_id, user_id)
);
```

## Phase 2: Backend Permission System Refactor

### 2.1 Core Permission Functions
- Update `isUserAdmin()` → `hasAdminPrivileges(userId, locationId?, env)`
- Create `isLocationLibrarian(userId, locationId, env)`
- Create `canManageLocation(userId, locationId, env)` - true for admins or location librarians
- Create `getUserLocationRole(userId, locationId, env)` - returns 'admin', 'librarian', 'member', or 'none'

### 2.2 Location Management Updates
Update all location/shelf functions to accept librarian permissions:
- `createLocation()` - Admin only (global function)
- `updateLocation()` - Admin or location librarian
- `deleteLocation()` - Admin only (affects multiple users)
- `createShelf()` - Admin or location librarian
- `updateShelf()` - Admin or location librarian
- `deleteShelf()` - Admin or location librarian

### 2.3 Book Management Updates
- `approveBookRemovalRequest()` - Admin or librarian for book's location
- `denyBookRemovalRequest()` - Admin or librarian for book's location
- `checkinBook()` - Admin or librarian for book's location (+ existing user logic)
- `getCheckoutHistory()` - Admin (all), librarian (their locations), user (own only)

### 2.4 User Management Updates
- Invitation management - Admin or location librarian can invite to their locations
- User role changes - Only admins can promote/demote librarians
- Location membership - Librarians can manage membership for their locations

## Phase 3: Frontend Role System Updates

### 3.1 Permission Context
Create `usePermissions` hook:
```typescript
interface UserPermissions {
  isGlobalAdmin: boolean;
  managedLocations: number[]; // Location IDs user can manage
  canManageLocation: (locationId: number) => boolean;
  canManageBooks: (locationId: number) => boolean;
  canManageUsers: () => boolean; // Global admin only
}
```

### 3.2 UI Component Updates
- **AdminDashboard**: Show location-scoped view for librarians
- **LocationManager**: Enable management for librarian's assigned locations
- **BookLibrary**: Show admin actions for books in managed locations
- **UserManagement**: Restrict to global admins, add librarian assignment interface
- **Navigation**: Show "Librarian Dashboard" for librarians, "Admin Dashboard" for admins

### 3.3 New Librarian Assignment Interface
Admin-only component for:
- Viewing current librarian assignments by location
- Assigning users as librarians to specific locations
- Removing librarian assignments
- Bulk assignment management

## Phase 4: API Endpoints

### 4.1 New Endpoints
```
GET /api/admin/librarians - List all librarian assignments (admin only)
POST /api/admin/librarians - Assign user as librarian to location (admin only)
DELETE /api/admin/librarians/:id - Remove librarian assignment (admin only)
GET /api/locations/:id/librarians - List librarians for location (admin/librarian)
```

### 4.2 Updated Endpoints
All existing admin-only endpoints updated to support librarian permissions where location-appropriate.

## Phase 5: Database Migration

### 5.1 Migration Script
```sql
-- Add librarian role option
UPDATE users SET user_role = 'librarian' WHERE user_role = 'admin' AND id IN (
  -- Identify users to convert to librarians based on business rules
);

-- Create location_librarians table
-- Insert initial librarian assignments
```

### 5.2 Rollback Strategy
- Keep original admin accounts as backup
- Provide admin interface to quickly restore global admin status
- Migration validation checks

## Phase 6: Testing & Validation

### 6.1 Permission Matrix Testing
Test all combinations:
- Global Admin: All permissions everywhere
- Librarian: Full permissions in assigned locations only
- User: Standard permissions only

### 6.2 Edge Cases
- Librarian assigned to multiple locations
- Location ownership transfer scenarios
- Librarian role removal impact
- Cross-location book operations

## Implementation Order

1. **Phase 1**: Database schema (low risk)
2. **Phase 2**: Backend permission functions (medium risk)
3. **Phase 3**: Frontend permission system (medium risk)
4. **Phase 4**: API endpoints (low risk)
5. **Phase 5**: Migration with rollback plan (high risk)
6. **Phase 6**: Comprehensive testing (critical)

## Benefits

- **Scalable delegation**: Admins can delegate location management
- **Secure scoping**: Librarians only access their assigned locations
- **Backward compatibility**: Existing admin/user roles unchanged
- **Flexible assignment**: Librarians can manage multiple locations
- **Audit trail**: Track who assigned librarian privileges

## Risk Mitigation

- **Gradual rollout**: Test with single location first
- **Permission validation**: Extensive testing of edge cases
- **Admin override**: Global admins retain all privileges
- **Rollback capability**: Easy reversion to current system
- **Documentation**: Clear role definitions and workflows