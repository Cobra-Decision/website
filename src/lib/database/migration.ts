import type { Database } from "bun:sqlite";
import { generateId } from "../id";

export interface MigrationStep {
  version: number;
  name: string;
  up: (db: Database) => void | Promise<void>;
  down?: (db: Database) => void | Promise<void>;
}

export const migrations: MigrationStep[] = [
  {
    version: 1,
    name: "001_core_auth_schema",
    up: (db: Database) => {
      db.run("PRAGMA foreign_keys = ON;");
      db.run(`
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          email TEXT NOT NULL UNIQUE,
          phone TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          role_id TEXT NOT NULL REFERENCES roles(id),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS endpoints (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT
        );
      `);
      db.run(`
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
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS error_messages (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('info', 'error', 'success', 'warning')),
          title TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS registration_otps (
          email TEXT PRIMARY KEY,
          otp_code TEXT NOT NULL,
          payload TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: 2,
    name: "002_events_and_tags_schema",
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS user_tags (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, tag_id)
        );
      `);
      db.run(`
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
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS meet_attendees (
          meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (meet_id, user_id)
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS meet_tags (
          meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (meet_id, tag_id)
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS platforms (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS meet_visits (
          id TEXT PRIMARY KEY,
          meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
          platform_id TEXT REFERENCES platforms(id) ON DELETE SET NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: 3,
    name: "003_landing_and_mailer_schema",
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS contact_requests (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      db.run(`
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
      `);
      db.run(`
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
      `);
    },
  },
  {
    version: 4,
    name: "004_performance_indexes",
    up: (db: Database) => {
      db.run("CREATE INDEX IF NOT EXISTS idx_meet_tags_tag_id ON meet_tags(tag_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_meet_attendees_user_id ON meet_attendees(user_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_meets_deleted_scheduled ON meets(deleted_at, scheduled_date, scheduled_time);");
      db.run("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);");
      db.run("CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);");
      db.run("CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status, scheduled_for);");
    },
  },
  {
    version: 5,
    name: "005_add_video_url_to_meets",
    up: (db: Database) => {
      const columns = db.query<{ name: string }, []>("PRAGMA table_info(meets)").all();
      if (!columns.some((c) => c.name === "video_url")) {
        db.run("ALTER TABLE meets ADD COLUMN video_url TEXT;");
      }
    },
  },
];

export function ensureMigrationTable(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function getAppliedMigrations(db: Database): { id: string; version: number; name: string; applied_at: string }[] {
  ensureMigrationTable(db);
  return db.query<{ id: string; version: number; name: string; applied_at: string }, []>(
    "SELECT id, version, name, applied_at FROM _migrations ORDER BY version ASC"
  ).all();
}

export function getCurrentVersion(db: Database): number {
  ensureMigrationTable(db);
  const row = db.query<{ max_version: number | null }, []>("SELECT MAX(version) as max_version FROM _migrations").get();
  return row?.max_version ?? 0;
}

export async function runMigrations(
  db: Database,
  options: { targetVersion?: number } = {}
): Promise<{ applied: MigrationStep[]; currentVersion: number; totalMigrations: number }> {
  ensureMigrationTable(db);
  const current = getCurrentVersion(db);
  const target = options.targetVersion ?? Math.max(...migrations.map((m) => m.version), 0);

  const pending = migrations.filter((m) => m.version > current && m.version <= target).sort((a, b) => a.version - b.version);
  const applied: MigrationStep[] = [];

  for (const step of pending) {
    db.run("BEGIN TRANSACTION;");
    try {
      await step.up(db);
      db.run("INSERT INTO _migrations (id, version, name) VALUES (?, ?, ?)", [generateId(), step.version, step.name]);
      db.run("COMMIT;");
      applied.push(step);
    } catch (err) {
      db.run("ROLLBACK;");
      throw new Error(`Migration ${step.version} (${step.name}) failed: ${(err as Error).message}`);
    }
  }

  return {
    applied,
    currentVersion: getCurrentVersion(db),
    totalMigrations: migrations.length,
  };
}
