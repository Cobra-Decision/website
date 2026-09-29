import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import {
  normalizeBaseUrl,
  renderWelcomeTemplate,
  renderAttendanceConfirmationTemplate,
  renderAttendeesReminderTemplate,
  renderTagReminderTemplate,
  interpolateVariables,
} from "./templates";
import { runMigrations } from "../../lib/database/migration";
import { seedMailer, seedRoles } from "../../lib/database/seeding";
import { initializeMailerDatabase } from "./database";

test("normalizeBaseUrl handles trailing slashes and undefined", () => {
  expect(normalizeBaseUrl("https://cobradecision.ir/")).toBe("https://cobradecision.ir");
  expect(normalizeBaseUrl("https://cobradecision.ir///")).toBe("https://cobradecision.ir");
  expect(normalizeBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  expect(normalizeBaseUrl("")).toBe("http://localhost:3000");
});

test("interpolateVariables replaces known keys and keeps unknown placeholders intact", () => {
  const tpl = "Hello {{name}}, meet: {{meet_title}}, date: {{date}}! {{unknown_var}}";
  const vars = { name: "Ali", meet_title: "Tech Meet", date: "2026-08-25" };
  const res = interpolateVariables(tpl, vars);
  expect(res).toBe("Hello Ali, meet: Tech Meet, date: 2026-08-25! {{unknown_var}}");
});

test("renderAttendeesReminderTemplate produces clean link without double slash", () => {
  const meet = {
    id: "00mt8p5yts006d1u060c0t",
    title: "Bun & SQLite Architecture",
    scheduledDate: "2026-09-01",
    scheduledTime: "18:00",
    durationMinutes: 60,
    presenterName: "Reza",
    status: "upcoming",
    accessStatus: "public",
  };
  const user = {
    firstName: "Sara",
    lastName: "Ahmadi",
    email: "sara@example.com",
    username: "sara_dev",
  };

  const output = renderAttendeesReminderTemplate(meet, user, "https://cobradecision.ir/");
  expect(output.html).toContain("https://cobradecision.ir/meets/00mt8p5yts006d1u060c0t?ref=gmail");
  expect(output.html).not.toContain("https://cobradecision.ir//meets/");
  expect(output.text).toContain("https://cobradecision.ir/meets/00mt8p5yts006d1u060c0t?ref=gmail");
});

test("All templates render properly with database fallback & dynamic schemas", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  initializeMailerDatabase(db);

  const meet = {
    id: "m-123",
    title: "AI & Fast Monoliths",
    scheduledDate: "2026-09-05",
    scheduledTime: "19:00",
    durationMinutes: 45,
    status: "upcoming",
    accessStatus: "public",
  };
  const user = { email: "test@example.com", firstName: "Dev" };

  const welcome = renderWelcomeTemplate(user, "https://cobradecision.ir/", db);
  expect(welcome.html).toContain("https://cobradecision.ir/dashboard/user");

  const rsvp = renderAttendanceConfirmationTemplate(meet, user, "https://cobradecision.ir/", db);
  expect(rsvp.html).toContain("https://cobradecision.ir/meets/m-123?ref=gmail");
  expect(rsvp.html).not.toContain("//meets");

  const tagRem = renderTagReminderTemplate(meet, user, ["Bun", "Hono"], "https://cobradecision.ir/", db);
  expect(tagRem.html).toContain("https://cobradecision.ir/meets/m-123?ref=gmail");
  expect(tagRem.html).not.toContain("//meets");
});

test("isTimeToRun correctly compares against target timezone and hour", () => {
  const { isTimeToRun } = require("./scheduler");
  expect(typeof isTimeToRun("06:00")).toBe("boolean");
  expect(isTimeToRun("00:00", "UTC")).toBe(true);
  expect(isTimeToRun("00:00", "Asia/Tehran")).toBe(true);
  expect(isTimeToRun("00:00", "America/New_York")).toBe(true);
  expect(isTimeToRun("23:59", "UTC")).toBeDefined();
});

