# Troubleshooting Guide

This guide covers common issues you might encounter while using or deploying LibraryCard.

## OCR and Bookshelf Scanning Issues

### OCR Not Working - "Private key missing from credentials"

#### Symptoms
- Bookshelf photo scanning fails
- Error: "OCR processing failed: Private key missing from credentials"
- Google Vision API returning 500 errors

#### Root Cause
This error occurs when OAuth client credentials are configured instead of service account credentials.

#### Solution
1. **Check Current Credentials Type**
   ```bash
   # Test the OCR endpoint to see error details
   curl -X POST https://api.librarycard.tim52.io/api/ocr-vision \
     -H "Content-Type: application/json" \
     -d '{"image": "data:image/png;base64,test"}'
   ```

2. **Create Service Account Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Create a new service account or use existing one
   - Generate a new JSON key file (service account credentials)

3. **Enable Google Vision API**
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable" if not already enabled

4. **Update Cloudflare Worker Secret**
   ```bash
   # Navigate to workers directory
   cd workers
   
   # Set the service account credentials
   cat /path/to/service-account.json | npx wrangler secret put GOOGLE_APPLICATION_CREDENTIALS_JSON
   ```

5. **Verify the Fix**
   ```bash
   curl -X POST https://api.librarycard.tim52.io/api/ocr-vision \
     -H "Content-Type: application/json" \
     -d '{"image": "data:image/png;base64,test"}'
   # Should return: {"detectedText":[],"processedCount":0}
   ```

#### Expected Credential Format
Service account JSON should contain:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  ...
}
```

**NOT** OAuth client credentials with:
```json
{
  "client_id": "...",
  "client_secret": "...",
  "redirect_uris": [...],
  "javascript_origins": [...]
}
```

## Camera and Scanning Issues

### Camera Not Working

#### Symptoms
- "Camera access denied" error
- Black screen when starting scanner
- No camera button/option available

#### Solutions

1. **Check HTTPS Requirement**
   - Camera API only works on HTTPS or localhost
   - Ensure you're accessing via `https://` not `http://`
   - For local development, use `http://localhost:3000`

2. **Browser Permissions**
   ```bash
   # Check browser settings:
   # Chrome: Settings > Privacy > Camera
   # Firefox: Preferences > Privacy > Camera
   # Safari: Preferences > Websites > Camera
   ```
   - Allow camera access for your domain
   - Try refreshing the page after granting permissions

3. **Browser Compatibility**
   - Chrome 60+ (recommended)
   - Firefox 55+
   - Safari 11+
   - Edge 79+

4. **Device Issues**
   - Ensure camera is not being used by another app
   - Try closing other tabs/applications using camera
   - Restart browser if needed

### Barcode Scanning Not Working

#### Symptoms
- Camera works but doesn't detect barcodes
- "No barcode detected" message
- Scanner runs but never triggers

#### Solutions

1. **Lighting Conditions**
   - Ensure good lighting on the barcode
   - Avoid glare or shadows
   - Try different angles

2. **Barcode Quality**
   - Ensure barcode is clean and undamaged
   - Try different books if available
   - Some very old books may have incompatible barcodes

3. **Camera Position**
   - Hold camera steady
   - Position barcode clearly in frame
   - Maintain appropriate distance (6-12 inches)
   - Ensure barcode fills a good portion of the camera view

4. **Fallback to Manual Entry**
   - Use the "Or enter ISBN manually" field
   - Type the 13-digit number below the barcode
   - Remove any dashes or spaces

## API and Backend Issues

### Books Not Saving

#### Symptoms
- "Failed to save book" error message
- Books disappear after refresh
- Network errors in console

#### Solutions

1. **Check API Connection**
   ```bash
   # Test API endpoint directly
   curl https://api.librarycard.tim52.io/api/books
   ```

2. **Verify Environment Variables**
   - Check `NEXT_PUBLIC_API_URL` in your deployment
   - Ensure it points to your actual worker URL
   - No trailing slash in the URL

3. **CORS Issues**
   - Worker should include CORS headers
   - Check browser console for CORS errors
   - Verify worker deployment is successful

4. **Database Connection**
   ```bash
   # Check database status
   wrangler d1 execute librarycard-db --command="SELECT COUNT(*) FROM books;"
   ```

### Worker Deployment Issues

#### Symptoms
- "Worker not found" errors
- 500 Internal Server Error from API
- Deployment failures

#### Solutions

1. **Database Configuration**
   - Verify database ID in `wrangler.toml`
   - Ensure database exists: `wrangler d1 list`
   - Check database binding name matches code

2. **Worker Deployment**
   ```bash
   # Redeploy worker
   cd workers
   wrangler deploy
   
   # Check worker status
   wrangler tail librarycard-api
   ```

3. **Schema Issues**
   ```bash
   # Reapply schema if needed
   wrangler d1 execute librarycard-db --file=./schema.sql
   ```

## Frontend Issues

### App Not Loading

#### Symptoms
- Blank white screen
- JavaScript errors in console
- Next.js build errors

#### Solutions

1. **Clear Cache**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Dependency Issues**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **TypeScript Errors**
   ```bash
   # Check for type errors
   npm run typecheck
   ```

### Books Not Displaying

#### Symptoms
- Library shows "No books found"
- Recently added books don't appear
- Loading states persist

