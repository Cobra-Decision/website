import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { initializeDatabase } from "../src/modules/auth/database";
import { initializeEventsDatabase } from "../src/modules/events/database";

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
    expect(html).toContain('href="/app.css"');
    expect(html).not.toContain("cdn.tailwindcss.com");
    expect(html).toContain('src="/altcha.js"');
    expect(html).not.toContain("cdn.jsdelivr.net/npm/altcha");
    expect(html).toContain("htmx.org");
    expect(html).toContain('src="/altcha.js"');
    expect(html).toContain('<altcha-widget challenge="/auth/altcha/challenge"');
  }
});

test("registration needs only email and password and redirects to login", async () => {
  const form = new FormData();
  form.set("email", "new@example.com");
  form.set("password", "secret123");
  form.set("password_confirmation", "secret123");
  const response = await app.request("/auth/register", { method: "POST", body: form });
  expect(response.status).toBe(200);
  expect(response.headers.get("HX-Redirect")).toBe("/auth");
  expect(database.query("SELECT email, username, phone FROM users WHERE deleted_at IS NULL").get()).toEqual({
    email: "new@example.com", username: null, phone: null,
  });
});

test("registration rejects mismatched password confirmation", async () => {
  const form = new FormData();
  form.set("email", "new@example.com"); form.set("password", "secret123"); form.set("password_confirmation", "different");
  expect((await app.request("/auth/register", { method: "POST", body: form })).status).toBe(400);
});

test("login redirects to dashboard and dashboard shows the profile", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const form = new FormData();
  form.set("identifier", "admin@example.com");
  form.set("password", "secret123");
  const login = await app.request("/auth/login", { method: "POST", body: form });
  expect(login.headers.get("HX-Redirect")).toBe("/dashboard/admin");
  expect(login.headers.get("set-cookie")).toContain("HttpOnly");
  expect(login.headers.get("set-cookie")).toContain("SameSite=Lax");
  const cookie = login.headers.get("set-cookie")!.split(";")[0];

  const dashboard = await app.request("/dashboard/admin", { headers: { cookie } });
  const html = await dashboard.text();
  expect(dashboard.status).toBe(302);
  expect(dashboard.headers.get("location")).toBe("/dashboard/admin/users");
});

test("seeded admin can open the dashboard admin area", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const form = new FormData();
  form.set("identifier", "admin@example.com");
  form.set("password", "secret123");
  const login = await app.request("/auth/login", { method: "POST", body: form });
  const response = await app.request("/dashboard/admin", { headers: { cookie: login.headers.get("set-cookie")!.split(";")[0] } });
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/dashboard/admin/users");
});

test("admin user form exposes profile fields and hashes its password", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const form = await app.request("/dashboard/admin/users/new", { headers: { cookie } });
  expect(await form.text()).toContain('name="first_name"');
  const user = new FormData(); user.set("email", "editor@example.com"); user.set("password", "secret123"); user.set("role_id", "1");
  await app.request("/dashboard/admin/users", { method: "POST", headers: { cookie }, body: user });
  const row = database.query<{ password_hash: string }, []>("SELECT password_hash FROM users WHERE email='editor@example.com'").get()!;
  expect(await Bun.password.verify("secret123", row.password_hash)).toBe(true);
});

test("admin mutations return an out-of-band toast", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const role = new FormData(); role.set("title", "Editor"); role.set("description", "A description");
  const html = await (await app.request("/dashboard/admin/roles", { method: "POST", headers: { cookie }, body: role })).text();
  expect(html).toContain('id="toast-container" hx-swap-oob="beforeend"');
  expect(html).toContain("Created");
});

test("sql report renders readable schema and returns error toasts", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const report = await app.request("/dashboard/admin/report", { headers: { cookie } });
  expect(await report.text()).toContain("Column");
  const query = new FormData(); query.set("sql", "DELETE FROM users");
  const error = await (await app.request("/dashboard/admin/report", { method: "POST", headers: { cookie }, body: query })).text();
  expect(error).toContain('id="toast-container" hx-swap-oob="beforeend"');
  expect(error).toContain("alert-error");
});

test("admin tables support safe search and sorting", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  database.run("INSERT INTO users (email,password_hash,role_id) VALUES (?,?,?)", ["maya@example.com", "hash", role.id]);
  database.run("INSERT INTO users (email,password_hash,role_id) VALUES (?,?,?)", ["noah@example.com", "hash", role.id]);
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const html = await (await app.request("/dashboard/admin/users?q=maya&search_field=email&sort=email&direction=asc", { headers: { cookie, "HX-Request": "true" } })).text();
  expect(html).toContain("maya@example.com"); expect(html).not.toContain("noah@example.com");
  expect(html).not.toContain("<!DOCTYPE html>");
  expect(html).toContain('name="search_field"');
  expect(html).toContain('hx-get="/dashboard/admin/users?q=maya&amp;search_field=email&amp;sort=email&amp;direction=desc"');
  expect((await app.request("/dashboard/admin/users?sort=email;DELETE", { headers: { cookie } })).status).toBe(200);
  const fieldSpecific = await (await app.request("/dashboard/admin/users?q=maya&search_field=username", { headers: { cookie, "HX-Request": "true" } })).text();
  expect(fieldSpecific).not.toContain("maya@example.com");
});

