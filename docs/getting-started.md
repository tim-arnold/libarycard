# Getting Started with LibraryCard

LibraryCard is a personal book library management system that lets you scan ISBN barcodes to automatically catalog your books with location tracking and custom tagging.

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

### 📱 ISBN Scanning
- Use your phone's camera to scan book barcodes
- Automatic book data retrieval from Google Books API
- OpenLibrary fallback for better coverage
- Manual ISBN entry option

### 📚 Book Management
- Automatic title, author, and description fetching
- Cover image display
- Publication date and category information
- Search and filter functionality

### 🏠 Location Tracking
Pre-configured locations:
- basement
- julie's room
- tim's room
- bench
- julie's office
- little library

### 🏷️ Custom Tagging
- Add your own tags (fiction, mystery, favorite, etc.)
- Filter books by tags
- Export library data

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