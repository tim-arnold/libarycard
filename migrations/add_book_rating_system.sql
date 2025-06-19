-- Migration: Add book rating system
-- Date: June 19, 2025
-- Description: Adds user rating and average rating columns to books table for star rating functionality

-- Add rating columns to books table
ALTER TABLE books ADD COLUMN user_rating INTEGER; -- 1-5 stars, NULL = unrated by current user
ALTER TABLE books ADD COLUMN average_rating REAL; -- calculated average per location
ALTER TABLE books ADD COLUMN rating_count INTEGER DEFAULT 0; -- number of ratings in this location
ALTER TABLE books ADD COLUMN rating_updated_at DATETIME; -- last rating update timestamp

-- Add indexes for performance on rating queries
CREATE INDEX IF NOT EXISTS idx_books_rating ON books(average_rating DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_books_user_rating ON books(user_rating DESC);

-- Detailed rating and review table - library-specific ratings with optional text reviews
CREATE TABLE IF NOT EXISTS book_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT, -- Optional text review
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(book_id, user_id) -- Ensure one rating per user per book
);

-- Index for rating history queries
CREATE INDEX IF NOT EXISTS idx_book_ratings_book_id ON book_ratings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_ratings_user_id ON book_ratings(user_id);