test("admin database errors return an error toast", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const duplicate = new FormData(); duplicate.set("title", "member");
  const response = await app.request("/dashboard/admin/roles", { method: "POST", headers: { cookie }, body: duplicate });
  const html = await response.text();
  expect(response.status).toBe(400);
  expect(html).toContain("alert-error");
  expect(html).toContain('id="toast-container" hx-swap-oob="beforeend"');
});

test("meet tags and attendees can be managed independently", async () => {
  initializeEventsDatabase(database);
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  database.run("INSERT INTO users (email,password_hash,role_id) VALUES (?,?,?)", ["guest@example.com", "hash", role.id]);
  database.run("INSERT INTO tags (title,description) VALUES (?,?)", ["Bun", "Bun runtime"]);
  database.run("INSERT INTO meets (title,scheduled_date,scheduled_time) VALUES (?,?,?)", ["Runtime meetup", "2099-01-01", "18:00"]);
  const meetId = database.query<{ id: number }, []>("SELECT id FROM meets").get()!.id;
  const tagId = database.query<{ id: number }, []>("SELECT id FROM tags").get()!.id;
  const userId = database.query<{ id: number }, []>("SELECT id FROM users WHERE email='guest@example.com'").get()!.id;
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const edit = await (await app.request(`/dashboard/admin/meets/${meetId}/edit`, { headers: { cookie } })).text();
  expect(edit).toContain(`/dashboard/admin/meets/${meetId}/tags`);
  expect(edit).toContain(`/dashboard/admin/meets/${meetId}/attendees`);

  const tag = new FormData(); tag.set("tag_id", String(tagId));
  const tagResponse = await app.request(`/dashboard/admin/meets/${meetId}/tags`, { method: "POST", headers: { cookie }, body: tag });
  expect(tagResponse.status).toBe(200);
  expect(await tagResponse.text()).toContain("Bun runtime");
  expect(database.query("SELECT 1 FROM meet_tags WHERE meet_id=? AND tag_id=?").get(meetId, tagId)).toBeTruthy();

  const attendee = new FormData(); attendee.set("user_id", String(userId));
  const attendeeResponse = await app.request(`/dashboard/admin/meets/${meetId}/attendees`, { method: "POST", headers: { cookie }, body: attendee });
  expect(attendeeResponse.status).toBe(200);
  expect(await attendeeResponse.text()).toContain("guest@example.com");
  expect(database.query("SELECT 1 FROM meet_attendees WHERE meet_id=? AND user_id=?").get(meetId, userId)).toBeTruthy();

  expect((await app.request(`/dashboard/admin/meets/${meetId}/tags/${tagId}`, { method: "DELETE", headers: { cookie } })).status).toBe(200);
  expect((await app.request(`/dashboard/admin/meets/${meetId}/attendees/${userId}`, { method: "DELETE", headers: { cookie } })).status).toBe(200);
  expect(database.query("SELECT 1 FROM meet_tags WHERE meet_id=? AND tag_id=?").get(meetId, tagId)).toBeNull();
  expect(database.query("SELECT 1 FROM meet_attendees WHERE meet_id=? AND user_id=?").get(meetId, userId)).toBeNull();
});

test("member dashboard does not show admin navigation", async () => {
  const register = new FormData();
  register.set("email", "member@example.com");
  register.set("password", "secret123");
  register.set("password_confirmation", "secret123");
  await app.request("/auth/register", { method: "POST", body: register });
  const login = new FormData();
  login.set("identifier", "member@example.com");
  login.set("password", "secret123");
  const response = await app.request("/auth/login", { method: "POST", body: login });
  const dashboard = await app.request("/dashboard", { headers: { cookie: response.headers.get("set-cookie")!.split(";")[0] } });
  expect(await dashboard.text()).not.toContain('href="/dashboard/admin"');
});

test("authenticated users update only their own profile", async () => {
  const register = new FormData(); register.set("email", "member@example.com"); register.set("password", "secret123"); register.set("password_confirmation", "secret123");
  await app.request("/auth/register", { method: "POST", body: register });
  const login = new FormData(); login.set("identifier", "member@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const profile = new FormData(); profile.set("first_name", "Member"); profile.set("password", "new-secret"); profile.set("password_confirmation", "new-secret");
  expect((await app.request("/dashboard/profile", { method: "POST", headers: { cookie }, body: profile })).status).toBe(200);
  const user = database.query<{ first_name: string; password_hash: string }, []>("SELECT first_name,password_hash FROM users WHERE email='member@example.com'").get()!;
  expect(user.first_name).toBe("Member"); expect(await Bun.password.verify("new-secret", user.password_hash)).toBe(true);
});

test("authenticated users are redirected away from auth pages", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const form = new FormData();
  form.set("identifier", "admin@example.com");
  form.set("password", "secret123");
  const login = await app.request("/auth/login", { method: "POST", body: form });
  const cookie = login.headers.get("set-cookie")!.split(";")[0];

  for (const path of ["/auth", "/auth/register"]) {
    const response = await app.request(path, { headers: { cookie } });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard/admin");
  }
});

test("dashboard requires a session and logout clears it", async () => {
  const dashboard = await app.request("/dashboard/member");
  expect(dashboard.status).toBe(302);
  expect(dashboard.headers.get("location")).toBe("/auth");

  const logout = await app.request("/auth/logout", { method: "POST" });
  expect(logout.headers.get("HX-Redirect")).toBe("/auth");
  expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
});
