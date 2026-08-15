import { describe, expect, test, beforeEach } from "bun:test";
import { RingBuffer } from "../src/modules/mailer/ring-buffer";
import { MailService } from "../src/modules/mailer/service";
import { FallbackProvider } from "../src/modules/mailer/providers";
import {
  renderAttendanceConfirmationTemplate,
  renderOtpEmailTemplate,
  renderTagReminderTemplate,
  renderWelcomeTemplate,
} from "../src/modules/mailer/templates";

describe("Mailer RingBuffer", () => {
  test("holds up to capacity and evicts oldest entries", () => {
    const buffer = new RingBuffer<string>(3);
    expect(buffer.length).toBe(0);

    buffer.push("first");
    buffer.push("second");
    buffer.push("third");
    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual(["first", "second", "third"]);

    buffer.push("fourth");
    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual(["second", "third", "fourth"]);

    buffer.push("fifth");
    expect(buffer.toArray()).toEqual(["third", "fourth", "fifth"]);
  });

  test("clear resets buffer contents and length", () => {
    const buffer = new RingBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.clear();
    expect(buffer.length).toBe(0);
    expect(buffer.toArray()).toEqual([]);
  });
});

describe("Mailer Templates", () => {
  test("renderWelcomeTemplate produces bilingual greeting", () => {
    const { subject, html, text } = renderWelcomeTemplate({
      firstName: "Ali",
      username: "ali_tech",
      email: "ali@example.com",
    });

    expect(subject).toContain("Welcome");
    expect(subject).toContain("خوش آمدید");
    expect(html).toContain("خوش آمدید Ali");
    expect(html).toContain("Welcome, Ali");
    expect(text).toContain("Ali");
  });

  test("renderOtpEmailTemplate produces OTP code", () => {
    const { subject, html, text } = renderOtpEmailTemplate("654321");
    expect(subject).toContain("654321");
    expect(html).toContain("654321");
    expect(text).toContain("654321");
  });

  test("renderAttendanceConfirmationTemplate includes Persian first, English second, and gmail platform link", () => {
    const { subject, html, text } = renderAttendanceConfirmationTemplate(
      {
        id: "meet-123",
        title: "Bun & SQLite Mastery",
        scheduledDate: "2099-07-01",
        scheduledTime: "18:00",
        durationMinutes: 60,
        presenterName: "Reza",
        status: "upcoming",
        accessStatus: "public",
      },
      {
        firstName: "Sara",
        email: "sara@example.com",
      }
    );

    expect(subject).toContain("ثبت‌نام در جلسه");
    expect(subject).toContain("RSVP Confirmed");

    // Check Persian comes before English in HTML
    const faIndex = html.indexOf("تبریک Sara عزیز");
    const enIndex = html.indexOf("Congratulations Sara!");
    expect(faIndex).toBeGreaterThan(-1);
    expect(enIndex).toBeGreaterThan(-1);
    expect(faIndex).toBeLessThan(enIndex);

    // Check meeting link with Gmail platform
    expect(html).toContain("/meets/meet-123?ref=gmail");
    expect(text).toContain("/meets/meet-123?ref=gmail");
  });

  test("renderTagReminderTemplate includes matching tags and meet link", () => {
    const { subject, html, text } = renderTagReminderTemplate(
      {
        id: "meet-456",
        title: "AI & ML Architecture",
        scheduledDate: "2099-07-02",
        scheduledTime: "19:00",
        durationMinutes: 90,
        status: "upcoming",
        accessStatus: "public",
      },
      {
        firstName: "Babak",
        email: "babak@example.com",
      },
      ["AI", "Architecture"]
    );

    expect(subject).toContain("یادآوری: جلسه مرتبط با علایق شما");
    expect(html).toContain("AI، Architecture");
    expect(html).toContain("/meets/meet-456?ref=gmail");
  });
});

describe("MailService Singleton and Providers", () => {
  beforeEach(() => {
    MailService.resetInstance();
  });

  test("singleton instance is preserved and fallback provider works", async () => {
    const fallback = new FallbackProvider();
    const service1 = MailService.getInstance(50, fallback);
    const service2 = MailService.getInstance();

    expect(service1).toBe(service2);
    expect(service1.getProvider().name).toBe("fallback-console-file");

    const msg = await service1.enqueueEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      attachments: [{ filename: "doc.txt", content: "Hello World", contentType: "text/plain" }],
    });
    expect(msg.to).toBe("test@example.com");
    expect(msg.attachmentCount).toBe(1);

    const buffer = service1.getBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].subject).toBe("Test Subject");
    expect(buffer[0].attachmentCount).toBe(1);
    expect(service1.getStats().bufferSize).toBe(1);
  });

  test("attachments support buffer or string content", async () => {
    const fallback = new FallbackProvider();
    const service = MailService.getInstance(50, fallback);

    const msg = await service.enqueueEmail({
      to: "client@example.com",
      subject: "With PDF",
      text: "See attached",
      attachments: [
        { filename: "spec.pdf", content: Buffer.from("%PDF-1.4 test"), contentType: "application/pdf" },
      ],
    });

    expect(msg.attachmentCount).toBe(1);
    expect(msg.status).toBe("queued");
  });
});
