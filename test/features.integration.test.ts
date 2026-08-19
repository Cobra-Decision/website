import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { createMeet } from "../src/modules/events/queries";
import { generateId } from "../src/lib/id";
import { handleImageUpload, handlePresentationUpload } from "../src/modules/admin/upload";

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

  // Create 3 sample tags
  const tag1 = generateId(), tag2 = generateId(), tag3 = generateId();
  database.run("INSERT INTO tags (id, title, description) VALUES (?, 'T1', 'D1'), (?, 'T2', 'D2'), (?, 'T3', 'D3')", [tag1, tag2, tag3]);

  const register = new FormData();
  register.set("email", "dashboard_user@example.com");
  register.set("password", "secret123");
  register.set("password_confirmation", "secret123");
  register.append("tagIds", tag1);
  register.append("tagIds", tag2);
  register.append("tagIds", tag3);
  await app.request("/auth/register", { method: "POST", body: register });

  const otpRecord = database.query<{ otp_code: string }, [string]>("SELECT otp_code FROM registration_otps WHERE email = ?").get("dashboard_user@example.com");
  const verifyForm = new FormData();
  verifyForm.set("email", "dashboard_user@example.com");
  verifyForm.set("otp", otpRecord!.otp_code);
  await app.request("/auth/verify-otp", { method: "POST", body: verifyForm });

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

test("GET /meets/:id renders public meeting with direct room URL and markdown", async () => {
  const meet = createMeet(database, {
    title: "Public Rust Talk",
    description: "## Deep dive\n\n- **Safety**\n- *Concurrency*",
    topics: ["Rust"],
    scheduledDate: "2099-01-01",
    scheduledTime: "18:00",
    meetUrl: "https://meet.jit.si/rust-room",
    fileUrl: "/uploads/rust_slides.pdf",
    accessStatus: "public",
    status: "live",
    tagIds: [],
  });

  const res = await app.request(`/meets/${meet.id}`);
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("Public Rust Talk");
  expect(html).toContain("Deep dive</h2>");
  expect(html).toContain("<strong>Safety</strong>");
  expect(html).toContain("Download Presentation");
  expect(html).toContain("https://meet.jit.si/rust-room");
});

test("GET /meets/:id hides private meeting room URL for non-attendees and shows when attending", async () => {
  const meet = createMeet(database, {
    title: "Private Exec Sync",
    description: "Confidential roadmap discussion",
    topics: ["Strategy"],
    scheduledDate: "2099-01-01",
    scheduledTime: "18:00",
    meetUrl: "https://meet.jit.si/secret-room",
    accessStatus: "private",
    status: "upcoming",
    tagIds: [],
  });

  // Non-attending guest / member
  const guestRes = await app.request(`/meets/${meet.id}`);
  const guestHtml = await guestRes.text();
  expect(guestHtml).not.toContain("https://meet.jit.si/secret-room");
  expect(guestHtml).toContain("Private Meeting Access");
  expect(guestHtml).toContain('href="/auth"');

  // Member attends
  await app.request(`/meets/${meet.id}/attend`, {
    method: "POST",
    headers: { cookie: memberCookie },
  });

  const attendeeRes = await app.request(`/meets/${meet.id}`, {
    headers: { cookie: memberCookie },
  });
  const attendeeHtml = await attendeeRes.text();
  expect(attendeeHtml).toContain("https://meet.jit.si/secret-room");
  expect(attendeeHtml).toContain("Join Meeting URL");
});