test("general_announcement template renders markdown and includes variables correctly", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  initializeMailerDatabase(db);

  const tpl = db
    .query<{ value: string; subject: string; format: string }, [string]>(
      "SELECT value, subject, format FROM emails_schema WHERE title = ?"
    )
    .get("general_announcement");

  expect(tpl).toBeDefined();
  expect(tpl?.format).toBe("markdown");
  const interpolated = interpolateVariables(tpl!.value, {
    name: "Mohammad",
    dashboard_url: "https://cobradecision.ir/dashboard/user",
    date: "2026-08-26",
    date_shamsi: "۵ شهریور ۱۴۰۵",
  });
  expect(interpolated).toContain("Mohammad");
  expect(interpolated).toContain("https://cobradecision.ir/dashboard/user");
  expect(interpolated).toContain("۵ شهریور ۱۴۰۵");
});

test("mailService.sendBatchEmails interpolates meeting variables and targets attendees", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  initializeMailerDatabase(db);
  const { mailService } = await import("./service");

  const memberRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");

  // Create user
  db.run(
    "INSERT INTO users (id, email, first_name, last_name, username, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["u-1", "attendee@example.com", "Sina", "Rad", "sina", "hash", memberRole!.id]
  );
  // Create meet
  db.run(
    `INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, status, access_status, publish_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["m-test", "Architecture Workshop", "Desc", "[]", "2026-09-30T14:30:00.000Z", "2026-09-30", "18:00", 60, "upcoming", "public", "public"]
  );
  // Add attendee
  db.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES (?, ?)", ["m-test", "u-1"]);

  const count = await mailService.sendBatchEmails(
    db,
    { mode: "meet_attendees", meetId: "m-test" },
    "Reminder for {{meet_title}}",
    "Hello {{first_name}}, meeting date is {{meet_date}} at {{meet_time}} and link is {{meet_link}}",
    "html"
  );

  expect(count).toBe(1);
  const buffer = mailService.getBuffer();
  const lastMsg = buffer[buffer.length - 1];
  expect(lastMsg.to).toBe("attendee@example.com");
  expect(lastMsg.subject).toBe("Reminder for Architecture Workshop");
});

test("mailService.sendBatchEmails tag_followers with meeting tags and custom placeholders", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  initializeMailerDatabase(db);
  const { mailService } = await import("./service");

  const memberRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");

  // Create users: u-1 follows tag, u-2 does not
  db.run(
    "INSERT INTO users (id, email, first_name, last_name, username, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["u-tag", "follower@example.com", "Ali", "Taghi", "alit", "hash", memberRole!.id]
  );
  db.run(
    "INSERT INTO users (id, email, first_name, last_name, username, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["u-other", "other@example.com", "Other", "User", "other", "hash", memberRole!.id]
  );

  // Create tag & link to user
  db.run("INSERT INTO tags (id, title) VALUES (?, ?)", ["t-hono", "Hono Framework"]);
  db.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", ["u-tag", "t-hono"]);

  // Create meet & link tag
  db.run(
    `INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, status, access_status, publish_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["m-hono", "Mastering Hono", "Desc", "[]", "2026-10-01T15:00:00.000Z", "2026-10-01", "18:30", 90, "upcoming", "public", "public"]
  );
  db.run("INSERT INTO meet_tags (meet_id, tag_id) VALUES (?, ?)", ["m-hono", "t-hono"]);

  // 1. Test markdown format
  const countMd = await mailService.sendBatchEmails(
    db,
    { mode: "tag_followers", meetId: "m-hono" },
    "Tags update: {{tags}}",
    "### Hello {{first_name}}\n\nMeet **{{meet_title}}** at {{meet_time}} (Shamsi: {{meet_date_shamsi}}).\nTags: {{tags}}",
    "markdown"
  );
  expect(countMd).toBe(1);
  const buffer = mailService.getBuffer();
  const lastMsg = buffer[buffer.length - 1];
  expect(lastMsg.to).toBe("follower@example.com");
  expect(lastMsg.subject).toBe("Tags update: Hono Framework");
  expect(lastMsg.format).toBe("html"); // markdown is rendered to html wrapper
  expect(lastMsg.attachmentCount).toBe(0);

  // 2. Test text format
  const countText = await mailService.sendBatchEmails(
    db,
    { mode: "tag_followers", meetId: "m-hono" },
    "Text reminder: {{meet_title}}",
    "Hello {{name}}, event is on {{meet_date}} at {{meet_time}}.",
    "text"
  );
  expect(countText).toBe(1);
});

