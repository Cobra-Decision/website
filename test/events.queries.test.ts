import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { createMeet, getUpcomingMeets, toggleAttendance } from "../src/modules/events/queries";

let database: Database;
let userId: number;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  database.run("INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)", ["user@example.com", "hash", role.id]);
  userId = database.query<{ id: number }, []>("SELECT id FROM users WHERE email = 'user@example.com'").get()!.id;
});
afterEach(() => database.close());

test("createMeet stores JSON topics and creates active tag mappings", () => {
  database.run("INSERT INTO tags (title) VALUES ('TypeScript'), ('Bun')");
  const tags = database.query<{ id: number }, []>("SELECT id FROM tags ORDER BY id").all();
  const meet = createMeet(database, {
    title: "Bun meetup", topics: ["TypeScript", "Web Architecture"], scheduledDate: "2099-01-01",
    scheduledTime: "19:00", durationMinutes: 90, meetUrl: "https://example.com", imageUrl: null,
    presenterId: userId, tagIds: tags.map(({ id }) => id),
  });
  expect(database.query("SELECT topics, duration_minutes FROM meets WHERE id = ?").get(meet.id)).toEqual({
    topics: '["TypeScript","Web Architecture"]', duration_minutes: 90,
  });
  expect(database.query("SELECT COUNT(*) total FROM meet_tags WHERE meet_id = ?").get(meet.id)).toEqual({ total: 2 });
});

test("toggleAttendance adds then removes the attendee mapping", () => {
  const meet = createMeet(database, { title: "Meet", topics: [], scheduledDate: "2099-01-01", scheduledTime: "19:00", tagIds: [] });
  expect(toggleAttendance(database, meet.id, userId)).toBe(true);
  expect(toggleAttendance(database, meet.id, userId)).toBe(false);
  expect(database.query("SELECT COUNT(*) total FROM meet_attendees").get()).toEqual({ total: 0 });
});

test("getUpcomingMeets excludes soft-deleted meets and tags", () => {
  database.run("INSERT INTO tags (title) VALUES ('Active'), ('Deleted')");
  const tags = database.query<{ id: number; title: string }, []>("SELECT id, title FROM tags ORDER BY id").all();
  const active = createMeet(database, { title: "Upcoming", topics: ["Bun"], scheduledDate: "2099-01-01", scheduledTime: "19:00", tagIds: tags.map(({ id }) => id) });
  const deleted = createMeet(database, { title: "Deleted", topics: [], scheduledDate: "2099-01-02", scheduledTime: "19:00", tagIds: [] });
  toggleAttendance(database, active.id, userId);
  database.run("UPDATE tags SET deleted_at = CURRENT_TIMESTAMP WHERE title = 'Deleted'");
  database.run("UPDATE meets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [deleted.id]);

  expect(getUpcomingMeets(database)).toEqual([{
    id: active.id, title: "Upcoming", topics: ["Bun"], scheduled_date: "2099-01-01", scheduled_time: "19:00",
    duration_minutes: 60, meet_url: null, image_url: null, presenter_id: null, created_at: expect.any(String),
    updated_at: expect.any(String), deleted_at: null, attendee_count: 1, presenter: null, attendee_ids: [userId], tags: [{ id: tags[0]!.id, title: "Active", description: null, created_at: expect.any(String), updated_at: expect.any(String), deleted_at: null }],
  }]);
});
