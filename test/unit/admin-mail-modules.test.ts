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

test("Admin Mail Scheduler: Contextual Broadcast, immediate send, DatePicker schedule, and trigger execution", async () => {
  // 1. Create meeting in database
  database.run(
    `INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, status, access_status, publish_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["m-admin-test", "GraphQL Microservices", "Desc", "[]", "2026-10-15T14:00:00.000Z", "2026-10-15", "17:30", 60, "upcoming", "public", "public"]
  );
  // Add maya user as attendee
  const maya = database.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ?").get("maya@example.com");
  expect(maya).toBeDefined();
  database.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES (?, ?)", ["m-admin-test", maya!.id]);

  // 2. Immediate send (sendNow = true) with meet_attendees target mode
  const sendNowForm = new FormData();
  sendNowForm.set("title", "Instant Meet Attendees Reminder");
  sendNowForm.set("subject", "Your upcoming meet: {{meet_title}}");
  sendNowForm.set("format", "html");
  sendNowForm.set("targetMode", "meet_attendees");
  sendNowForm.set("meetId", "m-admin-test");
  sendNowForm.set("sendNow", "true");
  sendNowForm.set("body", "<p>Hi {{first_name}}, meet {{meet_title}} is on {{meet_date}} at {{meet_time}}.</p>");

  const instantRes = await app.request("/dashboard/admin/mail-scheduler/schedule", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: sendNowForm,
  });
  expect(instantRes.status).toBe(200);
  const instantHtml = await instantRes.text();
  expect(instantHtml).toContain("Broadcast sent immediately to 1 recipient(s)");

  const loggedImmediate = database
    .query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE title = ? AND status = 'sent'")
    .get("Instant Meet Attendees Reminder");
  expect(loggedImmediate).toBeDefined();
  expect(loggedImmediate?.sent_count).toBe(1);

  // 3. Schedule broadcast with scheduleDate and scheduleTime
  const schedulePickerForm = new FormData();
  schedulePickerForm.set("title", "Future Event Broadcast");
  schedulePickerForm.set("subject", "Event info: {{meet_title}}");
  schedulePickerForm.set("format", "text");
  schedulePickerForm.set("targetMode", "tag_followers");
  schedulePickerForm.set("meetId", "m-admin-test");
  schedulePickerForm.set("scheduleDate", "2026-11-20");
  schedulePickerForm.set("scheduleTime", "15:45");
  schedulePickerForm.set("body", "Hello {{name}}, event is {{meet_title}}");

  const futureSchedRes = await app.request("/dashboard/admin/mail-scheduler/schedule", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: schedulePickerForm,
  });
  expect(futureSchedRes.status).toBe(200);

  const futureJob = database
    .query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE title = ? AND status = 'pending'")
    .get("Future Event Broadcast");
  expect(futureJob).toBeDefined();
  expect(futureJob?.scheduled_for).toContain("2026-11-20");

  // 4. Test missing required fields validation
  const invalidForm = new FormData();
  invalidForm.set("title", "");
  const invalidRes = await app.request("/dashboard/admin/mail-scheduler/schedule", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: invalidForm,
  });
  expect(invalidRes.status).toBe(200);
  const invalidHtml = await invalidRes.text();
  expect(invalidHtml).toContain("Title, subject, and body are required");

  // 5. Test trigger execution for automated rules (tag_reminder, rsvp_reminder, welcome_email)
  const tagReminderRule = database
    .query<{ id: string }, [string]>("SELECT id FROM email_automation_rules WHERE rule_key = ?")
    .get("tag_reminder");
  expect(tagReminderRule).toBeDefined();

  const triggerTagRes = await app.request(`/dashboard/admin/mail-scheduler/rules/${tagReminderRule!.id}/trigger`, {
    method: "POST",
    headers: { cookie: adminCookie, "hx-request": "true" },
  });
  expect(triggerTagRes.status).toBe(200);

  const rsvpReminderRule = database
    .query<{ id: string }, [string]>("SELECT id FROM email_automation_rules WHERE rule_key = ?")
    .get("rsvp_reminder");
  expect(rsvpReminderRule).toBeDefined();

  const triggerRsvpRes = await app.request(`/dashboard/admin/mail-scheduler/rules/${rsvpReminderRule!.id}/trigger`, {
    method: "POST",
    headers: { cookie: adminCookie },
  });
  expect(triggerRsvpRes.status).toBe(200);

  const welcomeRule = database
    .query<{ id: string }, [string]>("SELECT id FROM email_automation_rules WHERE rule_key = ?")
    .get("welcome_email");
  expect(welcomeRule).toBeDefined();

  const triggerWelcomeRes = await app.request(`/dashboard/admin/mail-scheduler/rules/${welcomeRule!.id}/trigger`, {
    method: "POST",
    headers: { cookie: adminCookie },
  });
  expect(triggerWelcomeRes.status).toBe(200);
});

