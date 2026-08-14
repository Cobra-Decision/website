import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { createMeet } from "../src/modules/events/queries";
import { generateId } from "../src/lib/id";
import { handleImageUpload } from "../src/modules/admin/upload";

let database: Database;
let app: ReturnType<typeof createApp>;
let memberCookie: string;
let memberId: string;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  const passCaptcha: MiddlewareHandler = async (_, next) => next();
  app = createApp({ database, captcha: { middleware: passCaptcha, challengeHandler: (c) => c.json({}) } });

  const register = new FormData();
  register.set("email", "dashboard_user@example.com");
  register.set("password", "secret123");
  register.set("password_confirmation", "secret123");
  await app.request("/auth/register", { method: "POST", body: register });

  const login = new FormData();
  login.set("identifier", "dashboard_user@example.com");
  login.set("password", "secret123");
  const loginRes = await app.request("/auth/login", { method: "POST", body: login });
  memberCookie = loginRes.headers.get("set-cookie")!.split(";")[0];

  const user = database.query<{ id: string }, []>("SELECT id FROM users WHERE email = 'dashboard_user@example.com'").get()!;
  memberId = user.id;
});
afterEach(() => database.close());

test("GET /dashboard/user renders full dashboard with meets and filter bar", async () => {
  createMeet(database, {
    title: "Bun & Hono Masterclass",
    description: "Learn modern server-side TS",
    topics: ["Bun", "Hono"],
    scheduledDate: "2099-01-01",
    scheduledTime: "18:00",
    durationMinutes: 90,
    tagIds: [],
  });

  const res = await app.request("/dashboard/user", { headers: { cookie: memberCookie } });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("Bun &amp; Hono Masterclass");
  expect(html).toContain('hx-get="/dashboard/user/meets/filter"');
  expect(html).toContain("Attend Meeting");
  expect(html).toContain("CobraDecision");
});

test("GET /dashboard/user/meets/filter filters meets via HTMX", async () => {
  const tagId = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, ?)", [tagId, "Architecture"]);
  createMeet(database, {
    title: "System Architecture",
    description: "Designing large scale systems",
    topics: ["Architecture"],
    scheduledDate: "2099-01-01",
    scheduledTime: "18:00",
    tagIds: [tagId],
  });
  createMeet(database, {
    title: "Frontend CSS",
    description: "Tailwind UI",
    topics: ["CSS"],
    scheduledDate: "2099-01-02",
    scheduledTime: "18:00",
    tagIds: [],
  });

  const filterRes = await app.request(`/dashboard/user/meets/filter?tag_id=${tagId}`, {
    headers: { cookie: memberCookie, "HX-Request": "true" },
  });
  expect(filterRes.status).toBe(200);
  const html = await filterRes.text();
  expect(html).toContain("System Architecture");
  expect(html).not.toContain("Frontend CSS");
  expect(html).not.toContain("<!DOCTYPE html>");
});

test("POST and DELETE /meets/:id/attend toggles RSVP and updates UI", async () => {
  const meet = createMeet(database, {
    title: "RSVP Meetup",
    topics: [],
    scheduledDate: "2099-01-01",
    scheduledTime: "18:00",
    tagIds: [],
  });

  // Attend
  const attendRes = await app.request(`/meets/${meet.id}/attend`, {
    method: "POST",
    headers: { cookie: memberCookie, "HX-Request": "true" },
  });
  expect(attendRes.status).toBe(200);
  const attendHtml = await attendRes.text();
  expect(attendHtml).toContain("Cancel Attendance");
  expect(database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, memberId)).toBeTruthy();

  // Cancel
  const cancelRes = await app.request(`/meets/${meet.id}/attend`, {
    method: "DELETE",
    headers: { cookie: memberCookie, "HX-Request": "true" },
  });
  expect(cancelRes.status).toBe(200);
  const cancelHtml = await cancelRes.text();
  expect(cancelHtml).toContain("Attend Meeting");
  expect(database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, memberId)).toBeNull();
});

test("handleImageUpload validates file size and MIME type", async () => {
  const emptyRes = await handleImageUpload(null);
  expect(emptyRes).toEqual({});

  const invalidTypeFile = new File(["dummy content"], "test.txt", { type: "text/plain" });
  const invalidTypeRes = await handleImageUpload(invalidTypeFile);
  expect(invalidTypeRes.error).toContain("Invalid image format");

  const validFile = new File([new Uint8Array(100)], "test.png", { type: "image/png" });
  const validRes = await handleImageUpload(validFile);
  expect(validRes.error).toBeUndefined();
  expect(validRes.url).toContain("/uploads/meet_");
});
