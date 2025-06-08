# Database Schema

LibaryCard uses Cloudflare D1, a distributed SQLite database, to store user accounts, locations, shelves, and book information in a multi-user architecture.

## Table Structure

### Users Table

Stores user authentication information for both Google OAuth and email/password:

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- User ID (email for OAuth, UUID for email auth)
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  password_hash TEXT, -- For email/password authentication
  auth_provider TEXT DEFAULT 'google', -- 'google' or 'email'
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires DATETIME,
  user_role TEXT DEFAULT 'user', -- 'admin' or 'user'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Locations Table

Physical locations where books are stored (e.g., "Home", "Office"):

```sql
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

### Location Members Table

For sharing locations between users (future feature):

```sql
CREATE TABLE IF NOT EXISTS location_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'owner', 'member'
  invited_by TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (invited_by) REFERENCES users(id),
  UNIQUE(location_id, user_id)
);
```

### Shelves Table

Shelves within locations (e.g., "Fiction", "Reference", "my first shelf"):

```sql
CREATE TABLE IF NOT EXISTS shelves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

### Books Table

Individual book records:

```sql
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL, -- JSON array
  description TEXT,
  thumbnail TEXT,
  published_date TEXT,
  categories TEXT, -- JSON array
  shelf_id INTEGER, -- Reference to shelves table
  tags TEXT, -- JSON array
  added_by TEXT NOT NULL, -- User who added the book
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shelf_id) REFERENCES shelves(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
);
```

### Indexes

Optimized indexes for common query patterns:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(user_role);
CREATE INDEX idx_locations_owner ON locations(owner_id);
CREATE INDEX idx_location_members_location ON location_members(location_id);
CREATE INDEX idx_location_members_user ON location_members(user_id);
CREATE INDEX idx_shelves_location ON shelves(location_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_shelf ON books(shelf_id);
CREATE INDEX idx_books_added_by ON books(added_by);
CREATE INDEX idx_books_created_at ON books(created_at);
```

## Data Relationships

### Entity Relationship Diagram

```
users (1) ←→ (n) locations
  ↓
  (1) ←→ (n) location_members
  ↓
  (1) ←→ (n) books (added_by)

locations (1) ←→ (n) shelves
shelves (1) ←→ (n) books (shelf_id)
```

### Key Relationships

1. **Users → Locations**: One user can own multiple locations
2. **Users → Location Members**: Users can be members of shared locations (future)
3. **Users → Books**: Users can add books to any accessible location
4. **Locations → Shelves**: Each location contains multiple shelves
5. **Shelves → Books**: Books are assigned to specific shelves

## Column Details

### Users Table

- **id**: User's email address (from Google OAuth)
- **email**: Email address (unique constraint)
- **first_name/last_name**: From Google profile
- **created_at/updated_at**: Timestamp tracking

### Locations Table

- **id**: Auto-incrementing primary key
- **name**: User-defined location name (e.g., "Home Library", "Office")
- **description**: Optional description
- **owner_id**: References users.id (email)

### Shelves Table

- **id**: Auto-incrementing primary key
- **name**: Shelf name (e.g., "Fiction", "my first shelf")
- **location_id**: Parent location reference

### Books Table

- **id**: Auto-incrementing primary key
- **isbn**: 13-digit ISBN as text
- **title**: Book title
- **authors**: JSON array of author names
- **description**: Book description from API
- **thumbnail**: Cover image URL
- **published_date**: Publication date
- **categories**: JSON array of genres/categories
- **shelf_id**: Reference to shelves table (nullable)
- **tags**: JSON array of user-defined tags
- **added_by**: User email who added the book

## Default Data

### Automatic Shelf Creation

When a new location is created, it automatically gets one default shelf:

```sql
INSERT INTO shelves (name, location_id, created_at)
VALUES ('my first shelf', NEW.location_id, datetime('now'));
```

Users can rename this shelf or add additional shelves as needed.

## JSON Data Formats

### Authors Field
```json
["George Orwell"]
["J.K. Rowling"]
["Douglas Adams", "Christopher Cerf"]
```

### Categories Field
```json
["Fiction"]
["Science Fiction", "Humor"]
["History", "Biography", "Politics"]
```

### Tags Field
```json
["fiction", "read"]
["reference", "cookbook", "favorite"]
["children", "picture-book", "library"]
```

## Common Queries

### User's Books with Location Info
```sql
SELECT b.*, s.name as shelf_name, l.name as location_name
FROM books b
LEFT JOIN shelves s ON b.shelf_id = s.id
LEFT JOIN locations l ON s.location_id = l.id
LEFT JOIN location_members lm ON l.id = lm.location_id
WHERE b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?
ORDER BY b.created_at DESC;
```

### User's Locations
```sql
SELECT l.* FROM locations l
LEFT JOIN location_members lm ON l.id = lm.location_id
WHERE l.owner_id = ? OR lm.user_id = ?
ORDER BY l.created_at DESC;
```

### Shelves in a Location
```sql
SELECT * FROM shelves 
WHERE location_id = ? 
ORDER BY name;
```

### Books on a Specific Shelf
```sql
SELECT b.*, s.name as shelf_name, l.name as location_name
FROM books b
JOIN shelves s ON b.shelf_id = s.id
JOIN locations l ON s.location_id = l.id
WHERE s.id = ?
ORDER BY b.title;
```

### Access Control Check
```sql
-- Check if user has access to a location
SELECT 1 FROM locations l
LEFT JOIN location_members lm ON l.id = lm.location_id
WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?);
```

## Data Validation

### Application-Level Constraints

```typescript
// User validation
if (!user.id || !user.email) {
  throw new Error('User ID and email required');
}

