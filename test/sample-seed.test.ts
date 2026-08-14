import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { seedSampleData } from "../src/lib/seed";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { initializeLandingDatabase } from "../src/modules/landing/database";

let database: Database;
afterEach(() => database.close());

test("sample seed creates related data once across all tables", async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  initializeLandingDatabase(database);
  await seedSampleData(database);
  const tables = ["roles", "users", "endpoints", "role_endpoints", "error_messages", "tags", "meets", "meet_attendees", "meet_tags", "contact_requests"];
  const counts = Object.fromEntries(tables.map((table) => [table, database.query<{ total: number }, []>(`SELECT COUNT(*) total FROM ${table}`).get()!.total]));
  await seedSampleData(database);

  for (const table of tables) {
    expect((database.query<{ total: number }, []>(`SELECT COUNT(*) total FROM ${table}`).get()!).total).toBeGreaterThan(0);
    expect(database.query<{ total: number }, []>(`SELECT COUNT(*) total FROM ${table}`).get()!.total).toBe(counts[table]);
  }
  expect(database.query("SELECT COUNT(*) total FROM users WHERE email = 'maya@example.com'").get()).toEqual({ total: 1 });
  expect(database.query("SELECT COUNT(*) total FROM meets WHERE title = 'Designing with Bun'").get()).toEqual({ total: 1 });
  expect(database.query("SELECT COUNT(DISTINCT type) total FROM error_messages WHERE deleted_at IS NULL").get()).toEqual({ total: 4 });
  expect(database.query("SELECT COUNT(*) total FROM meets WHERE description='' OR scheduled_at_utc IS NULL OR meet_url IS NULL").get()).toEqual({ total: 0 });
  expect(database.query("SELECT COUNT(*) total FROM meet_tags mt LEFT JOIN meets m ON m.id=mt.meet_id LEFT JOIN tags t ON t.id=mt.tag_id WHERE m.id IS NULL OR t.id IS NULL").get()).toEqual({ total: 0 });
  expect(database.query("SELECT COUNT(*) total FROM meet_attendees ma LEFT JOIN meets m ON m.id=ma.meet_id LEFT JOIN users u ON u.id=ma.user_id WHERE m.id IS NULL OR u.id IS NULL").get()).toEqual({ total: 0 });
  const users = database.query<{ password_hash: string }, []>("SELECT password_hash FROM users WHERE email IN ('maya@example.com','noah@example.com','alex.admin@example.com')").all();
  expect(users).toHaveLength(3);
  for (const user of users) expect(await Bun.password.verify("sample-password", user.password_hash)).toBe(true);
});
