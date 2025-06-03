# API Reference

This document describes the LibraryCard API endpoints provided by the Cloudflare Worker.

## Base URL

```
https://libarycard-api.your-account.workers.dev
```

## Authentication

Currently, the API does not require authentication. Consider adding API keys or authentication for production use.

## Endpoints

### GET /api/books

Retrieve all books in the library.

#### Request
```http
GET /api/books
```

#### Response
```json
[
  {
    "id": 1,
    "isbn": "9780123456789",
    "title": "Example Book",
    "authors": ["John Doe", "Jane Smith"],
    "description": "An example book description...",
    "thumbnail": "https://covers.openlibrary.org/b/id/123-M.jpg",
    "published_date": "2023",
    "categories": ["Fiction", "Mystery"],
    "location": "basement",
    "tags": ["fiction", "favorite"],
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Status Codes
- `200 OK`: Success
- `500 Internal Server Error`: Database error

---

### POST /api/books

Add a new book to the library.

#### Request
```http
POST /api/books
Content-Type: application/json

{
  "isbn": "9780123456789",
  "title": "Example Book",
  "authors": ["John Doe", "Jane Smith"],
  "description": "An example book description...",
  "thumbnail": "https://covers.openlibrary.org/b/id/123-M.jpg",
  "published_date": "2023",
  "categories": ["Fiction", "Mystery"],
  "location": "basement",
  "tags": ["fiction", "favorite"]
}
```

#### Required Fields
- `isbn`: String - The book's ISBN
- `title`: String - Book title
- `authors`: Array of strings - Book authors

#### Optional Fields
- `description`: String - Book description
- `thumbnail`: String - Cover image URL
- `published_date`: String - Publication date
- `categories`: Array of strings - Book categories/genres
- `location`: String - Physical location
- `tags`: Array of strings - Custom tags

#### Response
```json
{
  "success": true
}
```

#### Status Codes
- `200 OK`: Book added successfully
- `400 Bad Request`: Invalid request data
- `500 Internal Server Error`: Database error

---

### PUT /api/books/:id

Update an existing book.

#### Request
```http
PUT /api/books/1
Content-Type: application/json

{
  "location": "julie's room",
  "tags": ["fiction", "read", "favorite"]
}
```

#### Updatable Fields
- `location`: String - Physical location
- `tags`: Array of strings - Custom tags

#### Response
```json
{
  "success": true
}
```

#### Status Codes
- `200 OK`: Book updated successfully
- `404 Not Found`: Book ID not found
- `400 Bad Request`: Invalid request data
- `500 Internal Server Error`: Database error

---

### DELETE /api/books/:id

Remove a book from the library.

#### Request
```http
DELETE /api/books/1
```

#### Response
```json
{
  "success": true
}
```

#### Status Codes
- `200 OK`: Book deleted successfully
- `404 Not Found`: Book ID not found
- `500 Internal Server Error`: Database error

## Data Types

### Book Object

```typescript
interface Book {
  id?: number;              // Auto-generated ID
  isbn: string;             // 13-digit ISBN
  title: string;            // Book title
  authors: string[];        // Array of author names
  description?: string;     // Book description
  thumbnail?: string;       // Cover image URL
  published_date?: string;  // Publication date
  categories?: string[];    // Genres/categories
  location?: string;        // Physical location
  tags?: string[];          // Custom tags
  created_at?: string;      // Timestamp (auto-generated)
}
```

### Location Values

Valid location strings:
- `"basement"`
- `"julie's room"`
- `"tim's room"`
- `"bench"`
- `"julie's office"`
- `"little library"`

## Error Responses

### General Error Format
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `INVALID_REQUEST`: Malformed request
- `MISSING_REQUIRED_FIELD`: Required field not provided
- `BOOK_NOT_FOUND`: Book ID doesn't exist
- `DATABASE_ERROR`: Internal database error

## CORS

The API includes CORS headers to allow browser requests:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production use.

## Examples

### Adding a Book
```bash
curl -X POST https://libarycard-api.your-account.workers.dev/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "9780451524935",
    "title": "1984",
    "authors": ["George Orwell"],
    "description": "A dystopian social science fiction novel...",
    "categories": ["Fiction", "Dystopian"],
    "location": "basement",
    "tags": ["classic", "dystopian"]
  }'
```

### Getting All Books
```bash
curl https://libarycard-api.your-account.workers.dev/api/books
```

### Updating Book Location
```bash
curl -X PUT https://libarycard-api.your-account.workers.dev/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{
    "location": "julie'\''s room",
    "tags": ["classic", "dystopian", "read"]
  }'
```

### Deleting a Book
```bash
curl -X DELETE https://libarycard-api.your-account.workers.dev/api/books/1
```

## Database Schema

The API uses this SQLite schema:

```sql
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,     -- JSON array
  description TEXT,
  thumbnail TEXT,
  published_date TEXT,
  categories TEXT,          -- JSON array
  location TEXT,
  tags TEXT,               -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Future Enhancements

Potential API improvements:
- Authentication/authorization
- Rate limiting
- Pagination for large libraries
- Advanced search endpoints
- Bulk operations
- Reading status tracking
- Book recommendations