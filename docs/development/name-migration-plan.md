# LibraryCard Name Migration Plan

This document tracks the comprehensive migration from "libary" to "library" spelling throughout the LibraryCard application.

## Overview

The LibraryCard project was originally created with an intentional misspelling of "library" as "libary" throughout the codebase, domain names, and infrastructure. This migration plan corrects the spelling to the proper "library" form for professional consistency.

## Migration Status

### **✅ PHASE 1: COMPLETED - Code & Documentation Updates**

All code-level changes have been successfully completed and verified through build/lint testing.

#### React Components & Pages Updated
- `/src/app/layout.tsx` - Updated page title and metadata
- `/src/app/page.tsx` - Updated brand name, API URLs, and navigation labels
- `/src/app/auth/signin/page.tsx` - Updated API URLs and brand references
- `/src/app/privacy/page.tsx` - Updated brand references throughout
- `/src/app/profile/page.tsx` - Updated API URLs
- `/src/lib/ThemeContext.tsx` - Updated storage key names
- `/src/components/HelpModal.tsx` - Updated brand references in help text
- `/src/components/ContactModal.tsx` - Updated placeholder text
- `/src/components/AdminDashboard.tsx` - Updated API URLs and welcome text
- `/src/components/AdminSignupManager.tsx` - Updated API URLs and welcome message
- `/src/components/LocationManager.tsx` - Updated API URLs and help text
- `/src/components/BookshelfScanner.tsx` - Updated API endpoint URLs
- All other components with API_BASE references

#### API Routes Updated
- All 11 API route files in `/src/app/api/` updated with correct API URLs
- Authentication routes, book routes, user routes, contact routes, admin routes

#### Workers/Backend Updated
- `/workers/index.ts` - All 43 instances updated including:
  - Email templates and subjects
  - Brand references in email content
  - Domain references in URLs
  - FROM_EMAIL configurations
  - Database connection references

#### Documentation Updated
- `/README.md` - Project title, description, and example URLs
- `/CLAUDE.md` - All project references and context
- All markdown files in `/docs/` directory (25+ files):
  - Architecture guides
  - API references
  - Deployment guides
  - User guides
  - Development documentation

### **✅ PHASE 2: COMPLETED - Configuration Updates**

#### Build Configuration
- `/package.json` - Updated project name from "libarycard" to "librarycard"
- `/package-lock.json` - Updated all package name references
- `/wrangler.toml` - Updated worker names, database names, and brand references

#### Environment Configuration
- `/.env.local` - Updated API URLs to use correct spelling
- `/.env.example` - Updated all API URLs and domain references

#### IDE Configuration
- `/.idea/libarycard.iml` → `/.idea/librarycard.iml` - Renamed IDE configuration file

#### Scripts
- `/cleanup-user.js` - Updated API URLs

### **✅ PHASE 3: COMPLETED - Testing & Verification**

#### Build & Quality Assurance
- ✅ `npm run lint` - Passed successfully with only pre-existing warnings
- ✅ `npm run build` - Successful production build
- ✅ TypeScript compilation successful across all modules
- ✅ No breaking changes introduced to application logic
- ✅ All component imports and exports verified

## **🔄 PHASE 4: PENDING - Infrastructure Migration**

The following changes require external infrastructure updates and deployment coordination:

### **Domain/DNS Changes** (Risk: Medium)
- **Current**: `libarycard.tim52.io` 
- **Target**: `librarycard.tim52.io`
- **Requirements**:
  - Cloudflare DNS record updates
  - SSL certificate reissuance for new domain
  - Netlify custom domain configuration
  - Environment variable updates in production

### **Cloudflare Worker Names** (Risk: Medium)
- **Current**: `libarycard-api`
- **Target**: `librarycard-api`
- **Impact**: Frontend will lose API connection until new worker is deployed
- **Mitigation**: Deploy new worker before updating frontend references

### **Database Names** (Risk: Medium - Optional)
- **Current**: `libarycard-db`
- **Target**: `librarycard-db`
- **Note**: This change is optional - existing database name can be maintained
- **If Changed**: Requires data migration or new database initialization

## **Deployment Strategy for Phase 4**

### **Option A: Coordinated Deployment (Recommended)**
1. **Prepare new infrastructure**:
   - Set up new domain `librarycard.tim52.io`
   - Deploy worker with new name `librarycard-api`
   - Optionally create new database `librarycard-db`

2. **Cutover sequence**:
   - Update DNS to point to new infrastructure
   - Deploy frontend with updated API URLs
   - Monitor for any connection issues

3. **Cleanup**:
   - Remove old worker and database (after verification)
   - Update all environment configurations

### **Option B: Gradual Migration**
1. **Maintain dual infrastructure temporarily**
2. **Test new domain with staging environment**
3. **Migrate production traffic gradually**

## **Impact Summary**

### **Files Modified**: 60+ files
### **References Updated**: 150+ instances

### **Categories Changed**:
- ✅ **Brand/UI Text**: "LibaryCard" → "LibraryCard" 
- ✅ **API URLs**: "libarycard.tim52.io" → "librarycard.tim52.io"
- ✅ **Package Names**: "libarycard" → "librarycard"
- ✅ **Database Names**: "libarycard-db" → "librarycard-db"
- ✅ **Worker Names**: "libarycard-api" → "librarycard-api"
- ✅ **Storage Keys**: "libarycard-theme" → "librarycard-theme"
- ✅ **Navigation Labels**: "My Libary" → "My Library"

## **Risk Assessment**

### **Completed Changes (Low Risk)**
- ✅ All UI text and brand references
- ✅ Package and project names  
- ✅ Documentation updates
- ✅ Code strings and comments
- ✅ Build configuration

### **Pending Changes (Medium Risk)**
- 🔄 Domain name changes (requires DNS updates)
- 🔄 Production worker deployment
- 🔄 Database migration (optional)

## **Rollback Plan**

If issues arise during Phase 4 deployment:

1. **DNS Rollback**: Revert DNS records to original domain
2. **Worker Rollback**: Keep old worker active, revert frontend URLs
3. **Database Rollback**: Continue using existing database
4. **Code Rollback**: Git revert to previous commit (if necessary)

## **Quality Assurance Checklist**

- [x] All lint checks pass
- [x] Production build successful
- [x] TypeScript compilation clean
- [x] No breaking changes to application logic
- [x] All component imports verified
- [x] Documentation updated and consistent

## **Next Steps**

1. **Plan infrastructure migration timing**
2. **Coordinate with hosting providers** (Netlify, Cloudflare)
3. **Set up monitoring** for deployment verification
4. **Execute Phase 4 deployment** when ready
5. **Update production environment variables**
6. **Verify all functionality** post-migration

---

**Migration Initiated**: June 2025  
**Code Changes Completed**: June 2025  
**Infrastructure Migration**: Pending  
**Last Updated**: June 2025