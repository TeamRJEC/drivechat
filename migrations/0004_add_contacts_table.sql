-- Migration: Add contacts table for centralized contact management
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  provider_contact_id TEXT NOT NULL, -- Provider's unique contact ID
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email_addresses TEXT, -- JSON array of {email, type, isPrimary}
  phone_numbers TEXT, -- JSON array of {number, type, isPrimary}
  company TEXT,
  job_title TEXT,
  notes TEXT,
  photo_url TEXT,
  birthday TEXT, -- ISO date format
  address TEXT, -- JSON object
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, provider_contact_id)
);

-- Indexes for faster searches
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_first_name ON contacts(first_name);
CREATE INDEX idx_contacts_last_name ON contacts(last_name);
CREATE INDEX idx_contacts_display_name ON contacts(display_name);
CREATE INDEX idx_contacts_company ON contacts(company);

-- Full-text search index for contact search
CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
  first_name,
  last_name,
  display_name,
  email_addresses,
  company,
  content=contacts,
  content_rowid=id
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER contacts_fts_insert AFTER INSERT ON contacts BEGIN
  INSERT INTO contacts_fts(rowid, first_name, last_name, display_name, email_addresses, company)
  VALUES (new.id, new.first_name, new.last_name, new.display_name, new.email_addresses, new.company);
END;

CREATE TRIGGER contacts_fts_delete AFTER DELETE ON contacts BEGIN
  DELETE FROM contacts_fts WHERE rowid = old.id;
END;

CREATE TRIGGER contacts_fts_update AFTER UPDATE ON contacts BEGIN
  UPDATE contacts_fts
  SET first_name = new.first_name,
      last_name = new.last_name,
      display_name = new.display_name,
      email_addresses = new.email_addresses,
      company = new.company
  WHERE rowid = new.id;
END;
