import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { initializeDatabase } from "../src/modules/auth/database";

let database: Database;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  const passCaptcha: MiddlewareHandler = async (_, next) => next();
  app = createApp({ database, captcha: { middleware: passCaptcha, challengeHandler: (c) => c.json({ challenge: "test" }) } });
});
afterEach(() => database.close());

test("auth pages load the shared UI stack and ALTCHA", async () => {
  for (const path of ["/auth", "/auth/register"]) {
    const html = await (await app.request(path)).text();
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("daisyui");
    expect(html).toContain("htmx.org");
    expect(html).toContain("altcha.min.js");
    expect(html).toContain('<altcha-widget challengeurl="/auth/altcha/challenge"');
  }
});

test("registration needs only email and password and redirects to login", async () => {
  const form = new FormData();
  form.set("email", "new@example.com");
  form.set("password", "secret123");
  const response = await app.request("/auth/register", { method: "POST", body: form });
  expect(response.status).toBe(200);
  expect(response.headers.get("HX-Redirect")).toBe("/auth");
  expect(database.query("SELECT email, username, phone FROM users WHERE deleted_at IS NULL").get()).toEqual({
    email: "new@example.com", username: null, phone: null,
  });
});

test("login redirects to dashboard and dashboard shows the profile", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const form = new FormData();
  form.set("identifier", "admin@example.com");
  form.set("password", "secret123");
  const login = await app.request("/auth/login", { method: "POST", body: form });
  expect(login.headers.get("HX-Redirect")).toBe("/dashboard");
  const cookie = login.headers.get("set-cookie")!.split(";")[0];

  const dashboard = await app.request("/dashboard", { headers: { cookie } });
  const html = await dashboard.text();
  expect(dashboard.status).toBe(200);
  expect(html).toContain("admin@example.com");
  expect(html).toContain(">admin</span>");
  expect(html).toContain('hx-post="/auth/logout"');
});

test("dashboard requires a session and logout clears it", async () => {
  const dashboard = await app.request("/dashboard");
  expect(dashboard.status).toBe(302);
  expect(dashboard.headers.get("location")).toBe("/auth");

  const logout = await app.request("/auth/logout", { method: "POST" });
  expect(logout.headers.get("HX-Redirect")).toBe("/auth");
  expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
});
