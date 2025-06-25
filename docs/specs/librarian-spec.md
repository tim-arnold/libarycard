# Librarian Role Specification

## Overview

This specification defines the requirements for implementing a "Librarian" role in LibraryCard that provides location-scoped administrative privileges. Librarians can perform admin-level operations within their assigned locations but cannot access global system administration functions.

## User Roles

### Current Roles
- **Admin**: Global system administrator with all privileges
- **User**: Regular library member with basic permissions

### New Role
- **Librarian**: Location-scoped administrator with admin privileges within assigned locations only

## Requirements

### FR-LIB-001: Location-Scoped Permissions
**Description**: Librarians must have admin-level permissions only within their assigned locations.

**Acceptance Criteria**:
- Librarians can manage books, shelves, and users within assigned locations
- Librarians cannot access locations they are not assigned to
- Librarians cannot perform global admin functions
- Global admins retain all current privileges

### FR-LIB-002: Librarian Assignment Management
**Description**: Global admins must be able to assign and remove librarian privileges for specific locations.

**Acceptance Criteria**:
- Global admins can assign users as librarians to specific locations
- Global admins can remove librarian assignments
- Users can be assigned as librarians to multiple locations
- Assignment changes are logged with timestamps and assigning admin

### FR-LIB-003: Location Management Privileges
**Description**: Librarians must be able to manage their assigned locations like global admins.

**Acceptance Criteria**:
- Create, edit, and delete shelves within assigned locations
- Edit location details (name, description) for assigned locations
- Cannot create or delete locations (global admin only)
- Cannot transfer location ownership

### FR-LIB-004: Book Management Privileges
**Description**: Librarians must have admin-level book management within their assigned locations.

**Acceptance Criteria**:
- Approve/deny book removal requests for books in assigned locations
- Check in any book within assigned locations (not just own checkouts)
- View checkout history for assigned locations
- Cannot access book data from unassigned locations

### FR-LIB-005: User Management Privileges
**Description**: Librarians must be able to manage location membership and invitations.

**Acceptance Criteria**:
- Send invitations to join assigned locations
- Manage location memberships for assigned locations
- Cannot change user roles (promote/demote users)
- Cannot delete users or perform global user management

### FR-LIB-006: Dashboard and Analytics
**Description**: Librarians must have access to location-specific analytics and management tools.

**Acceptance Criteria**:
- Location-scoped dashboard showing assigned locations only
- Analytics limited to assigned locations
- Cannot access global system analytics
- Cannot view unassigned location data

## User Stories

### Story 1: Librarian Assignment
**As a** global admin  
**I want to** assign a user as librarian to a specific location  
**So that** I can delegate location management responsibilities

**Acceptance Criteria**:
- I can access a librarian management interface
- I can select a user and assign them to one or more locations
- The assignment is immediately effective
- I can see all current librarian assignments

### Story 2: Location Management
**As a** librarian  
**I want to** manage shelves in my assigned locations  
**So that** I can organize the library effectively

**Acceptance Criteria**:
- I can create new shelves in my assigned locations
- I can edit shelf names in my assigned locations
- I can delete shelves in my assigned locations
- I cannot access shelves in unassigned locations

### Story 3: Book Approval
**As a** librarian  
**I want to** approve book removal requests in my assigned locations  
**So that** I can maintain the book collection

**Acceptance Criteria**:
- I see removal requests for books in my assigned locations
- I can approve or deny these requests
- I cannot see requests for books in unassigned locations
- My decisions are logged with my user information

### Story 4: User Invitations
**As a** librarian  
**I want to** invite users to join my assigned locations  
**So that** I can grow the library membership

**Acceptance Criteria**:
- I can send invitations to my assigned locations
- I can manage pending invitations for my assigned locations
- I cannot invite users to unassigned locations
- Invitation emails clearly identify me as the inviting librarian

### Story 5: Limited Dashboard
**As a** librarian  
**I want to** see analytics for my assigned locations  
**So that** I can monitor library activity and usage

