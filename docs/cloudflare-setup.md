# Cloudflare Setup Guide

This guide walks you through setting up the complete Cloudflare infrastructure for LibraryCard, including D1 database, Workers API, and Pages deployment.

## Prerequisites

1. **Cloudflare Account**: [Sign up for free](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI**: Install the Cloudflare CLI tool
   ```bash
   npm install -g wrangler
   ```
3. **Authentication**: Login to Cloudflare
   ```bash
   wrangler login
   ```

## Step 1: Database Setup

### Create D1 Database

1. **Create the database**:
   ```bash
   wrangler d1 create libarycard-db
   ```

2. **Save the database ID**: Copy the database ID from the output. You'll need it for the next step.

3. **Update wrangler.toml**: Replace `your-database-id-here` in `wrangler.toml` with your actual database ID:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "libarycard-db"
   database_id = "your-actual-database-id-here"
   ```

### Initialize Database Schema

1. **Apply the schema**:
   ```bash
   wrangler d1 execute libarycard-db --file=./schema.sql
   ```

2. **Verify the setup**:
   ```bash
   wrangler d1 execute libarycard-db --command="SELECT name FROM sqlite_master WHERE type='table';"
   ```
   You should see the `books` table listed.

## Step 2: Workers Setup

### Deploy the API Worker

1. **Navigate to workers directory**:
   ```bash
   cd workers
   ```

2. **Deploy the worker**:
   ```bash
   wrangler deploy
   ```

3. **Note the worker URL**: Save the worker URL from the deployment output. It will look like:
   ```
   https://libarycard-api.your-account.workers.dev
   ```

### Test the Worker

1. **Test the API endpoint**:
   ```bash
   curl https://libarycard-api.your-account.workers.dev/api/books
   ```
   You should receive an empty array: `[]`

## Step 3: Environment Configuration

### Create Environment File

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Update the API URL** in `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=https://libarycard-api.your-account.workers.dev
   ```

### Test Local Development

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Test the connection**: Visit `http://localhost:3000` and try scanning a book or entering an ISBN manually.

## Step 4: Pages Deployment

### Option A: Git Integration (Recommended)

1. **Go to Cloudflare Dashboard**:
   - Navigate to [Cloudflare Pages](https://dash.cloudflare.com/pages)
   - Click "Create a project"

2. **Connect your repository**:
   - Choose "Connect to Git"
   - Select your GitHub account and the `libarycard` repository

3. **Configure build settings**:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (leave empty)

4. **Set environment variables**:
   - Add `NEXT_PUBLIC_API_URL` with your worker URL
   - Value: `https://libarycard-api.your-account.workers.dev`

5. **Deploy**: Click "Save and Deploy"

### Option B: Direct Upload

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Upload via Wrangler**:
   ```bash
   wrangler pages deploy .next --project-name libarycard
   ```

## Step 5: Custom Domain (Optional)

### Add Custom Domain

1. **In Cloudflare Pages dashboard**:
   - Go to your LibraryCard project
   - Click "Custom domains" tab
   - Click "Set up a custom domain"

2. **Configure DNS**:
   - Add a CNAME record pointing to your Pages URL
   - Or use Cloudflare-managed DNS for automatic configuration

## Step 6: Worker Configuration (Advanced)

### Environment Variables

Set production environment variables for your worker:

```bash
wrangler secret put ENVIRONMENT --env production
# Enter: production

wrangler secret put API_KEY --env production
# Enter your API key if you add authentication later
```

### Custom Routes (Optional)

To use a custom domain for your API:

1. **Update wrangler.toml**:
   ```toml
   [env.production]
   routes = [
     { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
   ]
   ```

2. **Deploy with custom routes**:
   ```bash
   wrangler deploy --env production
   ```

## Verification Checklist

- [ ] D1 database created and schema applied
- [ ] Worker deployed and accessible
- [ ] API endpoints responding correctly
- [ ] Frontend deployed to Pages
- [ ] Environment variables configured
- [ ] Camera permissions working (HTTPS required)
- [ ] Book scanning and saving functional

## Troubleshooting

### Common Issues

1. **Database not found**: Verify the database ID in `wrangler.toml`
2. **CORS errors**: Check that your worker includes CORS headers
3. **Camera not working**: Ensure the site is served over HTTPS
4. **API calls failing**: Verify the `NEXT_PUBLIC_API_URL` environment variable

### Debug Commands

```bash
# Check worker logs
wrangler tail libarycard-api

# Test database connection
wrangler d1 execute libarycard-db --command="SELECT COUNT(*) FROM books;"

# Verify environment variables
wrangler pages deployment list --project-name libarycard
```

## Next Steps

After successful deployment:

1. **Test the full workflow**: Scan a book end-to-end
2. **Set up monitoring**: Consider adding analytics or error tracking
3. **Backup strategy**: Regularly export your library data
4. **Performance optimization**: Monitor API response times and database usage

## Cost Considerations

**Cloudflare Free Tier Limits**:
- D1: 25 GB storage, 5M reads, 100K writes per day
- Workers: 100K requests per day
- Pages: Unlimited static requests

These limits are generous for personal use. The app is designed to be cost-effective and should easily fit within free tier limits for typical personal library usage.