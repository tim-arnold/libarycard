-- Add invitation system for location access
CREATE TABLE IF NOT EXISTS location_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  invited_email TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  invited_by TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- Add index for invitation lookups
CREATE INDEX idx_location_invitations_token ON location_invitations(invitation_token);
CREATE INDEX idx_location_invitations_email ON location_invitations(invited_email);
CREATE INDEX idx_location_invitations_location ON location_invitations(location_id);

-- Add user_role index if not exists
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role);