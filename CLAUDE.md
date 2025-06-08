# LibaryCard Development Notes

This file contains project context and configuration for AI assistants working on LibaryCard.

**Project Resources**: [Active Todos](./docs/reference/TODO.md) • [Change History](./docs/reference/CHANGELOG.md)

## Current Project Status

LibaryCard is a sophisticated library management platform with comprehensive features:

### Core Features ✅
- **Authentication**: Google OAuth + email/password with verification
- **User Management**: Role-based permissions (admin/user) with invitation system
- **Book Management**: ISBN scanning, Google Books API integration, checkout system
- **Library Organization**: Multi-location/shelf support with smart UX for single-shelf users
- **Modern UI**: Material UI design system with dark mode support
- **Advanced Features**: Book removal requests, pagination, duplicate detection


## Technical Overview

**Architecture**: Next.js frontend on Netlify + Cloudflare Workers API + D1 database  
**Stack**: TypeScript, Material UI, NextAuth.js, Google Books API  
**Environment**: Development mode with mock auth, production with full email verification

> **Detailed Architecture**: See [docs/development/architecture.md](./docs/development/architecture.md) for complete technical documentation

## Development Guidelines

**Commit Messages**: Use clear, descriptive commit messages without AI tool attribution or co-authoring credits

## Recent Highlights

- **Complete**: 🎉 **OCR Migration to Cloudflare Workers** - Bookshelf Photo Scanning now 100% functional with 80-90% accuracy in production
- **Complete**: Global footer with "Contact the Libarian" feature and professional email workflow
- **Complete**: Component architecture refactoring for improved maintainability and token efficiency (32-52% line reduction)
- **Complete**: Organized documentation structure with focused subdirectories (guides/, development/, deployment/, reference/)
- **Complete**: Material UI design system with dark mode support and WCAG-compliant accessibility
- **Complete**: Role-based permission system (admin/user) with comprehensive access controls
- **Complete**: Book checkout system with history tracking and admin override capabilities
- **Complete**: ISBN scanner with Google Books API integration and enhanced book metadata
- **Complete**: Curated genre classification system (26 meaningful categories)
- **Complete**: Book removal request system with admin approval workflows

> **Details**: See [docs/reference/CHANGELOG.md](./docs/reference/CHANGELOG.md) for complete implementation history

---

**Last updated**: June 2025  
**For complete change history**: See [docs/reference/CHANGELOG.md](./docs/reference/CHANGELOG.md)