import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { MailService } from "../src/modules/mailer/service";
import type { EmailPayload, EmailProvider } from "../src/modules/mailer/types";
import { RingBuffer } from "../src/modules/mailer/ring-buffer";

class MockProvider implements EmailProvider {
  name = "mock";
  public sentMessages: EmailPayload[] = [];
  public delayMs = 0;
  public shouldFail = false;

  isAvailable(): boolean {
    return true;
  }

  async send(message: EmailPayload): Promise<boolean> {
    if (this.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.delayMs));
    }
    if (this.shouldFail) {
      throw new Error("Simulated SMTP Failure");
    }
    this.sentMessages.push(message);
    return true;
  }
}

describe("Mailer Service & Concurrency Spec", () => {
  let mockProvider: MockProvider;
  let mailService: MailService;
  let db: Database;

  beforeEach(() => {
    MailService.resetInstance();
    mockProvider = new MockProvider();
    mailService = MailService.getInstance(50, mockProvider);

    db = new Database(":memory:");
    db.run(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        timezone TEXT,
        deleted_at DATETIME
      );
      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        deleted_at DATETIME
      );
      CREATE TABLE user_tags (
        user_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (user_id, tag_id)
      );
      CREATE TABLE meets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        status TEXT DEFAULT 'upcoming',
        access_status TEXT DEFAULT 'public',
        publish_status TEXT DEFAULT 'public',
        presenter_id TEXT,
        deleted_at DATETIME
      );
      CREATE TABLE meet_tags (
        meet_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (meet_id, tag_id)
      );
      CREATE TABLE meet_attendees (
        meet_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (meet_id, user_id)
      );
      CREATE TABLE email_reminder_logs (
        id TEXT PRIMARY KEY,
        rule_key TEXT NOT NULL,
        meet_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (rule_key, meet_id, user_id)
      );
    `);
  });

  it("enqueues and drains emails with bounded concurrency", async () => {
    mockProvider.delayMs = 10;
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(mailService.enqueueEmail({ to: `user${i}@example.com`, subject: `Test ${i}`, text: "Hi" }));
    }

    await Promise.all(promises);
    // Allow queue to drain
    await new Promise((r) => setTimeout(r, 200));

    expect(mockProvider.sentMessages.length).toBe(15);
    const stats = mailService.getStats();
    expect(stats.sent).toBe(15);
    expect(stats.failed).toBe(0);
    expect(stats.queued).toBe(0);
  });

  it("handles provider failure gracefully and updates message status", async () => {
    mockProvider.shouldFail = true;
    const msg = await mailService.enqueueEmail({ to: "fail@example.com", subject: "Failed Email", text: "Hi" });

    // Allow execution
    await new Promise((r) => setTimeout(r, 50));

    expect(msg.status).toBe("failed");
    expect(msg.error).toContain("Simulated SMTP Failure");
    const stats = mailService.getStats();
    expect(stats.failed).toBe(1);
  });

  it("RingBuffer maintains strict capacity bound without memory growth", () => {
    const ring = new RingBuffer<string>(3);
    ring.push("a");
    ring.push("b");
    ring.push("c");
    expect(ring.toArray()).toEqual(["a", "b", "c"]);

    ring.push("d");
    expect(ring.toArray()).toEqual(["b", "c", "d"]);
    expect(ring.length).toBe(3);
  });

  it("sends favorite tag meet reminders and deduplicates with reminder logs", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
    const tomorrowDate = new Date(Date.now() + 86400000);
    const tomorrowStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(tomorrowDate);

    db.run("INSERT INTO users (id, email, first_name, timezone) VALUES ('u1', 'dev@example.com', 'Alice', 'Asia/Tehran')");
    db.run("INSERT INTO tags (id, title) VALUES ('t1', 'TypeScript')");
    db.run("INSERT INTO user_tags (user_id, tag_id) VALUES ('u1', 't1')");
    db.run(
      `INSERT INTO meets (id, title, scheduled_date, scheduled_time, duration_minutes, status, access_status)
       VALUES ('m1', 'Advanced TypeScript', ?, '18:00', 90, 'upcoming', 'public')`,
      [tomorrowStr]
    );
    db.run("INSERT INTO meet_tags (meet_id, tag_id) VALUES ('m1', 't1')");

    const sentCount = await mailService.sendFavoriteTagMeetReminders(db, 1, "http://localhost:3000", undefined, "00:00");
    expect(sentCount).toBe(1);

    // Drain background workers
    await new Promise((r) => setTimeout(r, 50));
    expect(mockProvider.sentMessages.length).toBe(1);
    expect(mockProvider.sentMessages[0].to).toBe("dev@example.com");

    // Second run should skip already sent log
    const secondRun = await mailService.sendFavoriteTagMeetReminders(db, 1, "http://localhost:3000", undefined, "00:00");
    expect(secondRun).toBe(0);
  });
});
