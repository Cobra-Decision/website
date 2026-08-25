import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { initializeLandingDatabase } from "../src/modules/landing/database";
import { initializeMailerDatabase } from "../src/modules/mailer/database";
import { seedSampleData } from "../src/lib/seed";
import { MailService } from "../src/modules/mailer/service";
import { FallbackProvider } from "../src/modules/mailer/providers";
import { createMeet } from "../src/modules/events/queries";

let database: Database;
afterEach(() => database.close());

describe("Mailer Integration & Batching", () => {
  test("seed creates gmail platform and mailService sends tag reminders and batches", async () => {
    database = new Database(":memory:");
    await initializeDatabase(database);
    initializeEventsDatabase(database);
    initializeLandingDatabase(database);
    initializeMailerDatabase(database);
    await seedSampleData(database);

    // Verify Gmail platform seeded
    const gmailPlatform = database
      .query<{ id: string; slug: string; name: string }, [string]>(
        "SELECT id, slug, name FROM platforms WHERE slug = ?"
      )
      .get("gmail");
    expect(gmailPlatform).not.toBeNull();
    expect(gmailPlatform?.slug).toBe("gmail");
    expect(gmailPlatform?.name).toBe("Gmail");

    // Test Tag Reminders matching logic
    MailService.resetInstance();
    const service = MailService.getInstance(100, new FallbackProvider());

    // Target date 1 day from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    const targetDateStr = targetDate.toISOString().slice(0, 10);

    const devopsTag = database
      .query<{ id: string }, [string]>("SELECT id FROM tags WHERE title = ?")
      .get("DevOps");
    expect(devopsTag).not.toBeNull();

    // Create meeting tomorrow with DevOps tag
    createMeet(database, {
      title: "Tomorrow DevOps Meet",
      description: "DevOps pipeline mastery",
      topics: ["CI/CD", "Docker"],
      scheduledDate: targetDateStr,
      scheduledTime: "18:00",
      durationMinutes: 60,
      status: "upcoming",
      accessStatus: "public",
      tagIds: [devopsTag!.id],
    });

    // Add DevOps tag preference to user Noah
    const noahUser = database
      .query<{ id: string; email: string }, [string]>(
        "SELECT id, email FROM users WHERE email = ?"
      )
      .get("noah@example.com");
    expect(noahUser).not.toBeNull();

    database.run("INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)", [
      noahUser!.id,
      devopsTag!.id,
    ]);

    const count = await service.sendFavoriteTagMeetReminders(database, 1);
    expect(count).toBeGreaterThan(0);

    // Test Batch Email to tag followers
    const batchCount = await service.sendBatchEmails(
      database,
      { mode: "tags", tagIds: [devopsTag!.id] },
      "DevOps Newsletter",
      "<p>New workshop announcement</p>",
      "html"
    );
    expect(batchCount).toBeGreaterThan(0);

    // Test Batch Email to specific domain with attachments
    const domainCount = await service.sendBatchEmails(
      database,
      { mode: "domain", domain: "example.com" },
      "Example Domain Notice",
      "Notice for example.com users",
      "text",
      [{ filename: "notice.pdf", content: "PDF_DUMMY_DATA", contentType: "application/pdf" }]
    );
    expect(domainCount).toBeGreaterThan(0);

    const stats = service.getStats();
    expect(stats.bufferSize).toBeGreaterThan(0);
    expect(stats.activeProvider).toBe("fallback-console-file");

    const recent = service.getBuffer();
    expect(recent[recent.length - 1].attachmentCount).toBe(1);
  });
});
