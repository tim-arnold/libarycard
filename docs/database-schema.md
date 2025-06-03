# Database Schema

LibraryCard uses Cloudflare D1, a distributed SQLite database, to store book information and user data.

## Table Structure

### Books Table

The main table storing all book information:

```sql
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  published_date TEXT,
  categories TEXT,
  location TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

Optimized indexes for common query patterns:

```sql
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_location ON books(location);
CREATE INDEX idx_books_created_at ON books(created_at);
```

## Column Details

### Primary Key
- **id**: Auto-incrementing integer primary key
  - Type: `INTEGER PRIMARY KEY AUTOINCREMENT`
  - Usage: Unique identifier for each book
  - Example: `1`, `2`, `3`

### Required Fields
- **isbn**: International Standard Book Number
  - Type: `TEXT NOT NULL`
  - Format: 13-digit string (stored as text to preserve leading zeros)
  - Example: `"9780451524935"`

- **title**: Book title
  - Type: `TEXT NOT NULL`
  - Example: `"1984"`

- **authors**: Book authors as JSON array
  - Type: `TEXT NOT NULL`
  - Format: JSON array of strings
  - Example: `["George Orwell"]`, `["J.R.R. Tolkien", "Christopher Tolkien"]`

### Optional Metadata
- **description**: Book description/summary
  - Type: `TEXT`
  - Source: Google Books API or OpenLibrary
  - Example: `"A dystopian social science fiction novel..."`

- **thumbnail**: Cover image URL
  - Type: `TEXT`
  - Source: Google Books or OpenLibrary
  - Example: `"https://books.google.com/books/content?id=kotPYEqx7kMC&printsec=frontcover&img=1&zoom=1&source=gbs_api"`

- **published_date**: Publication date
  - Type: `TEXT`
  - Format: Various (year, or full date)
  - Example: `"1949"`, `"2023-01-15"`

- **categories**: Book genres/categories as JSON array
  - Type: `TEXT`
  - Format: JSON array of strings
  - Source: Automatically detected from book APIs
  - Example: `["Fiction", "Dystopian", "Literature"]`

### User-Defined Fields
- **location**: Physical location of the book
  - Type: `TEXT`
  - Valid values: `"basement"`, `"julie's room"`, `"tim's room"`, `"bench"`, `"julie's office"`, `"little library"`
  - Example: `"basement"`

- **tags**: Custom user tags as JSON array
  - Type: `TEXT`
  - Format: JSON array of strings
  - Example: `["fiction", "classic", "read", "favorite"]`

### System Fields
- **created_at**: Record creation timestamp
  - Type: `DATETIME DEFAULT CURRENT_TIMESTAMP`
  - Format: ISO 8601 datetime
  - Example: `"2024-01-15T10:30:00Z"`

## Data Formats

### JSON Array Fields

Several fields store arrays as JSON strings:

#### Authors
```json
["George Orwell"]
["J.K. Rowling"]
["Douglas Adams", "Christopher Cerf"]
```

#### Categories
```json
["Fiction"]
["Science Fiction", "Humor"]
["History", "Biography", "Politics"]
```

#### Tags
```json
["fiction", "read"]
["reference", "cookbook", "favorite"]
["children", "picture-book", "library"]
```

## Query Examples

### Basic Queries

#### Get All Books
```sql
SELECT * FROM books ORDER BY created_at DESC;
```

#### Find Book by ISBN
```sql
SELECT * FROM books WHERE isbn = '9780451524935';
```

#### Books in Specific Location
```sql
SELECT * FROM books WHERE location = 'basement';
```

### JSON Queries

SQLite supports JSON functions for array fields:

#### Books by Specific Author
```sql
SELECT * FROM books 
WHERE JSON_EXTRACT(authors, '$[0]') = 'George Orwell'
   OR authors LIKE '%"George Orwell"%';
```

#### Books with Specific Tag
```sql
SELECT * FROM books 
WHERE tags LIKE '%"fiction"%';
```

#### Books in Specific Category
```sql
SELECT * FROM books 
WHERE categories LIKE '%"Science Fiction"%';
```

### Aggregation Queries

#### Count by Location
```sql
SELECT 
  location, 
  COUNT(*) as count 
FROM books 
WHERE location IS NOT NULL 
GROUP BY location 
ORDER BY count DESC;
```

#### Recent Additions
```sql
SELECT * FROM books 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Books Without Location
```sql
SELECT * FROM books 
WHERE location IS NULL OR location = '';
```

