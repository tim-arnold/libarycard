-- Signup approval requests table for uninvited users
CREATE TABLE IF NOT EXISTS signup_approval_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  password_hash TEXT NOT NULL,
  auth_provider TEXT DEFAULT 'email',
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by TEXT, -- Admin who approved/denied
  reviewed_at DATETIME, -- When the request was reviewed
  review_comment TEXT, -- Admin's comment on the decision
  created_user_id TEXT, -- User ID created after approval (for tracking)
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Indexes for signup approval requests
CREATE INDEX idx_signup_requests_email ON signup_approval_requests(email);
CREATE INDEX idx_signup_requests_status ON signup_approval_requests(status);
CREATE INDEX idx_signup_requests_requested_at ON signup_approval_requests(requested_at);
CREATE INDEX idx_signup_requests_reviewed_by ON signup_approval_requests(reviewed_by);