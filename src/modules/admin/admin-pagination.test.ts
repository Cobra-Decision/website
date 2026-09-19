import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createAdminRoutes } from "./routes";
import { generateId } from "../../lib/id";
import { sign } from "hono/jwt";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

describe("Admin Resource Pagination Integration", () => {
  let db: Database;
  const jwtSecret = "test-secret";
  let superRoleId: string;
  let normalRoleId: string;
  let superAdminToken: string;
  let testStorageDir: string;

  beforeEach(async () => {
    db = new Database(":memory:");
    db.run("PRAGMA foreign_keys = ON;");

    // Seed schema
    db.run(`
      CREATE TABLE roles (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT, phone TEXT, first_name TEXT, last_name TEXT, password_hash TEXT NOT NULL, role_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME, FOREIGN KEY (role_id) REFERENCES roles(id));
      CREATE TABLE meets (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, topics TEXT, scheduled_date TEXT, scheduled_time TEXT, scheduled_at_utc TEXT, duration_minutes INTEGER, meet_url TEXT, video_url TEXT, file_url TEXT, image_url TEXT, status TEXT DEFAULT 'upcoming', publish_status TEXT DEFAULT 'public', access_status TEXT DEFAULT 'public', presenter_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE tags (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE endpoints (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE meet_tags (meet_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY(meet_id, tag_id));
      CREATE TABLE meet_attendees (meet_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(meet_id, user_id));
      CREATE TABLE meet_allowed_users (meet_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(meet_id, user_id));
      CREATE TABLE role_endpoints (id TEXT PRIMARY KEY, role_id TEXT NOT NULL, endpoint_id TEXT NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE email_errors (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE emails_schema (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, subject TEXT NOT NULL, format TEXT NOT NULL, description TEXT, value TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE scheduled_emails (id TEXT PRIMARY KEY, template_id TEXT, title TEXT NOT NULL, subject TEXT NOT NULL, format TEXT NOT NULL, body TEXT NOT NULL, target_mode TEXT NOT NULL, target_payload TEXT, scheduled_for DATETIME NOT NULL, status TEXT DEFAULT 'pending', error_message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE email_automation_rules (id TEXT PRIMARY KEY, rule_key TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT, is_enabled INTEGER DEFAULT 1, template_title TEXT, schedule_config TEXT, last_run_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
      CREATE TABLE meet_visits (id TEXT PRIMARY KEY, meet_id TEXT NOT NULL, platform_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    `);

    superRoleId = generateId();
    normalRoleId = generateId();
    db.run("INSERT INTO roles (id, title) VALUES (?, 'Super Admin')", [superRoleId]);
    db.run("INSERT INTO roles (id, title) VALUES (?, 'Editor')", [normalRoleId]);

    // Endpoints
    const endpoints = [
      "/dashboard/admin/users",
      "/dashboard/admin/meets",
      "/dashboard/admin/tags",
      "/dashboard/admin/roles",
      "/dashboard/admin/endpoints",
      "/dashboard/admin/files",
      "/users",
      "/meets",
      "/tags",
      "/roles",
      "/endpoints",
      "/files",
    ];
    for (const ep of endpoints) {
      const epId = generateId();
      db.run("INSERT INTO endpoints (id, title) VALUES (?, ?)", [epId, ep]);
      db.run("INSERT INTO role_endpoints (role_id, endpoint_id) VALUES (?, ?)", [superRoleId, epId]);
      db.run("INSERT INTO role_endpoints (role_id, endpoint_id) VALUES (?, ?)", [normalRoleId, epId]);
    }

    // Seed 25 users
    for (let i = 1; i <= 25; i++) {
      db.run(
        "INSERT INTO users (id, email, username, password_hash, role_id) VALUES (?, ?, ?, 'hash', ?)",
        [generateId(), `user${i.toString().padStart(2, "0")}@example.com`, `user${i.toString().padStart(2, "0")}`, superRoleId]
      );
    }

    // Seed 15 meets (12 public, 3 private)
    for (let i = 1; i <= 15; i++) {
      const publishStatus = i > 12 ? "private" : "public";
      db.run(
        "INSERT INTO meets (id, title, scheduled_date, scheduled_time, publish_status) VALUES (?, ?, '2026-10-01', '18:00', ?)",
        [generateId(), `Meet Event #${i.toString().padStart(2, "0")}`, publishStatus]
      );
    }

    superAdminToken = await sign({ sub: "super-admin-user", role_id: superRoleId }, jwtSecret);

    // Setup isolated files dir
    testStorageDir = join(process.cwd(), "tmp_test_uploads_" + generateId());
    process.env.STORAGE_DIR = testStorageDir;
    await mkdir(testStorageDir, { recursive: true });
    for (let i = 1; i <= 15; i++) {
      await writeFile(join(testStorageDir, `file_${i.toString().padStart(2, "0")}.txt`), `Content ${i}`);
    }
  });

  afterEach(async () => {
    try {
      await rm(testStorageDir, { recursive: true, force: true });
    } catch {}
  });

  it("paginates users table - page 1 returns 10 items with pagination state", async () => {
    const app = createAdminRoutes(db, jwtSecret);
    const res = await app.request("/users?page=1&limit=10", {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Showing");
    expect(html).toContain("1");
    expect(html).toContain("10");
    expect(html).toContain("25");
    expect(html).toContain("page=2");
  });

  it("paginates users table - page 2 returns next 10 items", async () => {
    const app = createAdminRoutes(db, jwtSecret);
    const res = await app.request("/users?page=2&limit=10", {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Showing");
    expect(html).toContain("11");
    expect(html).toContain("20");
    expect(html).toContain("25");
    expect(html).toContain("page=1");
    expect(html).toContain("page=3");
  });

  it("preserves search query in user table pagination", async () => {
    const app = createAdminRoutes(db, jwtSecret);
    const res = await app.request("/users?q=user0&search_field=username&page=1&limit=5", {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("q=user0");
    expect(html).toContain("search_field=username");
    expect(html).toContain("page=2");
  });

  it("paginates meets table and respects RBAC filter for private meets", async () => {
    const app = createAdminRoutes(db, jwtSecret);
    // Super Admin sees all 15 meets
    const resSuper = await app.request("/meets?page=1&limit=10", {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(resSuper.status).toBe(200);
    const htmlSuper = await resSuper.text();
    expect(htmlSuper).toContain("1");
    expect(htmlSuper).toContain("10");
    expect(htmlSuper).toContain("15");

    // Normal Editor sees only 12 public meets
    const editorToken = await sign({ sub: "editor-user", role_id: normalRoleId }, jwtSecret);
    const resEditor = await app.request("/meets?page=1&limit=10", {
      headers: { Cookie: `session=${editorToken}` },
    });
    expect(resEditor.status).toBe(200);
    const htmlEditor = await resEditor.text();
    expect(htmlEditor).toContain("1");
    expect(htmlEditor).toContain("10");
    expect(htmlEditor).toContain("12");
  });

  it("paginates file management route", async () => {
    const app = createAdminRoutes(db, jwtSecret);
    const res = await app.request("/files?page=1&limit=10", {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Showing");
    expect(html).toContain("1");
    expect(html).toContain("10");
    expect(html).toContain("15");
    expect(html).toContain("page=2");

    const res2 = await app.request("/files?page=2&limit=10", {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(res2.status).toBe(200);
    const html2 = await res2.text();
    expect(html2).toContain("11");
    expect(html2).toContain("15");
  });
});