## Data Validation

### Application-Level Validation

The API validates data before insertion:

```typescript
// Required fields validation
if (!book.isbn || !book.title || !book.authors || book.authors.length === 0) {
  throw new Error('Missing required fields');
}

// ISBN format validation
if (!/^\d{13}$/.test(book.isbn)) {
  throw new Error('Invalid ISBN format');
}

// Location validation
const validLocations = [
  'basement', 
  "julie's room", 
  "tim's room", 
  'bench', 
  "julie's office", 
  'little library'
];
if (book.location && !validLocations.includes(book.location)) {
  throw new Error('Invalid location');
}
```

### Database Constraints

- `NOT NULL` constraints on required fields
- `PRIMARY KEY` ensures unique IDs
- Indexes improve query performance

## Migration Strategy

### Schema Updates

When updating the schema:

1. **Update schema.sql** with new structure
2. **Create migration script** for existing data
3. **Test locally** before production deployment
4. **Apply to production** during low-traffic periods

### Example Migration

Adding a new column:

```sql
-- Migration: Add reading_status column
ALTER TABLE books ADD COLUMN reading_status TEXT DEFAULT 'unread';

-- Update index if needed
CREATE INDEX idx_books_reading_status ON books(reading_status);
```

## Backup and Recovery

### Data Export

Export all data for backup:

```sql
-- Export as JSON (application level)
SELECT json_group_array(
  json_object(
    'id', id,
    'isbn', isbn,
    'title', title,
    'authors', json(authors),
    'description', description,
    'thumbnail', thumbnail,
    'published_date', published_date,
    'categories', json(categories),
    'location', location,
    'tags', json(tags),
    'created_at', created_at
  )
) FROM books;
```

### Data Import

Restore from backup:

```sql
-- Insert individual records
INSERT INTO books (
  isbn, title, authors, description, thumbnail, 
  published_date, categories, location, tags
) VALUES (
  '9780451524935',
  '1984',
  '["George Orwell"]',
  'A dystopian novel...',
  'https://...',
  '1949',
  '["Fiction", "Dystopian"]',
  'basement',
  '["classic", "read"]'
);
```

## Performance Considerations

### Index Usage

- **ISBN lookups**: Use `idx_books_isbn` for duplicate detection
- **Location filtering**: Use `idx_books_location` for room-based queries
- **Recent books**: Use `idx_books_created_at` for chronological sorting

### Query Optimization

- Use `LIMIT` for large result sets
- Index frequently queried columns
- Avoid `SELECT *` when possible
- Use prepared statements for parameterized queries

### Storage Limits

Cloudflare D1 limits (free tier):
- **Storage**: 25 GB total
- **Reads**: 5 million per day
- **Writes**: 100,000 per day

Estimated capacity:
- ~250,000 books (assuming 100KB average per book with metadata)
- Suitable for extensive personal libraries

## Security Considerations

### SQL Injection Prevention

- Always use prepared statements
- Validate input parameters
- Escape special characters in JSON

### Data Privacy

- No personal information stored
- Only book metadata and user-defined locations/tags
- ISBN numbers are public information
- Export functionality gives users control of their data

## Future Schema Enhancements

### Potential Additions

1. **User Management**
   ```sql
   CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     email TEXT UNIQUE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Add user_id to books table
   ALTER TABLE books ADD COLUMN user_id INTEGER REFERENCES users(id);
   ```

2. **Reading Progress**
   ```sql
   CREATE TABLE reading_sessions (
     id INTEGER PRIMARY KEY,
     book_id INTEGER REFERENCES books(id),
     started_at DATETIME,
     finished_at DATETIME,
     rating INTEGER CHECK(rating >= 1 AND rating <= 5),
     notes TEXT
   );
   ```

3. **Book Lending**
   ```sql
   CREATE TABLE loans (
     id INTEGER PRIMARY KEY,
     book_id INTEGER REFERENCES books(id),
     borrower_name TEXT,
     loaned_at DATETIME,
     returned_at DATETIME
   );
   ```

4. **Full-Text Search**
   ```sql
   -- SQLite FTS5 for better search
   CREATE VIRTUAL TABLE books_fts USING fts5(
     title, 
     authors, 
     description, 
     content='books'
   );
   ```