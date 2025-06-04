# LibaryCard 📚

A personal book collection management app that allows you to scan ISBN barcodes to automatically add books to your digital library.

## Features

- 📱 **ISBN Scanning**: Use your phone's camera to scan book barcodes
- 📖 **Book Management**: Automatically fetch book details from Google Books API
- 🏠 **Location Tracking**: Tag books with physical locations (basement, rooms, etc.)
- 🏷️ **Custom Tags**: Add your own tags for better organization
- 🔍 **Search & Filter**: Find books by title, author, location, or category
- 📊 **Library Overview**: See distribution of books across locations
- 💾 **Export**: Download your library as JSON

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Scanning**: Quagga.js for barcode detection
- **Database**: Cloudflare D1 (SQLite)
- **API**: Cloudflare Workers
- **Hosting**: Netlify (Frontend) + Cloudflare Workers (API)
- **Book Data**: Google Books API + OpenLibrary fallback

## Deployment

### Prerequisites

1. Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. Authenticate with Cloudflare: `wrangler login`

### Database Setup

1. Create a D1 database:
   \`\`\`bash
   wrangler d1 create libarycard-db
   \`\`\`

2. Update \`wrangler.toml\` with your database ID

3. Initialize the database schema:
   \`\`\`bash
   wrangler d1 execute libarycard-db --file=./schema.sql
   \`\`\`

### Worker Deployment

1. Deploy the API worker:
   \`\`\`bash
   cd workers
   wrangler deploy
   \`\`\`

2. Note the worker URL for frontend configuration

### Frontend Deployment

1. Create \`.env.local\`:
   \`\`\`
   NEXT_PUBLIC_API_URL=https://api.libarycard.tim52.io
   \`\`\`

2. Build the frontend:
   \`\`\`bash
   npm run build
   \`\`\`

3. Deploy to Cloudflare Pages:
   - Connect your GitHub repo to Cloudflare Pages
   - Set build command: \`npm run build\`
   - Set output directory: \`out\` (if using static export)
   - Add environment variable: \`NEXT_PUBLIC_API_URL\`

## Local Development

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. For local API development:
   \`\`\`bash
   wrangler dev workers/index.ts
   \`\`\`

## Book Locations

The app comes pre-configured with these locations:
- basement
- julie's room
- tim's room
- bench
- julie's office
- little library

You can modify these in \`src/components/ISBNScanner.tsx\` and \`src/components/BookLibrary.tsx\`.

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!