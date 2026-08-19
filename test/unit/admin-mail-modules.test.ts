import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../../src/app";
import { initializeDatabase } from "../../src/modules/auth/database";
import { initializeEventsDatabase } from "../../src/modules/events/database";
import { initializeLandingDatabase } from "../../src/modules/landing/database";
import { initializeMailerDatabase } from "../../src/modules/mailer/database";
import { seedSampleData } from "../../src/lib/seed";
import type { EmailTemplateRow, ScheduledEmailRow } from "../../src/modules/mailer/database";

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

test("Admin Mail Editor CRUD: render view, save template, delete template", async () => {
  // 1. Render Mail Editor page
  const viewRes = await app.request("/dashboard/admin/mail-editor", {
    headers: { cookie: adminCookie },
  });
  expect(viewRes.status).toBe(200);
  const viewHtml = await viewRes.text();
  expect(viewHtml).toContain("Mail Editor");
  expect(viewHtml).toContain("welcome_email");

  // 2. Save new dynamic email template
  const saveForm = new FormData();
  saveForm.set("title", "custom_workshop_invite");
  saveForm.set("subject", "Exclusive Workshop: {{meet_title}}");
  saveForm.set("format", "markdown");
  saveForm.set("description", "Sent to selected VIP developers");
  saveForm.set("value", "### Hello {{name}}\n\nYou are invited to **{{meet_title}}**.");

  const saveRes = await app.request("/dashboard/admin/mail-editor/save", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: saveForm,
  });
  expect(saveRes.status).toBe(200);

  const savedTpl = database
    .query<EmailTemplateRow, [string]>("SELECT * FROM emails_schema WHERE title = ? AND deleted_at IS NULL")
    .get("custom_workshop_invite");
  expect(savedTpl).toBeDefined();
  expect(savedTpl?.subject).toBe("Exclusive Workshop: {{meet_title}}");
  expect(savedTpl?.format).toBe("markdown");

  // 3. Delete template
  const deleteRes = await app.request(`/dashboard/admin/mail-editor/delete?id=${savedTpl!.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
  });
  expect(deleteRes.status).toBe(200);
  const deletedTpl = database
    .query<EmailTemplateRow, [string]>("SELECT * FROM emails_schema WHERE id = ? AND deleted_at IS NULL")
    .get(savedTpl!.id);
  expect(deletedTpl).toBeNull();
});

test("Admin Mail Scheduler CRUD: schedule broadcast, cancel job, delete job", async () => {
  // 1. Render Mail Scheduler page
  const viewRes = await app.request("/dashboard/admin/mail-scheduler", {
    headers: { cookie: adminCookie },
  });
  expect(viewRes.status).toBe(200);
  const viewHtml = await viewRes.text();
  expect(viewHtml).toContain("Mail Scheduler");

  // 2. Schedule email broadcast
  const schedForm = new FormData();
  schedForm.set("title", "Weekend Meetup Blast");
  schedForm.set("subject", "Join our weekend session {{name}}");
  schedForm.set("format", "html");
  schedForm.set("targetMode", "domain");
  schedForm.set("domain", "example.com");
  schedForm.set("scheduledFor", "2099-01-01T12:00");
  schedForm.set("body", "<h2>Hello {{name}}</h2><p>Check out the meetup!</p>");

  const schedRes = await app.request("/dashboard/admin/mail-scheduler/schedule", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: schedForm,
  });
  expect(schedRes.status).toBe(200);

  const scheduledJob = database
    .query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE title = ? AND deleted_at IS NULL")
    .get("Weekend Meetup Blast");
  expect(scheduledJob).toBeDefined();
  expect(scheduledJob?.status).toBe("pending");
  expect(scheduledJob?.target_mode).toBe("domain");

  // 3. Repeat scheduled job
  const repeatRes = await app.request(`/dashboard/admin/mail-scheduler/repeat?id=${scheduledJob!.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
  });
  expect(repeatRes.status).toBe(200);
  const repeatedJob = database
    .query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE title LIKE ? AND deleted_at IS NULL")
    .get("Weekend Meetup Blast (Repeated)");
  expect(repeatedJob).toBeDefined();
  expect(repeatedJob?.status).toBe("pending");

  // 4. Cancel scheduled job
  const cancelRes = await app.request(`/dashboard/admin/mail-scheduler/cancel?id=${scheduledJob!.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
  });
  expect(cancelRes.status).toBe(200);
  const cancelledJob = database
    .query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE id = ?")
    .get(scheduledJob!.id);
  expect(cancelledJob?.status).toBe("cancelled");

  // 5. Delete scheduled job
  const deleteRes = await app.request(`/dashboard/admin/mail-scheduler/delete?id=${scheduledJob!.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
  });
  expect(deleteRes.status).toBe(200);
  const deletedJob = database
    .query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE id = ? AND deleted_at IS NULL")
    .get(scheduledJob!.id);
  expect(deletedJob).toBeNull();
});

test("Admin Mail Management: send batch email with format and variables", async () => {
  // 1. Render Mail Management page
  const viewRes = await app.request("/dashboard/admin/mail-management", {
    headers: { cookie: adminCookie },
  });
  expect(viewRes.status).toBe(200);
  const viewHtml = await viewRes.text();
  expect(viewHtml).toContain("Mail Management");
  expect(viewHtml).toContain("Compose Batch / Stack Email");

  // 2. Dispatch batch email in markdown format
  const sendForm = new FormData();
  sendForm.set("targetMode", "all");
  sendForm.set("subject", "Community Update: {{date_shamsi}}");
  sendForm.set("format", "markdown");
  sendForm.set("body", "### Hello {{name}}\n\nCheck out [CobraDecision]({{dashboard_url}}).");

  const sendRes = await app.request("/dashboard/admin/mailer/send", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: sendForm,
  });
  expect(sendRes.status).toBe(200);
  const sendHtml = await sendRes.text();
  expect(sendHtml).toContain("Enqueued 3 batch email(s)");
});

