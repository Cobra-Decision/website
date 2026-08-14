import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { getLandingCache, initCache } from "../src/lib/cache";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { initializeLandingDatabase } from "../src/modules/landing/database";
import { createMeet } from "../src/modules/events/queries";

let database: Database;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  initializeLandingDatabase(database);
  const captcha: MiddlewareHandler = async (_, next) => next();
  app = createApp({ database, captcha: { middleware: captcha, challengeHandler: (c) => c.json({}) } });
});
afterEach(() => database.close());

test("startup cache stores user statistics and active upcoming meets", async () => {
  const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  database.run("INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)", ["user@example.com", "hash", role.id]);
  createMeet(database, { title: "Bun meetup", topics: ["Bun"], scheduledDate: "2099-01-01", scheduledTime: "18:00", durationMinutes: 90, imageUrl: "https://example.com/poster.jpg", tagIds: [] });

  initCache(database);
  expect(getLandingCache()).toMatchObject({ totalUsers: 1, totalMeetHours: 1.5, meets: [{ title: "Bun meetup" }] });
});

test("landing renders cached content and contact endpoint persists valid emails", async () => {
  initCache(database);
  const page = await app.request("/");
  const html = await page.text();
  expect(html).toContain("Community members");
  expect(html).toContain('hx-post="/api/contact"');
  expect(html).toContain("scroll-smooth");
  expect(html).toContain("Featured conversations");
  expect(html).toContain("No upcoming meets yet.");

  const form = new FormData();
  form.set("email", "hello@example.com");
  const contact = await app.request("/api/contact", { method: "POST", body: form });
  expect(contact.status).toBe(200);
  expect(await contact.text()).toContain("Thanks");
  expect(database.query("SELECT email FROM contact_requests").get()).toEqual({ email: "hello@example.com" });
});

test("contact endpoint rejects invalid email", async () => {
  const form = new FormData();
  form.set("email", "not-an-email");
  const response = await app.request("/api/contact", { method: "POST", body: form });
  expect(response.status).toBe(400);
  const html = await response.text();
  expect(html).toContain('role="alert"');
  expect(html).toContain('id="contact-result"');
});
