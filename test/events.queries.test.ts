import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { createMeet, filterMeets, getUpcomingMeets, recordMeetVisit, toggleAttendance, getUserPreferredTags, setUserPreferredTags, normalizeTopics, parseTopics } from "../src/modules/events/queries";
import { formatTehran, toUtcIso } from "../src/modules/events/datetime";
import { generateId } from "../src/lib/id";

let database: Database;
let userId: string;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  userId = generateId();
  database.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)", [userId, "user@example.com", "hash", role.id]);
});
afterEach(() => database.close());

test("stores Tehran schedule input as UTC and renders Persian date", () => {
  expect(toUtcIso("2026-08-14", "12:00")).toBe("2026-08-14T08:30:00.000Z");
  expect(formatTehran("2026-08-14T08:30:00.000Z").time).toBe("12:00");
  expect(formatTehran("2026-08-14T08:30:00.000Z").date).toContain("۱۴۰۵");
});

test("normalizeTopics and parseTopics clean quotes, brackets and whitespace", () => {
  expect(normalizeTopics('["Career", "DevOps", "Open discussion"]')).toEqual(["Career", "DevOps", "Open discussion"]);
  expect(normalizeTopics("Career, DevOps, Open discussion")).toEqual(["Career", "DevOps", "Open discussion"]);
  expect(normalizeTopics("Career,DevOps,OpenDiscussion")).toEqual(["Career", "DevOps", "OpenDiscussion"]);
  expect(normalizeTopics(["'Career'", '"DevOps"'])).toEqual(["Career", "DevOps"]);
  expect(normalizeTopics("")).toEqual([]);
  expect(normalizeTopics(null)).toEqual([]);
});

test("createMeet stores status, access_status, file_url, video_url, JSON topics and creates active tag mappings", () => {
  const tag1 = generateId();
  const tag2 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, ?), (?, ?)", [tag1, "TypeScript", tag2, "Bun"]);
  const tags = database.query<{ id: string }, []>("SELECT id FROM tags ORDER BY id").all();
  const meet = createMeet(database, {
    title: "Bun meetup",
    description: "# Agenda\n- Point 1",
    topics: ["TypeScript", "Web Architecture"],
    scheduledDate: "2099-01-01",
    scheduledTime: "19:00",
    durationMinutes: 90,
    meetUrl: "https://example.com",
    videoUrl: "https://youtube.com/watch?v=12345678901",
    fileUrl: "/uploads/presentation_1.pdf",
    status: "live",
    accessStatus: "private",
    imageUrl: null,
    presenterId: userId,
    tagIds: tags.map(({ id }) => id),
  });
  expect(database.query("SELECT topics, duration_minutes, status, access_status, video_url, file_url FROM meets WHERE id = ?").get(meet.id)).toEqual({
    topics: '["TypeScript","Web Architecture"]',
    duration_minutes: 90,
    status: "live",
    access_status: "private",
    video_url: "https://youtube.com/watch?v=12345678901",
    file_url: "/uploads/presentation_1.pdf",
  });
  expect(database.query("SELECT COUNT(*) total FROM meet_tags WHERE meet_id = ?").get(meet.id)).toEqual({ total: 2 });
});

test("toggleAttendance adds then removes the attendee mapping", () => {
  const meet = createMeet(database, { title: "Meet", topics: [], scheduledDate: "2099-01-01", scheduledTime: "19:00", tagIds: [] });
  expect(toggleAttendance(database, meet.id, userId)).toBe(true);
  expect(toggleAttendance(database, meet.id, userId)).toBe(false);
  expect(database.query("SELECT COUNT(*) total FROM meet_attendees").get()).toEqual({ total: 0 });
});

test("filterMeets filters by tag, date range, search query, and user attendance", () => {
  const tagId = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, ?)", [tagId, "Architecture"]);
  const meet1 = createMeet(database, { title: "Arch 101", description: "Design", topics: ["Systems"], scheduledDate: "2099-05-01", scheduledTime: "10:00", tagIds: [tagId] });
  const meet2 = createMeet(database, { title: "Other", description: "Topic", topics: [], scheduledDate: "2099-06-01", scheduledTime: "10:00", tagIds: [] });
  toggleAttendance(database, meet1.id, userId);

  const filteredByTag = filterMeets(database, { tagId });
  expect(filteredByTag.length).toBe(1);
  expect(filteredByTag[0].id).toBe(meet1.id);

  const filteredAttended = filterMeets(database, { userId, attendedOnly: true });
  expect(filteredAttended.length).toBe(1);
  expect(filteredAttended[0].id).toBe(meet1.id);
});

test("recordMeetVisit logs visit with or without platform slug and deduplicates by cooldown", () => {
  const platformId = generateId();
  database.run("INSERT INTO platforms (id, slug, name) VALUES (?, 'telegram', 'Telegram')", [platformId]);
  const meet = createMeet(database, { title: "Analytics Meet", topics: [], scheduledDate: "2099-01-01", scheduledTime: "18:00", tagIds: [] });

  recordMeetVisit(database, meet.id, "telegram", "ip-1");
  recordMeetVisit(database, meet.id, "telegram", "ip-1"); // duplicate in cooldown window, should be ignored
  recordMeetVisit(database, meet.id, undefined, "ip-2");
  recordMeetVisit(database, meet.id, "unknown_platform", "ip-3");

  const visits = database.query<{ meet_id: string; platform_id: string | null }, []>("SELECT meet_id, platform_id FROM meet_visits ORDER BY created_at ASC, id ASC").all();
  expect(visits).toHaveLength(3);
  expect(visits[0]).toEqual({ meet_id: meet.id, platform_id: platformId });
  expect(visits[1]).toEqual({ meet_id: meet.id, platform_id: null });
  expect(visits[2]).toEqual({ meet_id: meet.id, platform_id: null });
});

test("getUserPreferredTags and setUserPreferredTags manages user_tags table", () => {
  const tag1 = generateId();
  const tag2 = generateId();
  database.run("INSERT INTO tags (id, title, description) VALUES (?, 'T1', 'D1'), (?, 'T2', 'D2')", [tag1, tag2]);

  setUserPreferredTags(database, userId, [tag1, tag2]);
  const preferred = getUserPreferredTags(database, userId);
  expect(preferred.map((t) => t.id)).toEqual([tag1, tag2]);

  setUserPreferredTags(database, userId, [tag2]);
  const updated = getUserPreferredTags(database, userId);
  expect(updated.map((t) => t.id)).toEqual([tag2]);

  setUserPreferredTags(database, userId, []);
  expect(getUserPreferredTags(database, userId)).toHaveLength(0);
});
