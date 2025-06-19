/**
 * Migration script to populate missing publication dates for existing books
 * This script fetches publication dates from Google Books API and updates the database
 * Uses the free Google Books API (same as the frontend)
 */

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Helper function to delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to search for book by title and author
async function searchBookByTitleAuthor(title, authors) {
  const query = `intitle:"${title}" inauthor:"${authors.join(' ')}"`;
  const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      // Find the best match (exact title match preferred)
      const exactMatch = data.items.find(item => 
        item.volumeInfo.title?.toLowerCase() === title.toLowerCase()
      );
      
      const book = exactMatch || data.items[0];
      return book.volumeInfo.publishedDate || null;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error searching for book "${title}":`, error.message);
    return null;
  }
}

// Function to search by ISBN if available
async function searchBookByISBN(isbn) {
  if (!isbn) return null;
  
  const url = `${GOOGLE_BOOKS_API}?q=isbn:${isbn}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0].volumeInfo.publishedDate || null;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error searching for ISBN "${isbn}":`, error.message);
    return null;
  }
}

// Main migration function
async function migratePublicationDates() {
  const { execSync } = await import('child_process');
  
  console.log('🔍 Fetching books with missing publication dates...');
  
  // Get books with null published_date
  const getBooksCommand = `npx wrangler d1 execute librarycard-db --remote --command "SELECT id, isbn, title, authors FROM books WHERE published_date IS NULL;"`;
  
  let booksResult;
  try {
    const output = execSync(getBooksCommand, { encoding: 'utf8' });
    console.log('Raw wrangler output:', output);
    
    // Parse the JSON output from wrangler - look for the results array
    const lines = output.split('\n');
    const jsonStart = lines.findIndex(line => line.trim().startsWith('['));
    
    if (jsonStart === -1) {
      console.error('❌ Could not find JSON output in wrangler response');
      return;
    }
    
    // Join all lines from the JSON start to get complete JSON
    const jsonLines = lines.slice(jsonStart);
    const jsonString = jsonLines.join('\n').trim();
    booksResult = JSON.parse(jsonString);
  } catch (error) {
    console.error('❌ Failed to fetch books from database:', error.message);
    return;
  }
  
  const books = booksResult[0]?.results || [];
  
  if (books.length === 0) {
    console.log('✅ No books found with missing publication dates');
    return;
  }
  
  console.log(`📚 Found ${books.length} books with missing publication dates`);
  console.log('🔄 Starting migration...\n');
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const authors = book.authors ? JSON.parse(book.authors) : [];
    
    console.log(`📖 Processing ${i + 1}/${books.length}: "${book.title}" by ${authors.join(', ')}`);
    
    // Try ISBN first, then title/author search
    let publicationDate = null;
    
    if (book.isbn) {
      console.log(`   🔍 Searching by ISBN: ${book.isbn}`);
      publicationDate = await searchBookByISBN(book.isbn);
      await delay(100); // Rate limiting
    }
    
    if (!publicationDate && book.title && authors.length > 0) {
      console.log(`   🔍 Searching by title and author...`);
      publicationDate = await searchBookByTitleAuthor(book.title, authors);
      await delay(100); // Rate limiting
    }
    
    if (publicationDate) {
      // Update the database
      const updateCommand = `npx wrangler d1 execute librarycard-db --remote --command "UPDATE books SET published_date = '${publicationDate}' WHERE id = ${book.id};"`;
      
      try {
        execSync(updateCommand, { encoding: 'utf8' });
        console.log(`   ✅ Updated with publication date: ${publicationDate}`);
        updatedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to update database: ${error.message}`);
        skippedCount++;
      }
    } else {
      console.log(`   ⚠️  No publication date found`);
      skippedCount++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🎉 Migration completed!');
  console.log(`✅ Updated: ${updatedCount} books`);
  console.log(`⚠️  Skipped: ${skippedCount} books`);
}

// Run the migration
migratePublicationDates().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});