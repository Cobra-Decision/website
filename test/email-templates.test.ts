import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { initializeLandingDatabase } from "../src/modules/landing/database";
import { initializeMailerDatabase, PREBUILT_EMAIL_TEMPLATES } from "../src/modules/mailer/database";
import {
  interpolateVariables,
  renderDynamicTemplate,
  renderWelcomeTemplate,
  renderOtpEmailTemplate,
  renderAttendanceConfirmationTemplate,
  renderTagReminderTemplate,
} from "../src/modules/mailer/templates";
import { buildCalendarLinks, formatCalendarUtc } from "../src/modules/events/datetime";
import { generateId } from "../src/lib/id";

let database: Database;

beforeEach(() => {
  database = new Database(":memory:");
  initializeDatabase(database);
  initializeEventsDatabase(database);
  initializeLandingDatabase(database);
  initializeMailerDatabase(database);
});

afterEach(() => {
  database.close();
});

describe("Mailer Dynamic Templates & Variable Interpolation", () => {
  test("interpolateVariables replaces tokens correctly", () => {
    const template = "Hello {{name}}, your code is {{otp}} on {{date}}!";
    const res = interpolateVariables(template, {
      name: "Ali",
      otp: "998811",
      date: "2026-08-19",
    });
    expect(res).toBe("Hello Ali, your code is 998811 on 2026-08-19!");
  });

  test("prebuilt templates are properly seeded in database", () => {
    const templates = database
      .query<{ id: string; title: string; format: string }, []>(
        "SELECT id, title, format FROM emails_schema WHERE deleted_at IS NULL"
      )
      .all();

    expect(templates.length).toBeGreaterThanOrEqual(PREBUILT_EMAIL_TEMPLATES.length);
    const titles = templates.map((t) => t.title);
    expect(titles).toContain("welcome_email");
    expect(titles).toContain("otp_verification");
    expect(titles).toContain("attendance_confirmation");
    expect(titles).toContain("tag_reminder");
    expect(titles).toContain("general_announcement");
  });

  test("renderWelcomeTemplate uses dynamic DB template when available", () => {
    const customSubject = "Custom Welcome {{name}}";
    const customBody = "<h1>Welcome {{name}} ({{email}})</h1>";

    database.run(
      "UPDATE emails_schema SET subject = ?, value = ?, updated_at = CURRENT_TIMESTAMP WHERE title = 'welcome_email'",
      [customSubject, customBody]
    );

    const { subject, html, text } = renderWelcomeTemplate(
      { firstName: "Reza", username: "rezishon", email: "reza@example.com" },
      "http://localhost:3000",
      database
    );

    expect(subject).toBe("Custom Welcome Reza");
    expect(html).toContain("Welcome Reza (reza@example.com)");
    expect(text).toContain("Welcome Reza (reza@example.com)");
  });

  test("renderOtpEmailTemplate falls back safely if database template is deleted", () => {
    database.run("UPDATE emails_schema SET deleted_at = CURRENT_TIMESTAMP WHERE title = 'otp_verification'");

    const { subject, html, text } = renderOtpEmailTemplate("123456", database);
    expect(subject).toContain("123456");
    expect(html).toContain("123456");
    expect(text).toContain("123456");
  });

  test("renderDynamicTemplate supports markdown formatting and wraps container", () => {
    const mdTemplateId = generateId();
    database.run(
      "INSERT INTO emails_schema (id, title, subject, format, value, description) VALUES (?, ?, ?, ?, ?, ?)",
      [
        mdTemplateId,
        "markdown_notice",
        "Notice for {{name}}",
        "markdown",
        "## Important Update\n\nHello **{{name}}**, check [here]({{link}}).",
        "Markdown test",
      ]
    );

    const res = renderDynamicTemplate(
      database,
      "markdown_notice",
      { name: "Babak", link: "https://example.com" },
      () => ({ subject: "fallback", html: "fallback", text: "fallback" })
    );

    expect(res.subject).toBe("Notice for Babak");
    expect(res.html).toContain("<h2");
    expect(res.html).toContain("<strong>Babak</strong>");
    expect(res.html).toContain('href="https://example.com"');
    expect(res.text).toContain("Hello **Babak**");
  });

  test("formatCalendarUtc and buildCalendarLinks produce correct UTC formats and URLs", () => {
    // 2026-10-15 16:30 Tehran time (UTC+3:30) -> 13:00 UTC
    const date = "2026-10-15";
    const time = "16:30";
    const duration = 90;

    const { startUtc, endUtc, startIso, endIso } = formatCalendarUtc(date, time, duration);
    expect(startUtc).toBe("20261015T130000Z");
    expect(endUtc).toBe("20261015T143000Z");
    expect(startIso).toBe("2026-10-15T13:00:00Z");
    expect(endIso).toBe("2026-10-15T14:30:00Z");

    const links = buildCalendarLinks({
      title: "Distributed Architecture",
      description: "Discussion on SQLite & Bun",
      location: "https://example.com/meets/123",
      date,
      time,
      durationMinutes: duration,
    });

    expect(links.googleCalendarUrl).toContain("https://calendar.google.com/calendar/render?");
    expect(links.googleCalendarUrl).toContain("action=TEMPLATE");
    expect(links.googleCalendarUrl).toContain("dates=20261015T130000Z%2F20261015T143000Z");
    expect(links.googleCalendarUrl).toContain("text=Distributed+Architecture");

    expect(links.outlookCalendarUrl).toContain("https://outlook.live.com/calendar/0/deeplink/compose?");
    expect(links.outlookCalendarUrl).toContain("rru=addevent");
    expect(links.outlookCalendarUrl).toContain("startdt=2026-10-15T13%3A00%3A00Z");
    expect(links.outlookCalendarUrl).toContain("enddt=2026-10-15T14%3A30%3A00Z");
  });

  test("renderAttendanceConfirmationTemplate passes calendar variables and links", () => {
    const meet = {
      id: "meet-999",
      title: "Hono Web Framework",
      scheduledDate: "2026-10-20",
      scheduledTime: "18:00",
      durationMinutes: 60,
      presenterName: "Ali",
      status: "upcoming",
      accessStatus: "public",
    };

    const user = {
      firstName: "Babak",
      lastName: "Rad",
      username: "babak",
      email: "babak@example.com",
    };

    // 1. Fallback renderer test
    const fallbackResult = renderAttendanceConfirmationTemplate(meet, user, "https://cobradecision.com");
    expect(fallbackResult.subject).toContain("Hono Web Framework");
    expect(fallbackResult.html).toContain("https://cobradecision.com/meets/meet-999");

    // 2. Dynamic DB template with calendar building tags
    database.run(
      "UPDATE emails_schema SET value = 'Google: https://calendar.google.com/calendar/render?action=TEMPLATE&text={{meet_title_encoded}}&dates={{meet_start_utc}}/{{meet_end_utc}}&location={{meet_link_encoded}} | Outlook: https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject={{meet_title_encoded}}&startdt={{meet_start_iso}}&enddt={{meet_end_iso}}&location={{meet_link_encoded}}' WHERE title = 'attendance_confirmation'"
    );
    const dbResult = renderAttendanceConfirmationTemplate(meet, user, "https://cobradecision.com", database);
    expect(dbResult.html).toContain("calendar.google.com/calendar/render?action=TEMPLATE&text=Hono%20Web%20Framework&dates=20261020T143000Z/20261020T153000Z");
    expect(dbResult.html).toContain("startdt=2026-10-20T14:30:00Z&enddt=2026-10-20T15:30:00Z");
  });
});
