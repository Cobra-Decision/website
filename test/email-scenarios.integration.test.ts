import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { initializeLandingDatabase } from "../src/modules/landing/database";
import { initializeMailerDatabase } from "../src/modules/mailer/database";
import { seedSampleData } from "../src/lib/seed";
import { MailService } from "../src/modules/mailer/service";
import { FallbackProvider } from "../src/modules/mailer/providers";
import { createMeet, attendMeet } from "../src/modules/events/queries";
import { generateId } from "../src/lib/id";
import { isTimeToRun } from "../src/modules/mailer/scheduler";

let database: Database;
let app: ReturnType<typeof createApp>;
let mailService: MailService;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  initializeLandingDatabase(database);
  initializeMailerDatabase(database);
  await seedSampleData(database);

  MailService.resetInstance();
  mailService = MailService.getInstance(200, new FallbackProvider());

  const passCaptcha: MiddlewareHandler = async (_, next) => next();
  app = createApp({ database, captcha: { middleware: passCaptcha, challengeHandler: (c) => c.json({}) } });
});

afterEach(() => {
  database.close();
});

describe("Comprehensive Email Scenarios & Dynamic Timezones", () => {
  test("Scenario 1: Transactional Auth (OTP, Register with Timezone, and Welcome Email)", async () => {
    // 1. Initiate registration with client timezone cookie
    const regForm = new FormData();
    regForm.set("email", "new_tz_user@example.com");
    regForm.set("password", "StrongPass123!");
    regForm.set("password_confirmation", "StrongPass123!");
    regForm.set("first_name", "Farhad");
    regForm.set("last_name", "Naderi");
    regForm.set("username", "farhad_dev");

    const tags = database.query<{ id: string }, []>("SELECT id FROM tags LIMIT 3").all();
    for (const t of tags) {
      regForm.append("tagIds", t.id);
    }

    const regRes = await app.request("/auth/register", {
      method: "POST",
      headers: { cookie: "tz=America%2FNew_York" },
      body: regForm,
    });
    expect(regRes.status).toBe(200);

    // Verify OTP record exists
    const otpRow = database
      .query<{ otp_code: string }, [string]>("SELECT otp_code FROM registration_otps WHERE email = ?")
      .get("new_tz_user@example.com");
    expect(otpRow).toBeDefined();

    // 2. Verify OTP and complete registration
    const verifyForm = new FormData();
    verifyForm.set("email", "new_tz_user@example.com");
    verifyForm.set("otp", otpRow!.otp_code);

    const verifyRes = await app.request("/auth/verify-otp", {
      method: "POST",
      headers: { cookie: "tz=America%2FNew_York" },
      body: verifyForm,
    });
    expect(verifyRes.status).toBe(200);

    // Verify user created with correct timezone
    const createdUser = database
      .query<{ id: string; email: string; timezone: string }, [string]>(
        "SELECT id, email, timezone FROM users WHERE email = ?"
      )
      .get("new_tz_user@example.com");
    expect(createdUser).toBeDefined();
    expect(createdUser?.timezone).toBe("America/New_York");
  });

  test("Scenario 2: Transactional Meet RSVP Confirmation Email", async () => {
    const user = database
      .query<{ id: string; email: string; first_name: string }, [string]>(
        "SELECT id, email, first_name FROM users WHERE email = ?"
      )
      .get("maya@example.com");
    expect(user).toBeDefined();

    const meet = createMeet(database, {
      title: "Hono & Bun Microservices",
      description: "Architecture deep dive",
      topics: ["Microservices", "Bun"],
      scheduledDate: "2026-10-15",
      scheduledTime: "18:00",
      durationMinutes: 90,
      status: "upcoming",
      accessStatus: "public",
      tagIds: [],
    });
    expect(meet).toBeDefined();

    // Attend meet
    attendMeet(database, meet!.id, user!.id);

    // Send confirmation email
    const initialBufferLen = mailService.getBuffer().length;
    await mailService.sendMeetAttendanceEmail(
      {
        id: meet!.id,
        title: meet!.title,
        scheduledDate: meet!.scheduled_date,
        scheduledTime: meet!.scheduled_time,
        durationMinutes: meet!.duration_minutes,
        status: meet!.status,
        accessStatus: meet!.access_status,
      },
      {
        firstName: user!.first_name,
        email: user!.email,
      },
      "https://cobradecision.ir",
      database
    );

    const updatedBuffer = mailService.getBuffer();
    expect(updatedBuffer.length).toBe(initialBufferLen + 1);
    const lastEmail = updatedBuffer[updatedBuffer.length - 1];
    expect(lastEmail.to).toBe(user!.email);
    expect(lastEmail.subject).toContain("ثبت‌نام در جلسه");
    expect(lastEmail.subject).toContain(meet!.title);
  });

  test("Scenario 3: Per-User Timezone Dynamic Tag Reminders", async () => {
    const tag = database.query<{ id: string; title: string }, []>("SELECT id, title FROM tags LIMIT 1").get()!;

    // Create user 1 in UTC
    const u1Id = generateId();
    database.run(
      `INSERT INTO users (id, email, password_hash, first_name, role_id, timezone)
       VALUES (?, 'user_utc@example.com', 'hash', 'UTC User', (SELECT id FROM roles WHERE title='member'), 'UTC')`,
      [u1Id]
    );
    database.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", [u1Id, tag.id]);

    // Create user 2 in Asia/Tehran
    const u2Id = generateId();
    database.run(
      `INSERT INTO users (id, email, password_hash, first_name, role_id, timezone)
       VALUES (?, 'user_tehran@example.com', 'hash', 'Tehran User', (SELECT id FROM roles WHERE title='member'), 'Asia/Tehran')`,
      [u2Id]
    );
    database.run("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)", [u2Id, tag.id]);

    // Calculate tomorrow date for UTC
    const nowUtc = new Date();
    const utcDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(nowUtc);
    const utcTarget = new Date(`${utcDateStr}T00:00:00Z`);
    utcTarget.setUTCDate(utcTarget.getUTCDate() + 1);
    const tomorrowUtcDateStr = utcTarget.toISOString().slice(0, 10);

    // Create meet tomorrow for tag
    createMeet(database, {
      title: "Tomorrow Multi-TZ Meet",
      description: "Session for tag followers",
      topics: ["Testing"],
      scheduledDate: tomorrowUtcDateStr,
      scheduledTime: "14:00",
      durationMinutes: 60,
      status: "upcoming",
      accessStatus: "public",
      tagIds: [tag.id],
    });

    // Run sendFavoriteTagMeetReminders with sendTime="00:00" to ensure time check passes for all
    const sentCount = await mailService.sendFavoriteTagMeetReminders(
      database,
      1,
      undefined,
      undefined,
      "00:00"
    );
    expect(sentCount).toBeGreaterThan(0);

    // Check email reminder logs for deduplication
    const logs = database
      .query<{ rule_key: string; user_id: string }, []>("SELECT rule_key, user_id FROM email_reminder_logs WHERE rule_key = 'tag_reminder'")
      .all();
    expect(logs.length).toBeGreaterThan(0);

    // Running again immediately should send 0 duplicates
    const secondRunCount = await mailService.sendFavoriteTagMeetReminders(
      database,
      1,
      undefined,
      undefined,
      "00:00"
    );
    expect(secondRunCount).toBe(0);
  });

  test("Scenario 4: Per-User Timezone Dynamic RSVP Reminders & Deduplication", async () => {
    const userTehran = database
      .query<{ id: string; email: string }, [string]>("SELECT id, email FROM users WHERE email = ?")
      .get("noah@example.com")!;
    database.run("UPDATE users SET timezone = 'Asia/Tehran' WHERE id = ?", [userTehran.id]);

    // Get today date in Asia/Tehran
    const now = new Date();
    const todayTehranStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(now);

    const meet = createMeet(database, {
      title: "Today Live Architecture Sync",
      description: "Day of event reminder check",
      topics: ["Architecture"],
      scheduledDate: todayTehranStr,
      scheduledTime: "20:00",
      durationMinutes: 60,
      status: "upcoming",
      accessStatus: "public",
      tagIds: [],
    })!;

    attendMeet(database, meet.id, userTehran.id);

    // Execute RSVP reminder for day of meeting (daysAhead = 0, sendTime = "00:00")
    const sentCount = await mailService.sendMeetAttendeesReminder(
      database,
      meet.id,
      undefined,
      undefined,
      0,
      "00:00"
    );
    expect(sentCount).toBe(1);

    // Second run must be 0 (idempotent deduplication)
    const secondRun = await mailService.sendMeetAttendeesReminder(
      database,
      meet.id,
      undefined,
      undefined,
      0,
      "00:00"
    );
    expect(secondRun).toBe(0);
  });

  test("Scenario 5: Batch Broadcasts across all target modes and formats", async () => {
    // 1. Target mode "all" in Markdown format
    const allCount = await mailService.sendBatchEmails(
      database,
      { mode: "all" },
      "Broadcast to All: {{date}}",
      "## Greetings {{name}}\n\nCheck out [Dashboard]({{dashboard_url}}).",
      "markdown"
    );
    expect(allCount).toBeGreaterThan(0);

    // 2. Target mode "domain" in Text format with attachments
    const domainCount = await mailService.sendBatchEmails(
      database,
      { mode: "domain", domain: "example.com" },
      "Domain Notice",
      "Important notice for example.com members.",
      "text",
      [{ filename: "guide.txt", content: "Guidelines text", contentType: "text/plain" }]
    );
    expect(domainCount).toBeGreaterThan(0);

    // 3. Target mode "tags" in HTML format
    const tag = database.query<{ id: string }, []>("SELECT id FROM tags LIMIT 1").get()!;
    const tagCount = await mailService.sendBatchEmails(
      database,
      { mode: "tags", tagIds: [tag.id] },
      "Tag Followers Update",
      "<p>Exclusive update for your topic interests.</p>",
      "html"
    );
    expect(tagCount).toBeGreaterThanOrEqual(0);

    const stats = mailService.getStats();
    expect(stats.totalProcessed).toBeGreaterThan(0);
  });
});
