-- Allow NULL values for books.added_by field to support user cleanup
-- This preserves books when users are deleted but removes the user reference

-- Create new table with modified schema matching exact column order
CREATE TABLE books_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  published_date TEXT,
  categories TEXT,
  shelf_id INTEGER,
  tags TEXT,
  added_by TEXT, -- NOW NULLABLE (was NOT NULL)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'available',
  checked_out_by TEXT,
  checked_out_date DATETIME,
  due_date DATETIME,
  extended_description TEXT,
  subjects TEXT,
  page_count INTEGER,
  average_rating REAL,
  ratings_count INTEGER,
  publisher_info TEXT,
  open_library_key TEXT,
  enhanced_genres TEXT,
  series TEXT,
  series_number TEXT,
  FOREIGN KEY (shelf_id) REFERENCES shelves(id)
  -- Note: Removed FOREIGN KEY constraint for added_by to allow NULL
);

-- Copy all data from old table to new table
INSERT INTO books_new SELECT * FROM books;

-- Drop old table
DROP TABLE books;

-- Rename new table to original name
ALTER TABLE books_new RENAME TO books;