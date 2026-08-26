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
  {
    version: 6,
    name: "006_add_telegram_to_users",
    up: (db: Database) => {
      const columns = db.query<{ name: string }, []>("PRAGMA table_info(users)").all();
      if (!columns.some((c) => c.name === "telegram_id")) {
        db.run("ALTER TABLE users ADD COLUMN telegram_id TEXT;");
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);");
      }
      db.run(`
        CREATE TABLE IF NOT EXISTS telegram_link_tokens (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at INTEGER NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: 7,
    name: "007_email_automation_and_reminder_logs",
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS email_automation_rules (
          id TEXT PRIMARY KEY,
          rule_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          is_enabled INTEGER NOT NULL DEFAULT 1,
          template_title TEXT,
          trigger_type TEXT NOT NULL DEFAULT 'daily_cron',
          schedule_config TEXT NOT NULL DEFAULT '{}',
          last_run_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS email_reminder_logs (
          id TEXT PRIMARY KEY,
          rule_key TEXT NOT NULL,
          meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(rule_key, meet_id, user_id)
        );
      `);
    },
  },
  {
    version: 8,
    name: "008_update_mailer_templates_and_variables",
    up: (db: Database) => {
      // Ensure emails_schema table exists before updating
      const hasTable = db.query<{ name: string }, [string]>("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get("emails_schema");
      if (!hasTable) return;

      const attendeesReminderValue = `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
  <div style="background: #2563eb; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
    تصمیم کبرا | رویداد پیش‌رو
  </div>
  <div style="padding: 24px; color: #1e293b;">
    <div dir="rtl" style="text-align: right; margin-bottom: 20px;">
      <h2 style="margin-top: 0;">سلام {{name}} عزیز</h2>
      <p>جلسه‌ای که در آن ثبت‌نام کرده‌اید به زودی برگزار می‌شود:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <div><strong>عنوان:</strong> {{meet_title}}</div>
        <div><strong>تاریخ:</strong> {{meet_date_shamsi}} ({{meet_date}}) | <strong>زمان:</strong> {{meet_time}}</div>
        <div><strong>ارائه‌دهنده:</strong> {{presenter_name}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">ورود به اتاق جلسه</a>
      </p>
    </div>
    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />
    <div dir="ltr" style="text-align: left;">
      <h2 style="margin-top: 0;">Hello {{name}}</h2>
      <p>A meeting you registered for is happening soon:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <div><strong>Title:</strong> {{meet_title}}</div>
        <div><strong>Date:</strong> {{meet_date}} | <strong>Time:</strong> {{meet_time}}</div>
        <div><strong>Presenter:</strong> {{presenter_name}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Join Meeting</a>
      </p>
    </div>
  </div>
</div>`;

      // Update attendees_reminder template in production if exists, or insert it
      const existing = db.query<{ id: string }, [string]>("SELECT id FROM emails_schema WHERE title = ?").get("attendees_reminder");
      if (existing) {
        db.run(
          "UPDATE emails_schema SET value=?, subject=?, format='html', description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
          [attendeesReminderValue, "یادآوری رویداد: {{meet_title}} | Event Reminder: {{meet_title}}", "Scheduled reminder for users who registered/attended a specific meeting", existing.id]
        );
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
