# Getting Started with LibaryCard

LibaryCard is a personal book library management system that lets you scan ISBN barcodes to automatically catalog your books with location tracking and custom tagging.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tim-arnold/libarycard.git
cd libarycard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env.local
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app running locally.

## Local vs Production Setup

### Local Development
- Uses localStorage for data persistence
- Works offline
- Good for testing and development
- Camera scanning works on localhost

### Production Setup
- Uses Cloudflare D1 database
- Data synced across devices
- Requires Cloudflare Workers deployment
- Better performance and reliability

## Core Features

LibaryCard is a sophisticated library management platform with comprehensive features:

### 📱 Book Scanning & Management
- **ISBN Scanning**: Camera-based barcode scanning with Google Books API integration
- **Bookshelf Photo Scanning**: OCR technology to scan entire bookshelves at once (80-90% accuracy)
- **Manual Entry**: ISBN entry option with automatic book data retrieval
- **Enhanced Metadata**: Title, author, description, cover images, publication dates, and categories

### 👥 Multi-User Support
- **Authentication**: Google OAuth + email/password with email verification
- **Role-Based Permissions**: Admin and user roles with appropriate access controls
- **User Management**: Invitation system for shared libraries
- **Book Checkout System**: Track who has borrowed books with history

### 🏠 Library Organization
- **Multi-Location Support**: Organize books across different physical locations
- **Shelf Management**: Create and manage shelves within locations
- **Smart UX**: Simplified interface for single-shelf users
- **Advanced Features**: Book removal requests, pagination, duplicate detection

### 🎨 Modern Interface
- **Material UI Design**: Professional, accessible interface with WCAG compliance
- **Dark Mode Support**: Toggle between light and dark themes
- **Responsive Design**: Mobile-first design that works on all devices
- **Search & Filtering**: Advanced book discovery and organization tools

## Browser Requirements

### Camera Access
- **HTTPS Required**: Camera only works on HTTPS or localhost
- **Permissions**: Browser will request camera access
- **Mobile Friendly**: Optimized for phone cameras

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Data Storage

### Local Development
- Data stored in browser localStorage
- Persists across browser sessions
- Export functionality available

### Production
- Data stored in Cloudflare D1 database
- Accessible from any device
- Automatic backup through Cloudflare

## Next Steps

1. **Test locally**: Try scanning a book or entering an ISBN
2. **Deploy to production**: Follow the [Cloudflare Setup Guide](./cloudflare-setup.md)
3. **Customize locations**: Update location lists in the components
4. **Add books**: Start building your digital library!

## Common Use Cases

### New Book Acquisition
1. Scan ISBN with phone camera
2. Verify book details
3. Select physical location
4. Add custom tags
5. Save to library

### Book Organization
1. Use location filter to see books by room
2. Search by title or author
3. Update book locations as needed
4. Add tags for better categorization

### Library Management
1. Export library data for backup
2. Browse by category or genre
3. Track reading progress with tags
4. Maintain physical organization

## Tips for Best Results

### Scanning
- Ensure good lighting
- Hold camera steady
- Position barcode clearly in frame
- Use manual entry if scanning fails

### Organization
- Be consistent with location names
- Use descriptive tags
- Regular data exports for backup
- Keep physical and digital libraries in sync

## Troubleshooting

See the [Troubleshooting Guide](./troubleshooting.md) for common issues and solutions.