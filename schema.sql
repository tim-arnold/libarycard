CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL, -- JSON array
  description TEXT,
  thumbnail TEXT,
  published_date TEXT,
  categories TEXT, -- JSON array
  location TEXT,
  tags TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_location ON books(location);
CREATE INDEX idx_books_created_at ON books(created_at);