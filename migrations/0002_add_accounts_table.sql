-- Migration: Add accounts table for storing linked Google/Microsoft accounts
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1, -- For future multi-user support
  provider TEXT NOT NULL CHECK(provider IN ('google', 'microsoft')),
  provider_account_id TEXT NOT NULL, -- Email address
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at DATETIME NOT NULL,
  scopes TEXT NOT NULL, -- JSON array of granted scopes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

-- Index for faster lookups
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);
