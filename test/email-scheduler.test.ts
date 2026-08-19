import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { initializeLandingDatabase } from "../src/modules/landing/database";
import { initializeMailerDatabase } from "../src/modules/mailer/database";
import { seedSampleData } from "../src/lib/seed";
import { MailService } from "../src/modules/mailer/service";
import { FallbackProvider } from "../src/modules/mailer/providers";
import { generateId } from "../src/lib/id";

let database: Database;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  initializeLandingDatabase(database);
  initializeMailerDatabase(database);
  await seedSampleData(database);
});

afterEach(() => {
  database.close();
});

describe("Mailer Scheduler and Scheduled Broadcasts", () => {
  test("creates scheduled broadcast and worker processes it when due", async () => {
    MailService.resetInstance();
    const service = MailService.getInstance(50, new FallbackProvider());

    const pastDateIso = new Date(Date.now() - 60000).toISOString();
    const jobId = generateId();

    database.run(
      `INSERT INTO scheduled_emails (id, template_id, title, subject, format, body, target_mode, target_payload, scheduled_for, status)
       VALUES (?, NULL, 'Test Broadcast', 'Hello {{name}}', 'html', '<p>Welcome {{name}}</p>', 'all', '{}', ?, 'pending')`,
      [jobId, pastDateIso]
    );

    const processed = await service.processScheduledEmails(database);
    expect(processed).toBe(1);

    const updatedJob = database
      .query<{ status: string; sent_count: number; error: string | null }, [string]>(
        "SELECT status, sent_count, error FROM scheduled_emails WHERE id = ?"
      )
      .get(jobId);

    expect(updatedJob?.status).toBe("sent");
    expect(updatedJob?.sent_count).toBeGreaterThan(0);
    expect(updatedJob?.error).toBeNull();
  });

  test("future scheduled jobs are ignored until time arrives", async () => {
    MailService.resetInstance();
    const service = MailService.getInstance(50, new FallbackProvider());

    const futureDateIso = new Date(Date.now() + 3600000).toISOString();
    const jobId = generateId();

    database.run(
      `INSERT INTO scheduled_emails (id, template_id, title, subject, format, body, target_mode, target_payload, scheduled_for, status)
       VALUES (?, NULL, 'Future Broadcast', 'Hello', 'text', 'Future body', 'all', '{}', ?, 'pending')`,
      [jobId, futureDateIso]
    );

    const processed = await service.processScheduledEmails(database);
    expect(processed).toBe(0);

    const job = database
      .query<{ status: string }, [string]>(
        "SELECT status FROM scheduled_emails WHERE id = ?"
      )
      .get(jobId);

    expect(job?.status).toBe("pending");
  });
});
