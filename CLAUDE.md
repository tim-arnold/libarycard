# LibaryCard Development Notes

This file contains project context and configuration for AI assistants working on LibaryCard.

**Project Resources**: [Active Todos](./docs/TODO.md) • [Change History](./docs/CHANGELOG.md)

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

> **Detailed Architecture**: See [docs/architecture.md](./docs/architecture.md) for complete technical documentation

## Development Guidelines

**Commit Messages**: Use clear, descriptive commit messages without AI tool attribution or co-authoring credits

## Recent Highlights

- **Complete**: Material UI design system with dark mode
- **Complete**: Role-based permission system (admin/user)  
- **Complete**: Book checkout system with history tracking
- **Complete**: ISBN scanner with Google Books API integration
- **Complete**: Curated genre classification (26 categories)
- **Complete**: Book removal request system with admin approval

> **Details**: See [docs/CHANGELOG.md](./docs/CHANGELOG.md) for complete implementation history

---

**Last updated**: June 2025  
**For complete change history**: See [docs/CHANGELOG.md](./docs/CHANGELOG.md)