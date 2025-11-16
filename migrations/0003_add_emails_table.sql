-- Migration: Add emails table for unified inbox
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  message_id TEXT NOT NULL, -- Provider's unique message ID
  thread_id TEXT, -- Email thread identifier
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT NOT NULL, -- JSON array
  cc_addresses TEXT, -- JSON array
  bcc_addresses TEXT, -- JSON array
  subject TEXT,
  body_plain TEXT,
  body_html TEXT,
  snippet TEXT, -- Short preview text
  received_at DATETIME NOT NULL,
  is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
  is_flagged INTEGER DEFAULT 0 CHECK(is_flagged IN (0, 1)),
  is_archived INTEGER DEFAULT 0 CHECK(is_archived IN (0, 1)),
  labels TEXT, -- JSON array of labels/folders
  attachments TEXT, -- JSON array of attachment metadata
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, message_id)
);

-- Indexes for faster searches and filtering
CREATE INDEX idx_emails_account_id ON emails(account_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_from_address ON emails(from_address);
CREATE INDEX idx_emails_subject ON emails(subject);
CREATE INDEX idx_emails_is_read ON emails(is_read);
CREATE INDEX idx_emails_is_flagged ON emails(is_flagged);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
