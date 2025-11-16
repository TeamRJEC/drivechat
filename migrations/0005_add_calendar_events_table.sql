-- Migration: Add calendar_events table for cross-platform calendar sync
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  provider_event_id TEXT NOT NULL, -- Provider's unique event ID
  calendar_id TEXT NOT NULL, -- Provider's calendar ID
  calendar_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  is_all_day INTEGER DEFAULT 0 CHECK(is_all_day IN (0, 1)),
  timezone TEXT DEFAULT 'UTC',
  recurrence_rule TEXT, -- iCalendar RRULE format
  attendees TEXT, -- JSON array of {email, name, responseStatus}
  organizer TEXT, -- JSON object {email, name}
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'tentative', 'cancelled')),
  color TEXT, -- Event color/category
  reminders TEXT, -- JSON array of reminder settings
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, provider_event_id)
);

-- Indexes for faster queries and conflict detection
CREATE INDEX idx_calendar_events_account_id ON calendar_events(account_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

-- Index for efficient conflict detection (overlapping time ranges)
CREATE INDEX idx_calendar_events_time_range ON calendar_events(start_time, end_time);
