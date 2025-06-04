-- Book removal requests table for admin approval workflow
CREATE TABLE IF NOT EXISTS book_removal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  requester_id TEXT NOT NULL, -- User who requested removal
  reason TEXT NOT NULL, -- 'lost', 'damaged', 'missing', 'other'
  reason_details TEXT, -- Additional details/comments from user
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  reviewed_by TEXT, -- Admin who approved/denied
  review_comment TEXT, -- Admin's comment on the decision
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME, -- When the request was reviewed
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Indexes for efficient queries
CREATE INDEX idx_removal_requests_book ON book_removal_requests(book_id);
CREATE INDEX idx_removal_requests_requester ON book_removal_requests(requester_id);
CREATE INDEX idx_removal_requests_status ON book_removal_requests(status);
CREATE INDEX idx_removal_requests_created ON book_removal_requests(created_at);
CREATE INDEX idx_removal_requests_reviewed_by ON book_removal_requests(reviewed_by);