// Location validation
if (!location.name || !location.owner_id) {
  throw new Error('Location name and owner required');
}

// Shelf validation
if (!shelf.name || !shelf.location_id) {
  throw new Error('Shelf name and location required');
}

// Book validation
if (!book.isbn || !book.title || !book.authors || book.authors.length === 0) {
  throw new Error('ISBN, title, and authors required');
}

// ISBN format validation
if (!/^\d{13}$/.test(book.isbn)) {
  throw new Error('Invalid ISBN format');
}
```

### Database Constraints

- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate location memberships
- NOT NULL constraints on required fields
- Indexes improve query performance

## Migration History

### Version 1.0 (Initial)
- Simple books table with location as string field

### Version 2.0 (Multi-User)
- Added users, locations, shelves, location_members tables
- Migrated books.location to books.shelf_id relationship
- Added authentication and access control
- Implemented hierarchical location → shelf → book structure

### Version 3.0 (Current - Role-Based Permissions)
- Added user_role column with admin/user permissions
- Implemented role-based access control for location/shelf operations
- Added email/password authentication alongside Google OAuth
- Enhanced security with admin-only restrictions

## Performance Considerations

### Index Usage

- **User lookups**: `idx_users_email` for authentication
- **Location queries**: `idx_locations_owner` for user's locations
- **Shelf queries**: `idx_shelves_location` for location's shelves  
- **Book queries**: `idx_books_shelf`, `idx_books_added_by` for user's books
- **ISBN lookups**: `idx_books_isbn` for duplicate detection

### Query Optimization

- Use prepared statements for all queries
- LEFT JOIN for optional relationships (shelf_id can be null)
- Limit result sets with appropriate WHERE clauses
- Order by indexed columns when possible

### Storage Estimates

Based on Cloudflare D1 free tier limits:
- **25 GB total storage**
- **5M reads/day, 100K writes/day**

Estimated capacity per user:
- ~100 locations per user
- ~10 shelves per location (1,000 total)
- ~25,000 books per user
- Suitable for extensive personal/family libraries

## Security Model

### Access Control

1. **Role-Based Access Control**: Users have admin or user roles
2. **Admin Privileges**: Only admin users can create, update, or delete locations and shelves
3. **User Restrictions**: Regular users can only add, update, and delete books
4. **Location Ownership**: Location owners control all shelves and can assign books
5. **Book Attribution**: Books track who added them but are accessible by location members
6. **Future Sharing**: location_members table ready for location sharing feature

### Data Privacy

- Only email addresses stored for user identification
- No sensitive personal information
- Book data is public (ISBN-based)
- Users control their location and shelf organization

## Backup and Recovery

### Data Export Query
```sql
-- Complete library export for a user
SELECT json_object(
  'user', json_object(
    'id', u.id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name
  ),
  'locations', (
    SELECT json_group_array(
      json_object(
        'id', l.id,
        'name', l.name,
        'description', l.description,
        'shelves', (
          SELECT json_group_array(
            json_object(
              'id', s.id,
              'name', s.name,
              'books', (
                SELECT json_group_array(
                  json_object(
                    'id', b.id,
                    'isbn', b.isbn,
                    'title', b.title,
                    'authors', json(b.authors),
                    'description', b.description,
                    'thumbnail', b.thumbnail,
                    'published_date', b.published_date,
                    'categories', json(b.categories),
                    'tags', json(b.tags),
                    'created_at', b.created_at
                  )
                )
                FROM books b WHERE b.shelf_id = s.id
              )
            )
          )
          FROM shelves s WHERE s.location_id = l.id
        )
      )
    )
    FROM locations l WHERE l.owner_id = u.id
  )
)
FROM users u
WHERE u.id = ?;
```

## Future Enhancements

### Planned Features

1. **Location Sharing**
   - Enable location_members functionality
   - Invitation system for shared libraries
   - Role-based permissions (owner/member/read-only)

2. **Advanced Organization**
   - Book series tracking
   - Reading progress/status
   - Loan tracking (who borrowed what)
   - Wishlist functionality

3. **Search and Discovery**
   - Full-text search across titles/authors/descriptions
   - Tag-based filtering and suggestions
   - Duplicate detection
   - Reading recommendations

4. **Data Management**
   - Bulk operations (import/export)
   - Data synchronization between users
   - Archive/restore functionality
   - Advanced reporting and statistics