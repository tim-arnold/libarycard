-- Migration: Add enhanced book fields
-- This migration adds support for enhanced book data from Google Books and OpenLibrary APIs

-- Add enhanced book fields to the books table
ALTER TABLE books ADD COLUMN extended_description TEXT;
ALTER TABLE books ADD COLUMN subjects TEXT; -- JSON array of subjects
ALTER TABLE books ADD COLUMN page_count INTEGER;
ALTER TABLE books ADD COLUMN average_rating REAL;
ALTER TABLE books ADD COLUMN ratings_count INTEGER;
ALTER TABLE books ADD COLUMN publisher_info TEXT;
ALTER TABLE books ADD COLUMN open_library_key TEXT;
ALTER TABLE books ADD COLUMN enhanced_genres TEXT; -- JSON array of enhanced genres
ALTER TABLE books ADD COLUMN series TEXT;
ALTER TABLE books ADD COLUMN series_number TEXT;

-- Add updated_at timestamp for enhanced fields
ALTER TABLE books ADD COLUMN enhanced_data_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;