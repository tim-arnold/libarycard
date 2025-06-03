# User Guide

This guide covers how to use LibaryCard to manage your personal book collection.

## Getting Started

### Sign In
1. Visit the LibaryCard app
2. Click **"Sign in with Google"**
3. Grant permissions to access your email for account identification
4. You'll be redirected to your personal library

### Main Interface

The app has three main sections accessible via the top navigation:

- **📱 Scan Books**: Add new books to your library using camera or manual entry
- **📖 My Library**: Browse and manage your book collection
- **🏠 Location Management**: Organize your physical locations and shelves

## Adding Books

### Method 1: Camera Scanning

1. Click **"📱 Scan Books"** tab
2. Click **"Start Camera Scanner"** button
3. Allow camera permissions when prompted
4. Position your phone camera over the book's barcode
5. Hold steady until the ISBN is detected
6. Book details will automatically load

### Method 2: Manual Entry

1. In the Scan Books section
2. Use the **"Or enter ISBN manually"** field
3. Type the 13-digit ISBN (numbers only)
4. Click **"Look Up Book"**

### Completing the Book Entry

After scanning or manual lookup:

1. **Verify Details**: Check that title, author, and cover are correct
2. **Select Shelf**: Choose from the organized dropdown menu showing:
   - Your locations (e.g., "Home", "Office")
   - Shelves within each location (e.g., "my first shelf", "Fiction", "Reference")
3. **Add Tags** (optional): Enter comma-separated tags like "fiction, mystery, favorite"
4. Click **"Save to Library"**

*Note: If you don't have any locations yet, you'll need to create one first in Location Management.*

## Location Management

### Creating Your First Location

When you first use LibaryCard, you'll need to set up at least one location:

1. Click **"🏠 Location Management"** tab
2. Click **"Create Your First Location"** button
3. Enter a **Location Name** (e.g., "Home", "Office", "Apartment")
4. Add an optional **Description**
5. Click **"Create Location"**

Each new location automatically gets a starter shelf called "my first shelf" that you can rename or organize as needed.

### Managing Locations

#### Adding More Locations
1. In Location Management, click **"+ Add Location"**
2. Enter location name and description
3. Click **"Create Location"**

#### Editing Locations
1. Find the location card
2. Click the **"Edit"** button
3. Update name or description
4. Click **"Update Location"**

#### Deleting Locations
1. Find the location card
2. Click the **"Delete"** button
3. Confirm deletion (this will also delete all shelves in that location)

### Managing Shelves

#### Adding Shelves
1. Select a location by clicking on its card
2. In the "Shelves" section, click **"+ Add Shelf"**
3. Enter shelf name (e.g., "Fiction", "Cookbooks", "Reference")
4. Click **"Add Shelf"**

#### Editing Shelves
1. Find the shelf you want to edit
2. Click the **"Edit"** button on the shelf card
3. Update the shelf name
4. Click **"Update Shelf"**

#### Deleting Shelves
1. Find the shelf you want to remove
2. Click the **"Delete"** button on the shelf card
3. Confirm deletion

*Note: Deleting a shelf won't delete the books - they'll become unassigned and you can move them to other shelves.*

### Organization Tips

#### Location Naming
- Use clear, descriptive names: "Home Library", "Office", "Beach House"
- Be consistent with naming conventions
- Consider grouping by building or area

#### Shelf Organization
- Start with broad categories: "Fiction", "Non-Fiction", "Reference"
- Create specific shelves as your collection grows: "Sci-Fi", "Cookbooks", "Biography"
- Consider organizing by: genre, author, subject, reading status, or physical arrangement

## Managing Your Library

### Library Overview

The **"📖 My Library"** section shows:
- Total number of books
- Books distributed by location (visual summary)
- Search and filter options
- Complete book collection

### Search and Filtering

#### Search Box
- Search by book title
- Search by author name
- Search by ISBN

#### Location Filter
- Filter to show books in specific locations
- Use "All locations" to see everything

#### Category Filter
- Filter by book genres/categories
- Categories are automatically detected from book data

### Book Cards

Each book is displayed with:
- **Cover image** (when available)
- **Title and author**
- **Publication date**
- **Categories/genres**
- **Current location**
- **Custom tags**
- **ISBN**

### Updating Books

#### Change Location
1. Find the book in your library
2. Use the location dropdown on the book card
3. Select new location
4. Changes save automatically

#### Remove Books
1. Find the book you want to remove
2. Click the red **"Remove"** button
3. Confirm deletion when prompted

## Library Statistics

### Books by Location
The top of the library page shows how many books are in each location:
- Helps you see distribution across rooms
- Quick way to find heavily stocked areas
- Useful for planning organization

## Export and Backup

### Export Library
1. Go to **"📖 My Library"**
2. Click **"Export Library"** button (top right)
3. Downloads a JSON file with all your book data
4. Use this for backup or data portability

### Import (Manual Process)
While there's no built-in import, you can:
1. Restore from backup by manually adding books
2. Use the JSON export format if building custom tools

## Tips for Effective Organization

### Location Strategy
- Be consistent with location names
- Update locations when you move books
- Use logical, memorable location names

### Tagging Best Practices
- Use consistent tag formats
- Common useful tags:
  - **Genre**: fiction, non-fiction, mystery, sci-fi
  - **Status**: read, unread, favorite, loaned
  - **Topic**: cooking, history, reference, textbook
  - **Condition**: new, used, rare

### Search Tips
- Search is case-insensitive
- Partial matches work for titles and authors
- Use specific terms for better results

## Mobile Usage

### Camera Scanning
- Works best with phone cameras
- Ensure good lighting
- Hold phone steady
- Position barcode clearly in camera view
- Portrait orientation recommended

### Touch Interface
- All buttons are touch-friendly
- Dropdowns work with touch
- Scrolling works on long library lists

## Troubleshooting Common Issues

### Book Not Found
- Try manual ISBN entry
- Check if ISBN is correct (13 digits)
- Some very old books may not be in databases
- Consider adding manually with basic info

### Camera Issues
- Ensure you're on HTTPS (required for camera access)
- Check browser permissions for camera
- Try refreshing the page
- Use manual entry as backup

### Location/Tag Updates Not Saving
- Check your internet connection
- Ensure you selected a valid location
- Try refreshing and updating again

### Slow Performance
- Large libraries (1000+ books) may load slowly
- Use filters to reduce displayed books
- Regular exports help with data management

## Data Privacy

### Local vs Cloud Storage
- **Local Development**: Data stays in your browser
- **Production**: Data stored in Cloudflare D1 database
- **No Analytics**: App doesn't track usage
- **Export Control**: You own your data and can export anytime

### Book Data Sources
- Google Books API (primary)
- OpenLibrary (fallback)
- No personal reading data is shared
- Only ISBN lookups are performed