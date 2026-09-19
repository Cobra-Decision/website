import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../../src/app";
import { initializeDatabase } from "../../src/modules/auth/database";
import { initializeEventsDatabase } from "../../src/modules/events/database";
import { initializeLandingDatabase } from "../../src/modules/landing/database";
import { initializeMailerDatabase } from "../../src/modules/mailer/database";
import { seedSampleData } from "../../src/lib/seed";
import { generateId } from "../../src/lib/id";

let database: Database;
let app: ReturnType<typeof createApp>;
let adminCookie: string;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  initializeLandingDatabase(database);
  initializeMailerDatabase(database);
  await seedSampleData(database);

  const passCaptcha: MiddlewareHandler = async (_, next) => next();
  app = createApp({ database, captcha: { middleware: passCaptcha, challengeHandler: (c) => c.json({}) } });

  // Login as admin
  const loginForm = new FormData();
  loginForm.set("identifier", "alex.admin@example.com");
  loginForm.set("password", "sample-password");
  const loginRes = await app.request("/auth/login", { method: "POST", body: loginForm });
  adminCookie = loginRes.headers.get("set-cookie")!.split(";")[0];
});

afterEach(() => {
  database.close();
});

test("Admin Meeting Form dialog renders publish_status and user picker", async () => {
  // 1. GET /dashboard/admin/meets/new
  const newRes = await app.request("/dashboard/admin/meets/new", {
    headers: { cookie: adminCookie },
  });
  expect(newRes.status).toBe(200);
  const newHtml = await newRes.text();
  expect(newHtml).toContain('name="publish_status"');
  expect(newHtml).toContain("Listing Visibility");
  expect(newHtml).toContain("publishStatus === &#39;restricted&#39;");
  expect(newHtml).toContain("Allowed Users");

  // 2. Create a restricted meet with selected users
  const user1 = database.query<{ id: string }, []>("SELECT id FROM users WHERE email='maya@example.com'").get()!;
  const user2 = database.query<{ id: string }, []>("SELECT id FROM users WHERE email='noah@example.com'").get()!;

  const form = new FormData();
  form.set("title", "Restricted VIP Meet");
  form.set("description", "VIP exclusive discussion");
  form.set("scheduled_date", "2026-10-15");
  form.set("scheduled_time", "18:00");
  form.set("duration_minutes", "60");
  form.set("status", "upcoming");
  form.set("publish_status", "restricted");
  form.set("access_status", "public");
  form.append("allowed_user_ids", user1.id);
  form.append("allowed_user_ids", user2.id);

  const createRes = await app.request("/dashboard/admin/meets", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: form,
  });
  expect(createRes.status).toBe(200);

  const createdMeet = database.query<{ id: string; publish_status: string }, []>(
    "SELECT id, publish_status FROM meets WHERE title = 'Restricted VIP Meet'"
  ).get()!;
  expect(createdMeet).toBeDefined();
  expect(createdMeet.publish_status).toBe("restricted");

  const allowedUsers = database.query<{ user_id: string }, [string]>(
    "SELECT user_id FROM meet_allowed_users WHERE meet_id = ?"
  ).all(createdMeet.id);
  expect(allowedUsers.length).toBe(2);
  expect(allowedUsers.map(u => u.user_id)).toContain(user1.id);
  expect(allowedUsers.map(u => u.user_id)).toContain(user2.id);

  // 3. Edit meet dialog loads existing allowed_user_ids
  const editRes = await app.request(`/dashboard/admin/meets/${createdMeet.id}/edit`, {
    headers: { cookie: adminCookie },
  });
  expect(editRes.status).toBe(200);
  const editHtml = await editRes.text();
  expect(editHtml).toContain(user1.id);
  expect(editHtml).toContain(user2.id);

  // 4. Update meet to public clears/syncs allowed users
  const updateForm = new FormData();
  updateForm.set("title", "Restricted VIP Meet (Now Public)");
  updateForm.set("scheduled_date", "2026-10-15");
  updateForm.set("scheduled_time", "18:00");
  updateForm.set("duration_minutes", "60");
  updateForm.set("status", "upcoming");
  updateForm.set("publish_status", "public");
  updateForm.set("access_status", "public");

  const updateRes = await app.request(`/dashboard/admin/meets/${createdMeet.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
    body: updateForm,
  });
  expect(updateRes.status).toBe(200);

  const updatedAllowed = database.query<{ user_id: string }, [string]>(
    "SELECT user_id FROM meet_allowed_users WHERE meet_id = ?"
  ).all(createdMeet.id);
  expect(updatedAllowed.length).toBe(0);
});

test("Admin meets list: non-Super Admin filters out private meets", async () => {
  // Create a private meet
  const privId = generateId();
  database.run(
    "INSERT INTO meets (id, title, scheduled_date, scheduled_time, duration_minutes, status, publish_status, access_status) VALUES (?, 'Super Secret Private Meet', '2026-11-01', '10:00', 60, 'upcoming', 'private', 'public')",
    [privId]
  );

  // 1. Super Admin sees it
  const superRes = await app.request("/dashboard/admin/meets", {
    headers: { cookie: adminCookie },
  });
  expect(superRes.status).toBe(200);
  const superHtml = await superRes.text();
  expect(superHtml).toContain("Super Secret Private Meet");

  // 2. Regular Admin (non-Super Admin role with access to /dashboard/admin/meets)
  const regularAdminRole = generateId();
  database.run("INSERT INTO roles (id, title, description) VALUES (?, 'Custom Admin', 'Limited admin')", [regularAdminRole]);
  const ep = database.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/meets")!;
  database.run("INSERT INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)", [
    generateId(), regularAdminRole, ep.id, "Access meets"
  ]);

  const customAdminUser = generateId();
  database.run(
    "INSERT INTO users (id, email, password_hash, role_id) VALUES (?, 'custom.admin@example.com', ?, ?)",
    [customAdminUser, await Bun.password.hash("password123"), regularAdminRole]
  );

  const customLogin = new FormData();
  customLogin.set("identifier", "custom.admin@example.com");
  customLogin.set("password", "password123");
  const customLoginRes = await app.request("/auth/login", { method: "POST", body: customLogin });
  const customCookie = customLoginRes.headers.get("set-cookie")!.split(";")[0];

  const customRes = await app.request("/dashboard/admin/meets", {
    headers: { cookie: customCookie },
  });
  expect(customRes.status).toBe(200);
  const customHtml = await customRes.text();
  expect(customHtml).not.toContain("Super Secret Private Meet");
});

