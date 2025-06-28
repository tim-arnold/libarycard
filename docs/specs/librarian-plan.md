# Super Admin Role Implementation Plan

## Overview
Implement role separation by creating a "Super Admin" role for global system administration while keeping the current "Admin" role for location-scoped management. This achieves the same functional separation as the original librarian proposal but leverages existing admin infrastructure for simplified implementation.

## Phase 1: Database Schema Changes

### 1.1 Update User Roles
- Modify `users.user_role` to support `'super_admin'`, `'admin'`, `'user'`
- Keep existing admin functionality as location-scoped admin
- Add super admin role for global system functions

### 1.2 Migration Strategy
```sql
-- Add super_admin role support (no schema change needed, just enum expansion)
-- Identify current admin users who need global access
-- Promote designated admins to super_admin during migration
```

No new tables needed - leveraging existing location ownership and membership structures.

## Phase 2: Backend Permission System Updates

### 2.1 Core Permission Functions
- Create `isSuperAdmin(userId, env)` - checks for `user_role = 'super_admin'`
- Keep `isUserAdmin(userId, env)` - checks for `user_role IN ('admin', 'super_admin')`
- Create `canManageLocation(userId, locationId, env)` - true for location owner/member
- Update permission hierarchy: super_admin > admin > user

### 2.2 Super Admin Restricted Functions
Move these functions to require super admin privileges:
- `getSignupRequests()` - Global signup approval
- `approveSignupRequest()` - Global signup approval  
- `denySignupRequest()` - Global signup approval
- `cleanupUser()` - Global user deletion
- `debugListUsers()` - Global user listing
- `updateUserRole()` - Global role management
- `getAdminAnalytics()` - Global system analytics
- `createLocation()` - Location creation
- `deleteLocation()` - Location deletion

### 2.3 Admin Retained Functions (Location-Scoped)
These remain available to regular admins:
- Location management within owned/assigned locations
- Shelf management within accessible locations
- Book management within accessible locations
- Invitation management for accessible locations
- Book removal request approval for accessible locations
- Location membership management

## Phase 3: Frontend Role System Updates

### 3.1 Permission Context Updates
Update existing permission hooks:
```typescript
interface UserPermissions {
  isSuperAdmin: boolean;        // NEW: Global admin privileges
  isAdmin: boolean;             // EXISTING: Location-scoped admin
  isUser: boolean;              // EXISTING: Regular user
  canManageLocation: (locationId: number) => boolean;
  canManageGlobalSystem: boolean; // NEW: Super admin only
}
```

### 3.2 UI Component Updates
- **AdminDashboard**: Hide global functions from regular admins
- **UserManagement**: Restrict to super admins only
- **SignupApproval**: Restrict to super admins only  
- **GlobalAnalytics**: Restrict to super admins only
- **LocationCreation**: Restrict to super admins only
- **Navigation**: Show "Admin" vs "Super Admin" role indicators

### 3.3 Role-Based Navigation
```typescript
// Super Admin sees:
- Admin Dashboard (with global functions)
- User Management
- Signup Requests
- Global Analytics
- All location management functions

// Regular Admin sees:
- Admin Dashboard (location-scoped only)
- Location management for accessible locations
- Book/shelf management for accessible locations
- Invitation management for accessible locations
```

## Phase 4: API Endpoint Updates

### 4.1 Super Admin Only Endpoints
Update these endpoints to require super admin:
```
GET /api/signup-requests
POST /api/signup-requests/:id/approve
POST /api/signup-requests/:id/deny
POST /api/admin/cleanup-user
GET /api/admin/debug-users
PUT /api/admin/users/:id/role
GET /api/admin/analytics
POST /api/locations (create)
DELETE /api/locations/:id
```

### 4.2 Unchanged Endpoints
These remain accessible to regular admins (location-scoped):
```
GET /api/locations (user's accessible locations)
PUT /api/locations/:id (if user can manage)
GET /api/locations/:id/shelves
POST /api/locations/:id/shelves
PUT /api/shelves/:id
DELETE /api/shelves/:id
All book management endpoints (location-scoped)
All invitation endpoints (location-scoped)
```

