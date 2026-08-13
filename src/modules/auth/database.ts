import type { Database } from "bun:sqlite";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export type AdminSeed = { email?: string; password?: string };

export async function initializeDatabase(database: Database, admin: AdminSeed = {}) {
  database.exec(schema);
  migrateOptionalProfileFields(database);
  database.run("INSERT OR IGNORE INTO roles (title, description) VALUES (?, ?), (?, ?)", [
    "member", "Default user role", "admin", "Administrator",
  ]);
  database.run("INSERT OR IGNORE INTO endpoints (title, description) VALUES (?, ?)", ["/dashboard", "User dashboard"]);
  database.exec(`INSERT OR IGNORE INTO role_endpoints (role_id, endpoint_id, description)
    SELECT r.id, e.id, 'Dashboard access' FROM roles r, endpoints e
    WHERE r.title = 'admin' AND r.deleted_at IS NULL
      AND e.title = '/dashboard' AND e.deleted_at IS NULL`);

  if (admin.email && admin.password) {
    const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'admin' AND deleted_at IS NULL").get()!;
    const existing = database.query("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(admin.email);
    if (!existing) database.run("INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)", [
      admin.email.trim().toLowerCase(), await Bun.password.hash(admin.password), role.id,
    ]);
  }
}

function migrateOptionalProfileFields(database: Database) {
  const username = database.query<{ notnull: number }, []>("SELECT `notnull` FROM pragma_table_info('users') WHERE name = 'username'").get();
  if (!username?.notnull) return;
  database.transaction(() => {
    database.exec(`ALTER TABLE users RENAME TO users_required_profile;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, email TEXT NOT NULL UNIQUE,
        phone TEXT UNIQUE, password_hash TEXT NOT NULL, first_name TEXT, last_name TEXT,
        role_id INTEGER NOT NULL REFERENCES roles(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT
      );
      INSERT INTO users SELECT id, NULLIF(username, ''), email, NULLIF(phone, ''), password_hash,
        NULLIF(first_name, ''), NULLIF(last_name, ''), role_id, created_at, updated_at, deleted_at
        FROM users_required_profile;
      DROP TABLE users_required_profile;`);
  })();
}
