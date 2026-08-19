PRAGMA foreign_keys = ON;

-- Dynamic Email Templates (Mail Editor)
CREATE TABLE IF NOT EXISTS emails_schema (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'html' CHECK (format IN ('html', 'markdown', 'text')),
  value TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Scheduled Email Broadcasts (Mail Scheduler)
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES emails_schema(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'html' CHECK (format IN ('html', 'markdown', 'text')),
  body TEXT NOT NULL,
  target_mode TEXT NOT NULL CHECK (target_mode IN ('all', 'tags', 'domain', 'selected')),
  target_payload TEXT NOT NULL DEFAULT '',
  scheduled_for DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  sent_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status, scheduled_for);