test("mailService.processScheduledEmails processes meetId payload and executes batch", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  initializeMailerDatabase(db);
  const { mailService } = await import("./service");

  const memberRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");

  db.run(
    "INSERT INTO users (id, email, first_name, last_name, username, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["u-sched", "sched_user@example.com", "Mina", "Alavi", "mina", "hash", memberRole!.id]
  );
  db.run(
    `INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, status, access_status, publish_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["m-sched", "Scheduled Architecture Meet", "Desc", "[]", "2026-10-05T10:00:00.000Z", "2026-10-05", "13:30", 60, "upcoming", "public", "public"]
  );
  db.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES (?, ?)", ["m-sched", "u-sched"]);

  // Insert pending scheduled email in the past
  const pastIso = new Date(Date.now() - 60000).toISOString();
  db.run(
    `INSERT INTO scheduled_emails (id, title, subject, format, body, target_mode, target_payload, scheduled_for, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      "job-1",
      "Automated Meet Reminder",
      "Notice for {{meet_title}}",
      "html",
      "Hello {{first_name}}, meet is at {{meet_time}}",
      "meet_attendees",
      JSON.stringify({ meetId: "m-sched" }),
      pastIso,
    ]
  );

  const processed = await mailService.processScheduledEmails(db);
  expect(processed).toBe(1);

  const updatedJob = db.query<{ status: string; sent_count: number }, [string]>("SELECT status, sent_count FROM scheduled_emails WHERE id = ?").get("job-1");
  expect(updatedJob?.status).toBe("sent");
  expect(updatedJob?.sent_count).toBe(1);

  // Failure handling in processScheduledEmails: invalid json payload
  db.run(
    `INSERT INTO scheduled_emails (id, title, subject, format, body, target_mode, target_payload, scheduled_for, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      "job-fail",
      "Faulty job",
      "Fail test",
      "html",
      "Body",
      "tags",
      "invalid-json{",
      pastIso,
    ]
  );
  const handledCount = await mailService.processScheduledEmails(db);
  expect(handledCount).toBeGreaterThanOrEqual(1);
});

test("mailService.sendFavoriteTagMeetReminders & sendMeetAttendeesReminder forceNow bypass", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  initializeMailerDatabase(db);
  const { mailService } = await import("./service");

  const memberRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");

  db.run(
    "INSERT INTO users (id, email, first_name, last_name, username, password_hash, role_id, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["u-force", "force_user@example.com", "Kaveh", "Arya", "kaveh", "hash", memberRole!.id, "Europe/London"]
  );
  db.run(
    `INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, status, access_status, publish_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["m-force", "Future Sync Meet", "Desc", "[]", "2099-01-01T12:00:00.000Z", "2099-01-01", "12:00", 60, "upcoming", "public", "public"]
  );
  db.run("INSERT INTO tags (id, title) VALUES (?, ?)", ["t-force", "Rust"]);
  db.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", ["u-force", "t-force"]);
  db.run("INSERT INTO meet_tags (meet_id, tag_id) VALUES (?, ?)", ["m-force", "t-force"]);
  db.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES (?, ?)", ["m-force", "u-force"]);

  // Without forceNow, will not send because date is 2099 (daysAhead check fails)
  const countTagNoForce = await mailService.sendFavoriteTagMeetReminders(db, 1, undefined, undefined, "06:00", false, "m-force");
  expect(countTagNoForce).toBe(0);

  // With forceNow = true and specificMeetId, forces immediate send
  const countTagForced = await mailService.sendFavoriteTagMeetReminders(db, 1, undefined, undefined, "06:00", true, "m-force");
  expect(countTagForced).toBe(1);

  // Attendees reminder without forceNow fails date check
  const countAttNoForce = await mailService.sendMeetAttendeesReminder(db, "m-force", undefined, undefined, 0, "06:00", false);
  expect(countAttNoForce).toBe(0);

  // Attendees reminder with forceNow = true passes
  const countAttForced = await mailService.sendMeetAttendeesReminder(db, "m-force", undefined, undefined, 0, "06:00", true);
  expect(countAttForced).toBe(1);
});