**Acceptance Criteria**:
- My dashboard shows only data from assigned locations
- Analytics include book counts, user activity, and checkout statistics
- I cannot see global system statistics
- Data is clearly labeled with location context

## Technical Requirements

### TR-LIB-001: Database Schema
**Description**: Database must support librarian role and location assignments.

**Requirements**:
- `users.user_role` supports `'admin'`, `'librarian'`, `'user'`
- New `location_librarians` table for assignments
- Foreign key constraints maintain data integrity
- Audit trail for assignment changes

### TR-LIB-002: Permission System
**Description**: Backend permission system must support location-scoped checks.

**Requirements**:
- Location-aware permission functions
- Backward compatibility with existing admin checks
- Efficient permission queries
- Clear permission hierarchy (admin > librarian > user)

### TR-LIB-003: API Security
**Description**: All API endpoints must respect librarian permission boundaries.

**Requirements**:
- Location context validation on all requests
- Permission checks before data access
- Proper error responses for unauthorized access
- Consistent permission patterns across endpoints

### TR-LIB-004: Frontend Security
**Description**: Frontend must hide unauthorized features and data.

**Requirements**:
- Role-based UI component visibility
- Location context awareness
- Permission hooks for component logic
- Graceful degradation for limited permissions

## Non-Functional Requirements

### NFR-LIB-001: Performance
- Permission checks must not significantly impact response times
- Database queries must be optimized for location-scoped operations
- Frontend permission checks must be efficient

### NFR-LIB-002: Security
- Location boundaries must be strictly enforced
- No data leakage between unassigned locations
- Audit trail for all librarian actions
- Input validation on all assignment operations

### NFR-LIB-003: Usability
- Clear indication of librarian role and assigned locations
- Intuitive permission boundaries in UI
- Helpful error messages for unauthorized actions
- Consistent experience across all librarian functions

## Constraints

### Business Constraints
- Global admins retain all current privileges
- Existing user workflows must not be disrupted
- Location ownership concept remains with admins only
- User role changes remain admin-only function

### Technical Constraints
- Must maintain backward compatibility
- Database migration must be reversible
- Performance impact must be minimal
- Implementation must be testable and maintainable

## Success Criteria

### Functional Success
- Librarians can manage assigned locations completely
- Permission boundaries are strictly enforced
- Global admins can assign/remove librarian privileges
- All user stories are implemented and tested

### Technical Success
- Zero data leakage between location boundaries
- Performance metrics remain within acceptable ranges
- All existing functionality continues to work
- Comprehensive test coverage for permission scenarios

### Business Success
- Admins can effectively delegate location management
- Librarians feel empowered within their assigned locations
- User experience is not negatively impacted
- System scales better with multiple locations

## Testing Strategy

### Unit Testing
- Permission function testing with various role combinations
- Database constraint testing
- API endpoint authorization testing

### Integration Testing
- End-to-end workflows for each user role
- Cross-location permission boundary testing
- Assignment and removal workflow testing

### User Acceptance Testing
- Real-world scenarios with multiple locations
- Permission boundary edge cases
- Usability testing with target users

## Migration Strategy

### Phase 1: Database Migration
- Create new tables and columns
- Validate existing data integrity
- Set up rollback procedures

### Phase 2: Backend Deployment
- Deploy permission system updates
- Validate API security
- Monitor performance metrics

### Phase 3: Frontend Deployment
- Deploy UI updates
- Test role-based visibility
- Validate user experience

### Phase 4: Data Migration
- Assign initial librarian roles
- Validate assignment accuracy
- Monitor system behavior

## Rollback Plan

### Immediate Rollback
- Revert database schema changes
- Restore previous permission system
- Disable librarian role assignments

### Data Recovery
- Preserve all existing admin privileges
- Maintain location ownership integrity
- Ensure no data loss during rollback

### Communication Plan
- Notify affected users of role changes
- Provide clear documentation of new features
- Support team training on librarian role functionality