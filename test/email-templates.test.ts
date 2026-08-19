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
});
