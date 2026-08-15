import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";
import { generateId } from "../src/lib/id";

let database: Database;
afterEach(() => database?.close());

test("initialization seeds roles and dashboard permission once", async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  await initializeDatabase(database);

  expect(database.query("SELECT title FROM roles WHERE deleted_at IS NULL ORDER BY title").all()).toEqual([
    { title: "Super Admin" },
    { title: "admin" },
    { title: "member" },
  ]);
  expect(database.query("SELECT title FROM endpoints WHERE deleted_at IS NULL").all().length).toBeGreaterThanOrEqual(8);
  expect((database.query<{ total: number }, []>("SELECT COUNT(*) total FROM role_endpoints WHERE deleted_at IS NULL").get()!).total).toBeGreaterThanOrEqual(15);
});

test("optional admin seed is idempotent and uses a native password hash", async () => {
  database = new Database(":memory:");
  const seed = { email: "admin@example.com", password: "correct horse battery staple" };
  await initializeDatabase(database, seed);
  await initializeDatabase(database, seed);

  const admin = database.query<{ email: string; password_hash: string; role: string }, []>(
    `SELECT u.email, u.password_hash, r.title role FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = 'admin@example.com' AND u.deleted_at IS NULL AND r.deleted_at IS NULL`,
  ).get()!;
  expect(admin.email).toBe(seed.email);
  expect(admin.role).toBe("Super Admin");
  expect(await Bun.password.verify(seed.password, admin.password_hash)).toBe(true);
  expect(database.query("SELECT COUNT(*) total FROM users").get()).toEqual({ total: 1 });
});

test("profile fields are optional and foreign keys are enforced", async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get()!;
  database.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)", [generateId(), "user@example.com", "hash", role.id]);
  expect(database.query("SELECT username, phone, first_name, last_name FROM users").get()).toEqual({
    username: null, phone: null, first_name: null, last_name: null,
  });
  expect(() => database.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)", [generateId(), "bad@example.com", "hash", "non-existent-role-id"])).toThrow();
});

test("existing configured seed user is promoted to Super Admin", async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  const member = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  database.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)", [generateId(), "admin@example.com", "hash", member.id]);
  await initializeDatabase(database, { email: "admin@example.com", password: "secret" });
  expect(database.query<{ title: string }, []>("SELECT r.title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email='admin@example.com'").get()).toEqual({ title: "Super Admin" });
});

test("user_tags table correctly associates users with tags and enforces foreign key cascade", async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  const memberRole = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  const userId = generateId();
  database.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)", [userId, "user-pref@example.com", "hash", memberRole.id]);

  database.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", [userId, "tag-1"]);
  database.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", [userId, "tag-2"]);
  database.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", [userId, "tag-3"]);

  const userTags = database.query<{ tag_id: string }, [string]>("SELECT tag_id FROM user_tags WHERE user_id = ? ORDER BY tag_id").all(userId);
  expect(userTags).toEqual([{ tag_id: "tag-1" }, { tag_id: "tag-2" }, { tag_id: "tag-3" }]);

  // Test cascade deletion when user is deleted
  database.run("DELETE FROM users WHERE id = ?", [userId]);
  const remaining = database.query<{ total: number }, [string]>("SELECT COUNT(*) total FROM user_tags WHERE user_id = ?").get(userId)!;
  expect(remaining.total).toBe(0);
});