#### Solutions

1. **Check Local Storage**
   - Open browser DevTools → Application → Local Storage
   - Look for 'library' key
   - Clear if corrupted: `localStorage.clear()`

2. **API Response Issues**
   - Check Network tab in DevTools
   - Verify API returns valid JSON
   - Check for authentication errors

3. **Component State Issues**
   - Refresh the page
   - Check browser console for React errors
   - Try adding a book to see if state updates

## Deployment Issues

### Cloudflare Pages Deployment

#### Symptoms
- Build failures
- Environment variables not working
- Static assets not loading

#### Solutions

1. **Build Configuration**
   ```yaml
   # Verify Pages settings:
   Build command: npm run build
   Build output directory: .next
   Root directory: / (empty)
   ```

2. **Environment Variables**
   - Add `NEXT_PUBLIC_API_URL` in Pages dashboard
   - Ensure variable is available in build environment
   - Redeploy after adding variables

3. **Node.js Version**
   - Set Node.js version in Pages environment
   - Use compatible version (16+)

### Database Migration Issues

#### Symptoms
- "Table doesn't exist" errors
- Old schema conflicts
- Data loss after updates

#### Solutions

1. **Schema Verification**
   ```bash
   # Check current schema
   wrangler d1 execute librarycard-db --command="PRAGMA table_info(books);"
   ```

2. **Manual Migration**
   ```bash
   # Backup data first
   wrangler d1 execute librarycard-db --command="SELECT * FROM books;" > backup.json
   
   # Reapply schema
   wrangler d1 execute librarycard-db --file=./schema.sql
   ```

## Performance Issues

### Slow Loading

#### Symptoms
- Long loading times
- Timeouts
- Poor responsiveness

#### Solutions

1. **Database Performance**
   - Check query efficiency
   - Verify indexes are in place
   - Monitor D1 analytics in dashboard

2. **Network Issues**
   - Check Cloudflare analytics
   - Verify CDN is working
   - Test from different locations

3. **Frontend Optimization**
   - Check bundle size
   - Optimize images
   - Use React DevTools Profiler

### Camera Performance

#### Symptoms
- Slow camera startup
- Laggy video feed
- High CPU usage

#### Solutions

1. **Reduce Camera Resolution**
   - Modify Quagga.js settings in scanner component
   - Lower resolution for better performance

2. **Browser Optimization**
   - Close unnecessary tabs
   - Disable other browser extensions
   - Try incognito mode

## Book Data Issues

### Book Not Found

#### Symptoms
- "Book not found for this ISBN" message
- Empty or incomplete book data
- Wrong book information

#### Solutions

1. **ISBN Verification**
   - Verify 13-digit ISBN is correct
   - Try with and without dashes
   - Check if it's a valid ISBN-13 format

2. **API Fallbacks**
   - Google Books API is primary source
   - OpenLibrary is automatic fallback
   - Some very old or obscure books may not be found

3. **Manual Entry**
   - Add book with basic information manually
   - Edit details later if needed
   - Use custom tags for organization

### Incorrect Book Data

#### Symptoms
- Wrong title or author
- Incorrect cover image
- Missing description

#### Solutions

1. **ISBN Accuracy**
   - Double-check the ISBN matches the book
   - Some reprints have different ISBNs
   - International editions may vary

2. **Multiple Editions**
   - Same book may have multiple ISBNs
   - Choose the most accurate match
   - Use tags to note edition differences

## Browser-Specific Issues

### Safari Issues

#### Common Problems
- Camera permissions more restrictive
- localStorage size limits
- Service worker limitations

#### Solutions
- Enable camera in Safari preferences
- Test in different browsers for comparison
- Clear Safari data if needed

### Mobile Browser Issues

#### Common Problems
- Camera orientation
- Touch interface problems
- Performance on older devices

#### Solutions
- Use portrait mode for scanning
- Ensure responsive design works
- Test on actual devices when possible

## Getting Additional Help

### Diagnostic Information

When reporting issues, include:

1. **Browser and Version**
   ```javascript
   navigator.userAgent
   ```

2. **Console Errors**
   - Open DevTools Console
   - Copy any error messages
   - Include full stack traces

3. **Network Information**
   - Check Network tab in DevTools
   - Note failed requests
   - Include response codes and messages

4. **Environment Details**
   - Local development vs production
   - Cloudflare dashboard error logs
   - Worker deployment status

### Debug Mode

Enable additional logging:

```javascript
// Add to local development
localStorage.setItem('debug', 'true');
```

### Useful Commands

```bash
# Check worker logs
wrangler tail librarycard-api

# Test database
wrangler d1 execute librarycard-db --command="SELECT COUNT(*) FROM books;"

# Verify deployment
curl -I https://librarycard.tim52.io

# Check DNS
nslookup librarycard.tim52.io
```

### Recovery Procedures

#### Complete Reset

If all else fails:

1. **Export data** (if possible)
2. **Delete and recreate D1 database**
3. **Redeploy worker**
4. **Redeploy frontend**
5. **Import data back**

#### Data Recovery

```bash
# Export from localStorage (browser console)
JSON.stringify(JSON.parse(localStorage.getItem('library')))

# Import to database (manual process)
# Use API endpoints to recreate books
```

Remember: Always backup your library data regularly using the export feature!