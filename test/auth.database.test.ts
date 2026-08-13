import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";

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
  expect(database.query("SELECT title FROM endpoints WHERE deleted_at IS NULL").all()).toHaveLength(9);
  expect(database.query("SELECT COUNT(*) total FROM role_endpoints WHERE deleted_at IS NULL").get()).toEqual({ total: 18 });
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
  expect(admin.role).toBe("admin");
  expect(await Bun.password.verify(seed.password, admin.password_hash)).toBe(true);
  expect(database.query("SELECT COUNT(*) total FROM users").get()).toEqual({ total: 1 });
});

test("profile fields are optional and foreign keys are enforced", async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get()!;
  database.run("INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)", ["user@example.com", "hash", role.id]);
  expect(database.query("SELECT username, phone, first_name, last_name FROM users").get()).toEqual({
    username: null, phone: null, first_name: null, last_name: null,
  });
  expect(() => database.run("INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)", ["bad@example.com", "hash", 999])).toThrow();
});
