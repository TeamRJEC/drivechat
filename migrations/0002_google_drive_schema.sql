-- Drop tasks table as we're replacing with Google Drive functionality
DROP TABLE IF EXISTS tasks;

-- Table to store OAuth tokens for domain users
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table to store search history
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES oauth_tokens(user_email)
);

-- Table to store authorized domains
CREATE TABLE IF NOT EXISTS authorized_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_oauth_tokens_email ON oauth_tokens(user_email);
CREATE INDEX idx_search_history_email ON search_history(user_email);
CREATE INDEX idx_authorized_domains ON authorized_domains(domain, is_active);