## Phase 5: Database Migration

### 5.1 Pre-Migration Analysis
```sql
-- Identify current admin users
SELECT id, email, first_name, last_name, user_role 
FROM users 
WHERE user_role = 'admin';

-- Analyze location ownership
SELECT u.email, l.name as location_name, l.id as location_id
FROM users u
JOIN locations l ON u.id = l.owner_id
WHERE u.user_role = 'admin';
```

### 5.2 Migration Script
```sql
-- Promote designated users to super admin
UPDATE users 
SET user_role = 'super_admin' 
WHERE id IN (
  'tim.arnold@gmail.com',  -- Primary system admin
  -- Add other designated super admins
);

-- Regular admins remain as 'admin' (no change needed)
```

### 5.3 Rollback Strategy
```sql
-- Emergency rollback: promote all admins to super_admin
UPDATE users 
SET user_role = 'super_admin' 
WHERE user_role = 'admin';
```

## Phase 6: Testing & Validation

### 6.1 Permission Matrix Testing
Test all combinations:
- **Super Admin**: All functions work (current admin behavior)
- **Regular Admin**: Location functions work, global functions blocked
- **User**: Standard permissions only

### 6.2 Critical Test Cases
1. Regular admin tries to access user management → Blocked
2. Regular admin manages their locations → Works
3. Super admin accesses all functions → Works
4. Role promotion/demotion by super admin → Works
5. Signup approval by regular admin → Blocked
6. Signup approval by super admin → Works

## Implementation Order

1. **Phase 1**: Database schema preparation (immediate)
2. **Phase 2**: Backend permission updates (1-2 days)
3. **Phase 3**: Frontend permission system (2-3 days)
4. **Phase 4**: API endpoint security (1 day)
5. **Phase 5**: Migration execution (1 day with testing)
6. **Phase 6**: Comprehensive testing (ongoing)

## Benefits Over Original Librarian Plan

### Simplified Implementation
- **No new tables**: Uses existing location ownership/membership
- **No assignment system**: Location access via existing mechanisms
- **Minimal schema changes**: Just role enum expansion
- **Preserves workflows**: Current admin users keep location management

### Reduced Complexity
- **No location assignments**: Uses existing owner_id and location_members
- **No librarian management UI**: Simple role promotion by super admin
- **No complex permission queries**: Simple role-based checks
- **Easier testing**: Fewer edge cases and scenarios

### Faster Deployment
- **Less risky**: Smaller change surface area
- **Faster implementation**: Leverages existing infrastructure
- **Easier rollback**: Simple role changes vs complex schema rollback
- **Minimal training**: Current admins keep familiar workflows

## Risk Mitigation

### Technical Risks
- **Permission bypass**: Comprehensive API endpoint testing
- **Role confusion**: Clear UI indicators and documentation
- **Migration issues**: Thorough pre-migration analysis and rollback plan

### Business Risks
- **Admin disruption**: Preserve all current location management capabilities
- **Access loss**: Careful super admin assignment before migration
- **User confusion**: Clear communication about role changes

### Security Risks
- **Privilege escalation**: Strict permission checking on all endpoints
- **Global access leak**: Hide unavailable functions in UI
- **Role manipulation**: Audit trail for all role changes

## Success Metrics

### Functional Success
- ✅ Regular admins retain all location management capabilities
- ✅ Super admins can perform global system administration
- ✅ Permission boundaries are strictly enforced
- ✅ Zero disruption to daily admin workflows

### Technical Success
- ✅ API security properly implemented
- ✅ UI correctly hides unavailable functions
- ✅ Performance impact is negligible
- ✅ Comprehensive test coverage achieved

### Business Success
- ✅ Clear role separation improves governance
- ✅ Scalable admin delegation model
- ✅ Enhanced security posture
- ✅ Simplified system administration