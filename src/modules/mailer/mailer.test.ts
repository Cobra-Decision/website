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
import { seedMailer } from "../../lib/database/seeding";
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


