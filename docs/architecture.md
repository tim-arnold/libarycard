# Architecture Overview

LibraryCard is built as a modern, serverless web application using Cloudflare's edge computing platform for optimal performance and cost-effectiveness.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│  Next.js App    │◄──►│ Cloudflare Worker│◄──►│ Cloudflare D1   │
│  (Frontend)     │    │     (API)        │    │   (Database)    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│                 │    │                  │
│ Cloudflare Pages│    │ External APIs    │
│   (Hosting)     │    │ • Google Books   │
│                 │    │ • OpenLibrary    │
└─────────────────┘    └──────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: CSS-in-JS (inline styles)
- **State Management**: React hooks (useState, useEffect)
- **Build Tool**: Next.js built-in bundler
- **Package Manager**: npm

### Backend
- **Runtime**: Cloudflare Workers (V8 JavaScript engine)
- **Language**: TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **API Framework**: Native Fetch API handlers

### Infrastructure
- **Hosting**: Cloudflare Pages
- **CDN**: Cloudflare global network
- **Database**: Cloudflare D1 (distributed SQLite)
- **Domain**: Cloudflare DNS
- **SSL**: Automatic HTTPS via Cloudflare

### External Services
- **Book Data**: Google Books API (primary)
- **Fallback**: OpenLibrary API
- **Barcode Scanning**: Quagga.js library

## Design Principles

### 1. Serverless-First
- No server management required
- Automatic scaling
- Pay-per-use pricing model
- Global edge deployment

### 2. Progressive Enhancement
- Works without JavaScript (basic functionality)
- Camera scanning as enhancement
- Graceful fallbacks (localStorage ↔ API)
- Mobile-first responsive design

### 3. Data Ownership
- Complete data export functionality
- No vendor lock-in
- Transparent data storage
- User controls their library

### 4. Cost Optimization
- Cloudflare free tier sufficient for personal use
- Minimal API calls (cached book data)
- Efficient database queries
- Static asset optimization

## Data Flow

### Book Addition Flow
```
User scans ISBN
       ↓
Quagga.js detects barcode
       ↓
Fetch book data from Google Books API
       ↓
Display book details for confirmation
       ↓
User adds location/tags and saves
       ↓
POST to Cloudflare Worker
       ↓
Worker saves to D1 database
       ↓
Success response to frontend
```

### Library Viewing Flow
```
User opens library
       ↓
GET request to Worker API
       ↓
Worker queries D1 database
       ↓
Return JSON book list
       ↓
Frontend renders book cards
       ↓
User can filter/search locally
```

## Component Architecture

### Frontend Components
```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main app with tab navigation
│   └── globals.css         # Global styles
├── components/
│   ├── ISBNScanner.tsx     # Camera scanning + book entry
│   └── BookLibrary.tsx     # Book display + management
└── lib/
    ├── bookApi.ts          # External book data fetching
    └── api.ts              # Backend API communication
```

### Backend Structure
```
workers/
└── index.ts                # Main worker with all API endpoints

Schema:
└── schema.sql              # Database table definitions
```

## Database Design

### Books Table
```sql
books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn            TEXT NOT NULL,
  title           TEXT NOT NULL,
  authors         TEXT NOT NULL,    -- JSON array
  description     TEXT,
  thumbnail       TEXT,
  published_date  TEXT,
  categories      TEXT,             -- JSON array
  location        TEXT,
  tags            TEXT,             -- JSON array
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Design Decisions
- **JSON columns**: SQLite supports JSON for arrays (authors, categories, tags)
- **Text storage**: ISBN as text to preserve leading zeros
- **Indexes**: ISBN, location, and created_at for common queries
- **Flexibility**: Nullable fields for optional book metadata

## API Design

### RESTful Endpoints
- `GET /api/books` - List all books
- `POST /api/books` - Add new book
- `PUT /api/books/:id` - Update book (location/tags only)
- `DELETE /api/books/:id` - Remove book

### Design Decisions
- **Limited updates**: Only location and tags can be updated (book metadata is immutable)
- **CORS enabled**: Allows browser requests from any origin
- **Simple auth**: No authentication (suitable for personal use)
- **Error handling**: Consistent JSON error responses

## Security Considerations

### Data Protection
- **HTTPS only**: Camera API requires secure context
- **CORS policy**: Configured for browser access
- **No secrets**: No API keys stored in frontend
- **Input validation**: Server-side validation of all inputs

### Privacy
- **No tracking**: No analytics or user tracking
- **Local fallback**: Works offline with localStorage
- **Data export**: User owns and can export all data
- **ISBN only**: Only book ISBNs sent to external APIs

## Performance Optimizations

### Frontend
- **Static generation**: Next.js optimizes bundle size
- **Code splitting**: Automatic route-based splitting
- **Image optimization**: Next.js Image component
- **Local caching**: Browser storage for offline functionality

### Backend
- **Edge computing**: Workers run close to users globally
- **Database indexes**: Optimized queries for common operations
- **Connection pooling**: D1 handles database connections
- **Caching**: Static assets cached via Cloudflare CDN

### Network
- **Global CDN**: Cloudflare's global network
- **HTTP/2**: Modern protocol support
- **Compression**: Automatic asset compression
- **Caching headers**: Optimized cache policies

## Deployment Architecture

### Development
```
Local Machine
├── Next.js dev server (localhost:3000)
├── Wrangler dev server (localhost:8787)
└── Local D1 database (SQLite file)
```

### Production
```
Cloudflare Global Network
├── Pages (Static hosting)
├── Workers (API endpoints)
├── D1 (Distributed database)
└── CDN (Asset delivery)
```

## Monitoring and Observability

### Available Metrics
- **Workers Analytics**: Request volume, latency, errors
- **D1 Analytics**: Query performance, storage usage
- **Pages Analytics**: Traffic, performance metrics
- **Real User Monitoring**: Core Web Vitals

### Logging
- **Worker logs**: Via `wrangler tail`
- **Error tracking**: Console errors and API failures
- **Performance monitoring**: Built-in Cloudflare metrics

## Scalability Considerations

### Current Limits (Cloudflare Free Tier)
- **D1**: 25 GB storage, 5M reads, 100K writes/day
- **Workers**: 100K requests/day
- **Pages**: Unlimited static requests

### Growth Strategy
- **Vertical scaling**: Upgrade to paid Cloudflare plans
- **Horizontal scaling**: Multiple databases/workers if needed
- **Caching**: Add Redis for frequently accessed data
- **CDN**: Already leveraging global edge network

## Future Architecture Enhancements

### Potential Improvements
1. **Authentication**: Add user accounts and multi-tenancy
2. **Real-time updates**: WebSocket support for live updates
3. **Image storage**: Cloudflare Images for cover art
4. **Search enhancement**: Full-text search with R2 + Algolia
5. **Mobile app**: React Native version using same API
6. **Backup integration**: Automated backups to external storage