test("GET /locale/:lang switches language cookie and redirects", async () => {
  const res = await app.request("/locale/fa");
  expect(res.status).toBe(302);
  expect(res.headers.get("set-cookie")).toContain("locale=fa");

  const faLandingRes = await app.request("/", {
    headers: { cookie: "locale=fa" },
  });
  const faHtml = await faLandingRes.text();
  expect(faHtml).toContain('lang="fa"');
  expect(faHtml).toContain('dir="rtl"');
  expect(faHtml).toContain("تصمیم کبرا");

  const faLoginRes = await app.request("/auth", {
    headers: { cookie: "locale=fa" },
  });
  const faLoginHtml = await faLoginRes.text();
  expect(faLoginHtml).toContain('lang="fa"');
  expect(faLoginHtml).toContain('dir="rtl"');
  expect(faLoginHtml).toContain("خوش آمدید");
  expect(faLoginHtml).toContain("ورود به حساب");

  const faRegisterRes = await app.request("/auth/register", {
    headers: { cookie: "locale=fa" },
  });
  const faRegisterHtml = await faRegisterRes.text();
  expect(faRegisterHtml).toContain('lang="fa"');
  expect(faRegisterHtml).toContain('dir="rtl"');
  expect(faRegisterHtml).toContain("ایجاد حساب کاربری");
  expect(faRegisterHtml).toContain("مشخصات تکمیلی");
});

test("handleImageUpload and handlePresentationUpload validate file size and upload correctly", async () => {
  const emptyRes = await handleImageUpload(null);
  expect(emptyRes).toEqual({});

  const invalidTypeFile = new File(["dummy content"], "test.txt", { type: "text/plain" });
  const invalidTypeRes = await handleImageUpload(invalidTypeFile);
  expect(invalidTypeRes.error).toContain("Invalid image format");

  const validImgFile = new File([new Uint8Array(100)], "test.png", { type: "image/png" });
  const validImgRes = await handleImageUpload(validImgFile);
  expect(validImgRes.error).toBeUndefined();
  expect(validImgRes.url).toContain("/uploads/meet_img_");

  const validDocFile = new File([new Uint8Array(200)], "presentation.pdf", { type: "application/pdf" });
  const validDocRes = await handlePresentationUpload(validDocFile);
  expect(validDocRes.error).toBeUndefined();
  expect(validDocRes.url).toContain("/uploads/presentation_");
});

test("POST /dashboard/admin/meets creates and updates meet with multiple tags", async () => {
  const superAdminRole = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'Super Admin'").get()!;
  database.run("UPDATE users SET role_id = ? WHERE id = ?", [superAdminRole.id, memberId]);

  const login = new FormData();
  login.set("identifier", "dashboard_user@example.com");
  login.set("password", "secret123");
  const loginRes = await app.request("/auth/login", { method: "POST", body: login });
  const adminCookie = loginRes.headers.get("set-cookie")!.split(";")[0];

  const tagA = generateId(), tagB = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'Tag A'), (?, 'Tag B')", [tagA, tagB]);

  const createForm = new FormData();
  createForm.set("title", "Multi Tag Meet");
  createForm.set("description", "Testing multiple tags");
  createForm.set("scheduled_date", "2099-05-01");
  createForm.set("scheduled_time", "19:00");
  createForm.set("duration_minutes", "60");
  createForm.append("tag_ids", tagA);
  createForm.append("tag_ids", tagB);

  const createRes = await app.request("/dashboard/admin/meets", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: createForm,
  });
  expect(createRes.status).toBe(200);

  const meet = database.query<{ id: string }, [string]>("SELECT id FROM meets WHERE title = ?").get("Multi Tag Meet")!;
  const meetTags = database.query<{ tag_id: string }, [string]>("SELECT tag_id FROM meet_tags WHERE meet_id = ? ORDER BY tag_id").all(meet.id);
  expect(meetTags.map((t) => t.tag_id).sort()).toEqual([tagA, tagB].sort());

  // Update meet to only have tagA
  const updateForm = new FormData();
  updateForm.set("title", "Multi Tag Meet Updated");
  updateForm.set("description", "Testing single tag update");
  updateForm.set("scheduled_date", "2099-05-01");
  updateForm.set("scheduled_time", "19:00");
  updateForm.set("duration_minutes", "60");
  updateForm.append("tag_ids", tagA);

  const updateRes = await app.request(`/dashboard/admin/meets/${meet.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
    body: updateForm,
  });
  expect(updateRes.status).toBe(200);

  const updatedMeetTags = database.query<{ tag_id: string }, [string]>("SELECT tag_id FROM meet_tags WHERE meet_id = ?").all(meet.id);
  expect(updatedMeetTags.map((t) => t.tag_id)).toEqual([tagA]);
});
