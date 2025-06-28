# Super Admin Role Specification

## Overview

This specification defines the requirements for implementing role separation in LibraryCard by creating a "Super Admin" role for global system administration while keeping the current "Admin" role for location-scoped management. This approach achieves the same functional separation as the original librarian proposal but leverages the existing admin infrastructure.

## User Roles

### Current State
- **Admin**: Mixed global and location-scoped administrative privileges
- **User**: Regular library member with basic permissions

### New Role Structure
- **Super Admin**: Global system administrator with all privileges
- **Admin**: Location-scoped administrator (current admin functionality minus global functions)
- **User**: Regular library member with basic permissions (unchanged)

## Requirements

### FR-SA-001: Role Separation
**Description**: Separate global system administration from location-scoped management.

**Acceptance Criteria**:
- Current admins retain all location management capabilities
- Global system functions require super admin privileges
- Clear distinction between location and system administration
- Backward compatibility with existing admin workflows

### FR-SA-002: Super Admin Privileges
**Description**: Super admins must have access to global system administration functions.

**Acceptance Criteria**:
- Manage user roles across the entire system
- Approve/deny signup requests system-wide
- Access global analytics and reporting
- Create and delete locations
- Delete users and perform system cleanup
- All existing admin location management capabilities

### FR-SA-003: Admin Role Scope
**Description**: Regular admins must be limited to location-scoped operations.

**Acceptance Criteria**:
- Manage books, shelves, and operations within owned/assigned locations
- Send invitations to locations they manage
- Approve/deny book removal requests for their locations
- Cannot access global user management
- Cannot approve/deny signup requests
- Cannot access global system analytics
- Cannot create or delete locations

### FR-SA-004: Permission Boundaries
**Description**: Enforce strict permission boundaries between admin levels.

**Acceptance Criteria**:
- Admins cannot access super admin functions
- Clear error messages for unauthorized access attempts
- UI hides unavailable functions based on role
- API endpoints validate permission levels

## User Stories

### Story 1: Super Admin System Management
**As a** super admin  
**I want to** manage the entire LibraryCard system  
**So that** I can maintain global system health and security

**Acceptance Criteria**:
- I can promote/demote users to any role
- I can approve/deny signup requests for the entire system
- I can view system-wide analytics and usage statistics
- I can create new locations and delete existing ones
- I can perform user cleanup and system maintenance

### Story 2: Admin Location Management
**As an** admin  
**I want to** manage my assigned locations effectively  
**So that** I can provide excellent library services within my scope

**Acceptance Criteria**:
- I can manage books, shelves, and members in my locations
- I can approve book removal requests for my locations
- I can invite users to join my locations
- I cannot access global system functions
- My interface clearly shows my location-scoped role

### Story 3: Role Transition
**As a** current admin  
**I want to** continue my location management work seamlessly  
**So that** my daily workflows are not disrupted

**Acceptance Criteria**:
- All my current location management capabilities work unchanged
- I understand which functions now require super admin access
- The transition is communicated clearly
- I can request super admin elevation if needed

## Technical Requirements

### TR-SA-001: Database Schema
**Description**: Support super admin role with minimal schema changes.

**Requirements**:
- `users.user_role` supports `'super_admin'`, `'admin'`, `'user'`
- Migration path from current admin users
- Preserve existing location ownership and membership structures
- Audit trail for role changes

### TR-SA-002: Permission System
**Description**: Implement role-based permission checking.

**Requirements**:
- `isSuperAdmin(userId, env)` function
- `isAdmin(userId, env)` function (current behavior)
- `canManageLocation(userId, locationId, env)` function
- Permission hierarchy: super_admin > admin > user

### TR-SA-003: API Security
**Description**: Protect global functions with super admin checks.

**Requirements**:
- Update global user management endpoints
- Update system analytics endpoints
- Update signup approval endpoints
- Update location creation/deletion endpoints
- Maintain backward compatibility for location-scoped functions

### TR-SA-004: Frontend Security
**Description**: Role-based UI and feature access.

**Requirements**:
- Hide super admin functions from regular admins
- Clear role indication in navigation and headers
- Permission-based component rendering
- Graceful error handling for unauthorized access

## Implementation Strategy

### Phase 1: Database and Backend (Low Risk)
1. Add `'super_admin'` to user_role enum
2. Create permission checking functions
3. Identify current admin users for role assignment
4. Update API endpoints with super admin checks

### Phase 2: Frontend Updates (Medium Risk)
1. Update navigation and role displays
2. Hide super admin functions from regular admins
3. Add role-based permission hooks
4. Update error handling and messaging

### Phase 3: Migration (High Risk)
1. Assign super admin role to designated users
2. Validate permission boundaries work correctly
3. Communicate changes to affected users
4. Monitor system behavior

### Phase 4: Testing and Validation (Critical)
1. Test all permission boundaries
2. Validate existing admin workflows
3. Test super admin exclusive functions
4. User acceptance testing

## Migration Strategy

### Super Admin Assignment
- Identify users who need global system access
- Promote to super_admin role during migration
- Maintain current admin users as regular admins
- Provide clear communication about role changes

### Rollback Plan
- Preserve current admin role capabilities
- Quick promotion path back to super admin if needed
- Database rollback for role assignments
- Documentation of all changes

## Benefits

### Simplified Implementation
- Leverages existing admin infrastructure
- Minimal database schema changes
- Preserves current location management workflows
- Clear separation of concerns

### Enhanced Security
- Limits global system access to essential personnel
- Maintains location-scoped admin capabilities
- Clear permission boundaries
- Audit trail for elevated privileges

### Scalability
- Admins can manage multiple locations effectively
- Super admins focus on system-level concerns
- Role-based delegation of responsibilities
- Future expansion capabilities

## Success Criteria

### Functional Success
- Regular admins retain all location management capabilities
- Super admins have exclusive access to global functions
- Permission boundaries are strictly enforced
- All existing workflows continue to function

### Technical Success
- Zero disruption to current admin users
- Performance impact is minimal
- Permission checking is efficient and reliable
- Comprehensive test coverage

### Business Success
- Clear role separation improves system governance
- Admins feel empowered within their scope
- Super admins can effectively manage system growth
- User experience remains consistent and intuitive