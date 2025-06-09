# LibaryCard AI Assistant Context

This file contains AI-specific context and working preferences for Claude Code when working on LibaryCard.

**Project Resources**: [Active Todos](./docs/reference/TODO.md) • [Change History](./docs/reference/CHANGELOG.md) • [Architecture Guide](./docs/development/architecture.md) • [Getting Started](./docs/guides/getting-started.md)

## Project Context for AI

**What is LibaryCard**: Personal library management platform with ISBN scanning, Google Books API integration, and multi-user support  
**Architecture**: Next.js frontend on Netlify + Cloudflare Workers API + D1 database  
**Tech Stack**: TypeScript, Material UI, NextAuth.js, Google Books API  
**Environment**: Development with mock auth, production with email verification

## AI Development Guidelines

### Code Style & Patterns
- **Follow existing patterns**: Always examine surrounding code and imports before making changes
- **No comments**: Never add code comments unless explicitly requested
- **Component architecture**: Use the modular component pattern established in the codebase
- **TypeScript**: Maintain strict typing throughout the application
- **Material UI**: Follow the established design system and theme patterns

### Testing & Quality Assurance
- **Screenshot testing**: Use `cd testing && node screenshot.js` for UI verification
- **Build verification**: Always run `npm run build` and `npm run lint` after changes
- **Environment setup**: Screenshots require `SCREENSHOT_USER` and `SCREENSHOT_PASSWORD` in `.env.local`

### Commit Guidelines
- **Commit messages**: Use clear, descriptive messages without AI tool attribution
- **No co-authoring**: Never include "Co-Authored-By: Claude" or similar
- **Focused commits**: Make atomic commits for single features/fixes

### Codebase Navigation
- **Frontend**: `src/components/` for React components, `src/lib/` for utilities
- **Backend**: `workers/` with modular structure (auth/, books/, locations/, ocr/)
- **Documentation**: `docs/` with organized subdirectories for different content types
- **Database**: `schema.sql` for schema, `migrations/` for changes

### Development Commands
```bash
# Development server
npm run dev

# Screenshot testing  
cd testing && node screenshot.js

# Build verification
npm run build
npm run lint

# Worker development
npx wrangler dev
```

## Current Technical State

**Component Architecture**: Recently refactored for token efficiency (32-52% line reduction)  
**Backend Structure**: Modular workers with separated concerns (auth, books, locations, ocr)  
**Authentication**: NextAuth.js with Google OAuth + email/password  
**Database**: Multi-user schema with role-based permissions  
**OCR**: Google Vision API integration for bookshelf photo scanning  

## AI Task Patterns

### When Adding Features
1. Examine existing components for patterns
2. Check `package.json` for available libraries
3. Follow the established component architecture
4. Update TypeScript interfaces in `src/lib/types.ts`
5. Run build and lint verification

### When Debugging
1. Check browser console for client-side errors
2. Use `npx wrangler tail` for worker logs
3. Verify database schema matches expectations
4. Test with screenshot automation if UI-related

### When Refactoring
1. Maintain existing component boundaries
2. Preserve established patterns and conventions
3. Update imports consistently
4. Verify no functionality changes with testing

---

**Last updated**: June 2025