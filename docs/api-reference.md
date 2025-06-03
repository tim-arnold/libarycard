# API Reference

This document describes the LibaryCard API endpoints provided by the Cloudflare Worker.

## Base URL

```
https://libarycard-api.tim-arnold.workers.dev
```

## Authentication

The API uses Bearer token authentication with user email as the token for development. In production, this would be replaced with proper JWT tokens from NextAuth.

All endpoints (except user creation) require authentication:

```http
Authorization: Bearer user@example.com
```

## User Management

### POST /api/users

Create or update a user account. This is called automatically when users sign in with Google OAuth.

#### Request
```http
POST /api/users
Content-Type: application/json

{
  "id": "user@example.com",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### Response
```json
{
  "success": true
}
```

## Location Management

### GET /api/locations

Get all locations accessible to the authenticated user (owned or shared).

#### Request
```http
GET /api/locations
Authorization: Bearer user@example.com
```

#### Response
```json
[
  {
    "id": 1,
    "name": "Home Library",
    "description": "Main house book collection",
    "owner_id": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST /api/locations

Create a new location. Automatically creates a "my first shelf" shelf.

#### Request
```http
POST /api/locations
Authorization: Bearer user@example.com
Content-Type: application/json

{
  "name": "Home Library",
  "description": "Main house book collection"
}
```

#### Response
```json
{
  "id": 1,
  "name": "Home Library",
  "description": "Main house book collection",
  "owner_id": "user@example.com"
}
```

### PUT /api/locations?id=:id

Update a location's details.

#### Request
```http
PUT /api/locations?id=1
Authorization: Bearer user@example.com
Content-Type: application/json

{
  "name": "Updated Library Name",
  "description": "Updated description"
}
```

### DELETE /api/locations?id=:id

Delete a location and all its shelves.

#### Request
```http
DELETE /api/locations?id=1
Authorization: Bearer user@example.com
```

## Shelf Management

### GET /api/locations/:id/shelves

Get all shelves in a specific location.

#### Request
```http
GET /api/locations/1/shelves
Authorization: Bearer user@example.com
```

#### Response
```json
[
  {
    "id": 1,
    "name": "my first shelf",
    "location_id": 1,
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Fiction",
    "location_id": 1,
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

### POST /api/locations/:id/shelves

Create a new shelf in a location.

#### Request
```http
POST /api/locations/1/shelves
Authorization: Bearer user@example.com
Content-Type: application/json

{
  "name": "Science Fiction"
}
```

#### Response
```json
{
  "id": 3,
  "name": "Science Fiction",
  "location_id": 1,
  "created_at": "2024-01-15T12:00:00Z"
}
```

### PUT /api/locations/:id/shelves?shelfId=:shelfId

Update a shelf's name.

#### Request
```http
PUT /api/locations/1/shelves?shelfId=2
Authorization: Bearer user@example.com
Content-Type: application/json

{
  "name": "Fantasy & Fiction"
}
```

### DELETE /api/locations/:id/shelves?shelfId=:shelfId

Delete a shelf.

#### Request
```http
DELETE /api/locations/1/shelves?shelfId=2
Authorization: Bearer user@example.com
```

## Book Management

### GET /api/books

Get all books accessible to the authenticated user.

#### Request
```http
GET /api/books
Authorization: Bearer user@example.com
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
    "shelf_id": 1,
    "tags": ["fiction", "favorite"],
    "added_by": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z",
    "shelf_name": "Fiction",
    "location_name": "Home Library"
  }
]
```

### POST /api/books

Add a new book to the library.

#### Request
```http
POST /api/books
Authorization: Bearer user@example.com
Content-Type: application/json

{
  "isbn": "9780123456789",
  "title": "Example Book",
  "authors": ["John Doe", "Jane Smith"],
  "description": "An example book description...",
  "thumbnail": "https://covers.openlibrary.org/b/id/123-M.jpg",
  "published_date": "2023",
  "categories": ["Fiction", "Mystery"],
  "shelf_id": 1,
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
- `shelf_id`: Number - ID of the shelf to place the book
- `tags`: Array of strings - Custom tags

### PUT /api/books/:id

Update an existing book (currently supports shelf_id and tags only).

#### Request
```http
PUT /api/books/1
Authorization: Bearer user@example.com
Content-Type: application/json

{
  "shelf_id": 2,
  "tags": ["fiction", "read", "favorite"]
}
```

### DELETE /api/books/:id

Remove a book from the library.

#### Request
```http
DELETE /api/books/1
Authorization: Bearer user@example.com
```

## Data Types

### User Object
```typescript
interface User {
  id: string;              // Email address
  email: string;           // Email address
  first_name?: string;     // First name from Google
  last_name?: string;      // Last name from Google
  created_at?: string;     // Timestamp
  updated_at?: string;     // Timestamp
}
```

### Location Object
```typescript
interface Location {
  id?: number;             // Auto-generated ID
  name: string;            // Location name
  description?: string;    // Optional description
  owner_id: string;        // User email who owns this location
  created_at?: string;     // Timestamp
}
```

### Shelf Object
```typescript
interface Shelf {
  id?: number;             // Auto-generated ID
  name: string;            // Shelf name
  location_id: number;     // Parent location ID
  created_at?: string;     // Timestamp
}
```

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
  shelf_id?: number;        // Shelf ID where book is located
  tags?: string[];          // Custom tags
  added_by: string;         // User email who added the book
  created_at?: string;      // Timestamp
  shelf_name?: string;      // Shelf name (populated in GET responses)
  location_name?: string;   // Location name (populated in GET responses)
}
```

## Error Responses

### General Error Format
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes
- `200 OK`: Success
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied to resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Database or server error

## CORS

The API includes CORS headers to allow browser requests:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Examples

### Complete Workflow Example

```bash
# 1. Create a user (called automatically by OAuth)
curl -X POST https://libarycard-api.tim-arnold.workers.dev/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user@example.com",
    "email": "user@example.com", 
    "first_name": "John",
    "last_name": "Doe"
  }'

# 2. Create a location
curl -X POST https://libarycard-api.tim-arnold.workers.dev/api/locations \
  -H "Authorization: Bearer user@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Home Library",
    "description": "Main collection at home"
  }'

# 3. Add a shelf to the location
curl -X POST https://libarycard-api.tim-arnold.workers.dev/api/locations/1/shelves \
  -H "Authorization: Bearer user@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Science Fiction"
  }'

# 4. Add a book to the shelf
curl -X POST https://libarycard-api.tim-arnold.workers.dev/api/books \
  -H "Authorization: Bearer user@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "9780451524935",
    "title": "1984",
    "authors": ["George Orwell"],
    "description": "A dystopian social science fiction novel...",
    "categories": ["Fiction", "Dystopian"],
    "shelf_id": 1,
    "tags": ["classic", "dystopian"]
  }'

# 5. Get all books
curl -H "Authorization: Bearer user@example.com" \
  https://libarycard-api.tim-arnold.workers.dev/api/books
```

## Security Considerations

### Authentication
- Currently uses email as Bearer token for simplicity
- Production should implement proper JWT verification
- All endpoints except `/api/users` require authentication

### Authorization
- Users can only access their own locations and books
- Location owners have full control over their locations and shelves
- Future: implement location sharing between users

### Data Privacy
- User emails are used only for identification
- No sensitive personal data is stored
- Book data is public information (ISBN lookups)
- Users have full control over their data

## Rate Limiting

Currently no rate limiting is implemented. For production deployment, consider:
- Request rate limits per user
- Bulk operation limits
- API key management for external integrations