import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../../src/app";
import { initializeDatabase } from "../../src/modules/auth/database";
import { initializeEventsDatabase } from "../../src/modules/events/database";
import { initializeLandingDatabase } from "../../src/modules/landing/database";
import { initializeMailerDatabase } from "../../src/modules/mailer/database";
import { seedSampleData } from "../../src/lib/seed";

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

test("Admin Calendar: renders SSR calendar view with navigation and grid", async () => {
  const res = await app.request("/dashboard/admin/calendar", {
    headers: { cookie: adminCookie },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("admin-calendar-grid");
  expect(html).toContain("/dashboard/admin/calendar");
});

test("Admin Calendar: HTMX partial swap returns grid on HX-Request", async () => {
  const res = await app.request("/dashboard/admin/calendar?year=2026&month=8", {
    headers: {
      cookie: adminCookie,
      "HX-Request": "true",
    },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("admin-calendar-grid");
  expect(html).not.toContain("<!DOCTYPE html>");
});

test("Admin Calendar: handles Persian calendar in fa locale", async () => {
  const res = await app.request("/dashboard/admin/calendar?lang=fa", {
    headers: { cookie: adminCookie },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("admin-calendar-grid");
  expect(html).toContain("font-vazir");
});
