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
  await seedSampleData(database);

  for (const table of ["roles", "users", "endpoints", "tags", "meets", "meet_attendees", "meet_tags", "contact_requests"]) {
    expect((database.query<{ total: number }, []>(`SELECT COUNT(*) total FROM ${table}`).get()!).total).toBeGreaterThan(0);
  }
  expect(database.query("SELECT COUNT(*) total FROM users WHERE email = 'maya@example.com'").get()).toEqual({ total: 1 });
  expect(database.query("SELECT COUNT(*) total FROM meets WHERE title = 'Designing with Bun'").get()).toEqual({ total: 1 });
});
