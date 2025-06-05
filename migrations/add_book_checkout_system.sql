-- Book checkout system migration
-- Adds checkout status tracking and history

-- Add checkout status fields to the books table
ALTER TABLE books ADD COLUMN status TEXT DEFAULT 'available'; -- 'available', 'checked_out'
ALTER TABLE books ADD COLUMN checked_out_by TEXT; -- User ID who has the book
ALTER TABLE books ADD COLUMN checked_out_date DATETIME; -- When book was checked out
ALTER TABLE books ADD COLUMN due_date DATETIME; -- When book should be returned (optional)

-- Create checkout history table for tracking all checkouts/returns
CREATE TABLE IF NOT EXISTS book_checkout_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  user_id TEXT NOT NULL, -- User who checked out the book
  action TEXT NOT NULL, -- 'checkout' or 'return'
  action_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME, -- Due date when checked out
  notes TEXT, -- Optional notes from user or admin
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add foreign key constraint for checked_out_by
-- Note: SQLite doesn't support adding foreign keys to existing tables
-- This will be handled in the Workers API validation

-- Indexes for performance
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_checked_out_by ON books(checked_out_by);
CREATE INDEX idx_books_checked_out_date ON books(checked_out_date);
CREATE INDEX idx_books_due_date ON books(due_date);
CREATE INDEX idx_checkout_history_book ON book_checkout_history(book_id);
CREATE INDEX idx_checkout_history_user ON book_checkout_history(user_id);
CREATE INDEX idx_checkout_history_action ON book_checkout_history(action);
CREATE INDEX idx_checkout_history_date ON book_checkout_history(action_date);