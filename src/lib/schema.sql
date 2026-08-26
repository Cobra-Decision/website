PRAGMA foreign_keys = ON;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role_id TEXT NOT NULL REFERENCES roles(id),
  timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Endpoints
CREATE TABLE IF NOT EXISTS endpoints (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Role Endpoints
CREATE TABLE IF NOT EXISTS role_endpoints (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES roles(id),
  endpoint_id TEXT NOT NULL REFERENCES endpoints(id),
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  UNIQUE(role_id, endpoint_id)
);

-- Error Messages
CREATE TABLE IF NOT EXISTS error_messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('info', 'error', 'success', 'warning')),
  title TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- User Preferred Tags
CREATE TABLE IF NOT EXISTS user_tags (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tag_id)
);

-- Meets
CREATE TABLE IF NOT EXISTS meets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  topics TEXT,
  scheduled_at_utc TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meet_url TEXT,
  file_url TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  access_status TEXT NOT NULL DEFAULT 'public' CHECK (access_status IN ('public', 'private')),
  presenter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Meet Attendees
CREATE TABLE IF NOT EXISTS meet_attendees (
  meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meet_id, user_id)
);

-- Meet Tags
CREATE TABLE IF NOT EXISTS meet_tags (
  meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (meet_id, tag_id)
);

-- Platforms
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Meet Visits
CREATE TABLE IF NOT EXISTS meet_visits (
  id TEXT PRIMARY KEY,
  meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  platform_id TEXT REFERENCES platforms(id) ON DELETE SET NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Contact Requests
CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Registration OTPs
CREATE TABLE IF NOT EXISTS registration_otps (
  email TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  payload TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
