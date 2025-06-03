-- Users table for multiple auth providers
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- UUID for email/password users, Google ID for OAuth users
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  password_hash TEXT, -- NULL for OAuth users
  auth_provider TEXT DEFAULT 'email', -- 'email' or 'google'
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations (e.g., "Finsbury Road", "Office Building")
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Location members (invited users)
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

-- Shelves (formerly "location" - basement, Tim's room, etc.)
CREATE TABLE IF NOT EXISTS shelves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Updated books table
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

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_locations_owner ON locations(owner_id);
CREATE INDEX idx_location_members_location ON location_members(location_id);
CREATE INDEX idx_location_members_user ON location_members(user_id);
CREATE INDEX idx_shelves_location ON shelves(location_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_shelf ON books(shelf_id);
CREATE INDEX idx_books_added_by ON books(added_by);
CREATE INDEX idx_books_created_at ON books(created_at);

-- Default shelves for new locations
-- (These will be created programmatically when a new location is created)