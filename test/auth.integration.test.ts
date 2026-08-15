import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app";
import { initializeDatabase } from "../src/modules/auth/database";
import { getLandingCache, initCache } from "../src/lib/cache";
import { initializeEventsDatabase } from "../src/modules/events/database";
import { generateId } from "../src/lib/id";

let database: Database;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
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
    expect(html).toContain("htmx:beforeSwap");
    expect(html).toContain('src="/altcha.js"');
    expect(html).toContain('<altcha-widget challenge="/auth/altcha/challenge"');
  }
});

test("registration creates OTP and verification completes user creation", async () => {
  const tag1 = generateId(), tag2 = generateId(), tag3 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'T1'), (?, 'T2'), (?, 'T3')", [tag1, tag2, tag3]);

  const form = new FormData();
  form.set("email", "new@example.com");
  form.set("password", "secret123");
  form.set("password_confirmation", "secret123");
  form.append("tagIds", tag1);
  form.append("tagIds", tag2);
  form.append("tagIds", tag3);
  const response = await app.request("/auth/register", { method: "POST", body: form });
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('hx-post="/auth/verify-otp"');

  const otpRecord = database.query<{ otp_code: string }, [string]>("SELECT otp_code FROM registration_otps WHERE email = ?").get("new@example.com");
  expect(otpRecord).toBeDefined();

  const verifyForm = new FormData();
  verifyForm.set("email", "new@example.com");
  verifyForm.set("otp", otpRecord!.otp_code);

  const verifyRes = await app.request("/auth/verify-otp", { method: "POST", body: verifyForm });
  expect(verifyRes.status).toBe(200);
  expect(verifyRes.headers.get("HX-Redirect")).toBe("/auth");
  expect(database.query("SELECT email, username, phone FROM users WHERE deleted_at IS NULL").get()).toEqual({
    email: "new@example.com", username: null, phone: null,
  });
});

test("registration refreshes the cached landing user count on OTP verify", async () => {
  const tag1 = generateId(), tag2 = generateId(), tag3 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'T1'), (?, 'T2'), (?, 'T3')", [tag1, tag2, tag3]);

  initCache(database);
  const before = getLandingCache().totalUsers;
  const form = new FormData();
  form.set("email", "cached@example.com");
  form.set("password", "secret123");
  form.set("password_confirmation", "secret123");
  form.append("tagIds", tag1);
  form.append("tagIds", tag2);
  form.append("tagIds", tag3);
  const response = await app.request("/auth/register", { method: "POST", body: form });
  expect(response.status).toBe(200);

  const otpRecord = database.query<{ otp_code: string }, [string]>("SELECT otp_code FROM registration_otps WHERE email = ?").get("cached@example.com");
  expect(otpRecord).toBeDefined();

  const verifyForm = new FormData();
  verifyForm.set("email", "cached@example.com");
  verifyForm.set("otp", otpRecord!.otp_code);
  await app.request("/auth/verify-otp", { method: "POST", body: verifyForm });

  expect(getLandingCache().totalUsers).toBe(before + 1);
});

test("registration rejects mismatched password confirmation", async () => {
  const form = new FormData();
  form.set("email", "new@example.com"); form.set("password", "secret123"); form.set("password_confirmation", "different");
  const response = await app.request("/auth/register", { method: "POST", body: form });
  expect(response.status).toBe(400);
  expect(await response.text()).toContain('role="alert"');
});

test("invalid login returns accessible form feedback", async () => {
  const form = new FormData(); form.set("identifier", "missing@example.com"); form.set("password", "wrong-password");
  const response = await app.request("/auth/login", { method: "POST", body: form });
  expect(response.status).toBe(401);
  const html = await response.text();
  expect(html).toContain("Invalid credentials.");
  expect(html).toContain('role="alert"');
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
  const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  const user = new FormData(); user.set("email", "editor@example.com"); user.set("password", "secret123"); user.set("role_id", role.id);
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
  expect(html).toContain("Record created.");
});

test("sql report renders readable schema and returns error toasts", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const report = await app.request("/dashboard/admin/report", { headers: { cookie } });
  const reportHtml = await report.text();
  expect(reportHtml).toContain("Column");
  expect(reportHtml).toContain('name="schema_field"');
  expect(reportHtml).toContain('hx-get="/dashboard/admin/report?schema_q=&amp;schema_field=table_name&amp;schema_sort=table_name&amp;schema_direction=desc"');
  const schemaSearch = await app.request("/dashboard/admin/report?schema_q=users&schema_field=table_name&schema_sort=name&schema_direction=asc", { headers: { cookie, "HX-Request": "true" } });
  expect(schemaSearch.status).toBe(200);
  const schemaHtml = await schemaSearch.text();
  expect(schemaHtml).not.toContain("<html");
  expect(schemaHtml).toContain("users");
  expect(schemaHtml).not.toContain("error_messages");
  const query = new FormData(); query.set("sql", "DELETE FROM users");
  const error = await (await app.request("/dashboard/admin/report", { method: "POST", headers: { cookie }, body: query })).text();
  expect(error).toContain('id="toast-container" hx-swap-oob="beforeend"');
  expect(error).toContain("alert-error");
});

test("admin tables support safe search and sorting", async () => {
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  database.run("INSERT INTO users (id,email,password_hash,role_id) VALUES (?,?,?,?)", [generateId(), "maya@example.com", "hash", role.id]);
  database.run("INSERT INTO users (id,email,password_hash,role_id) VALUES (?,?,?,?)", [generateId(), "noah@example.com", "hash", role.id]);
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
  expect(html).toContain('id="record-modal"');
  expect(html).toContain('role="alert"');
  expect(html).toContain('value="member"');
  expect(html).toContain('id="toast-container" hx-swap-oob="beforeend"');
});

test("invalid admin forms preserve actionable UI", async () => {
  initializeEventsDatabase(database);
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];

  const meet = new FormData(); meet.set("title", "Missing schedule");
  const meetResponse = await app.request("/dashboard/admin/meets", { method: "POST", headers: { cookie }, body: meet });
  expect(meetResponse.status).toBe(400);
  const meetHtml = await meetResponse.text();
  expect(meetHtml).toContain("Scheduled date and time are required.");
  expect(meetHtml).toContain('id="record-modal"');

  const bulkResponse = await app.request("/dashboard/admin/tags/bulk-delete", { method: "POST", headers: { cookie }, body: new FormData() });
  expect(bulkResponse.status).toBe(400);
  expect(await bulkResponse.text()).toContain("Select at least one record.");

  const meetId = generateId();
  database.run("INSERT INTO meets (id,title,scheduled_date,scheduled_time) VALUES (?,?,?,?)", [meetId, "Relations", "2099-01-01", "18:00"]);
  const invalidTag = new FormData(); invalidTag.set("tag_id", "invalid-tag-id");
  const relationResponse = await app.request(`/dashboard/admin/meets/${meetId}/tags`, { method: "POST", headers: { cookie }, body: invalidTag });
  expect(relationResponse.status).toBe(400);
  expect(await relationResponse.text()).toContain(`id="meet-relations-${meetId}"`);

  const adminRole = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='admin'").get()!;
  const invalidEndpoint = new FormData(); invalidEndpoint.set("endpoint_id", "invalid-endpoint-id");
  const mappingResponse = await app.request(`/dashboard/admin/roles/${adminRole.id}/endpoints`, { method: "POST", headers: { cookie }, body: invalidEndpoint });
  expect(mappingResponse.status).toBe(400);
  const mappingHtml = await mappingResponse.text();
  expect(mappingHtml).toContain('id="record-modal"');
  expect(mappingHtml).toContain('id="toast-container" hx-swap-oob="beforeend"');
});

test("admin create forms persist every resource", async () => {
  initializeEventsDatabase(database);
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;

  const submissions: [string, FormData, string, string][] = [];
  const tag = new FormData(); tag.set("title", "Testing"); tag.set("description", "Test tag"); submissions.push(["tags", tag, "tags", "Testing"]);
  const endpoint = new FormData(); endpoint.set("title", "/dashboard/admin/testing"); endpoint.set("description", "Test endpoint"); submissions.push(["endpoints", endpoint, "endpoints", "/dashboard/admin/testing"]);
  const newRole = new FormData(); newRole.set("title", "Reviewer"); newRole.set("description", "Reviews content"); submissions.push(["roles", newRole, "roles", "Reviewer"]);
  const meet = new FormData(); meet.set("title", "Form test meet"); meet.set("description", "Created through form"); meet.set("topics", '["Testing"]'); meet.set("scheduled_date", "2099-02-02"); meet.set("scheduled_time", "19:30"); meet.set("duration_minutes", "60"); submissions.push(["meets", meet, "meets", "Form test meet"]);
  for (const [resource, body, table, title] of submissions) {
    expect((await app.request(`/dashboard/admin/${resource}`, { method: "POST", headers: { cookie }, body })).status).toBe(200);
    expect(database.query(`SELECT 1 FROM ${table} WHERE title=? AND deleted_at IS NULL`).get(title)).toBeTruthy();
  }
  const user = new FormData(); user.set("email", "forms@example.com"); user.set("password", "sample-password"); user.set("role_id", role.id);
  expect((await app.request("/dashboard/admin/users", { method: "POST", headers: { cookie }, body: user })).status).toBe(200);
  expect(database.query("SELECT 1 FROM users WHERE email='forms@example.com'").get()).toBeTruthy();
});

test("admin edit delete bulk and endpoint mapping forms persist changes", async () => {
  initializeEventsDatabase(database);
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const member = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;

  const tag1 = generateId(), tag2 = generateId(), ep1 = generateId(), r1 = generateId(), m1 = generateId(), u1 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, ?), (?, ?)", [tag1, "Before tag", tag2, "Bulk tag"]);
  database.run("INSERT INTO endpoints (id, title) VALUES (?, ?)", [ep1, "/before"]);
  database.run("INSERT INTO roles (id, title) VALUES (?, ?)", [r1, "Before role"]);
  database.run("INSERT INTO meets (id, title, scheduled_date, scheduled_time) VALUES (?, 'Before meet', '2099-01-01', '18:00')", [m1]);
  database.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, 'before@example.com', 'hash', ?)", [u1, member.id]);

  const id = (table: string, titleColumn: string, value: string) => database.query<{ id: string }, [string]>(`SELECT id FROM ${table} WHERE ${titleColumn}=?`).get(value)!.id;
  const edits: [string, string, FormData, string, string][] = [];
  const tag = new FormData(); tag.set("title", "After tag"); tag.set("description", "Updated"); edits.push(["tags", id("tags", "title", "Before tag"), tag, "tags", "After tag"]);
  const endpoint = new FormData(); endpoint.set("title", "/after"); endpoint.set("description", "Updated"); edits.push(["endpoints", id("endpoints", "title", "/before"), endpoint, "endpoints", "/after"]);
  const role = new FormData(); role.set("title", "After role"); role.set("description", "Updated"); edits.push(["roles", id("roles", "title", "Before role"), role, "roles", "After role"]);
  const meet = new FormData(); meet.set("title", "After meet"); meet.set("description", "Updated"); meet.set("topics", "[]"); meet.set("scheduled_date", "2099-02-02"); meet.set("scheduled_time", "19:00"); meet.set("duration_minutes", "90"); edits.push(["meets", id("meets", "title", "Before meet"), meet, "meets", "After meet"]);
  for (const [resource, recordId, body, table, title] of edits) {
    expect((await app.request(`/dashboard/admin/${resource}/${recordId}`, { method: "POST", headers: { cookie }, body })).status).toBe(200);
    expect(database.query(`SELECT 1 FROM ${table} WHERE title=? AND deleted_at IS NULL`).get(title)).toBeTruthy();
  }
  const userId = id("users", "email", "before@example.com");
  const user = new FormData(); user.set("email", "after@example.com"); user.set("role_id", member.id); user.set("password", "new-password");
  expect((await app.request(`/dashboard/admin/users/${userId}`, { method: "POST", headers: { cookie }, body: user })).status).toBe(200);
  expect(await Bun.password.verify("new-password", database.query<{ password_hash: string }, [string]>("SELECT password_hash FROM users WHERE id=?").get(userId)!.password_hash)).toBe(true);

  const endpointId = id("endpoints", "title", "/after");
  const roleId = id("roles", "title", "After role");
  const mapping = new FormData(); mapping.set("endpoint_id", endpointId);
  expect((await app.request(`/dashboard/admin/roles/${roleId}/endpoints`, { method: "POST", headers: { cookie }, body: mapping })).status).toBe(200);
  expect(database.query("SELECT 1 FROM role_endpoints WHERE role_id=? AND endpoint_id=?").get(roleId, endpointId)).toBeTruthy();

  const bulkTagId = id("tags", "title", "Bulk tag");
  const bulk = new FormData(); bulk.append("ids", bulkTagId);
  expect((await app.request("/dashboard/admin/tags/bulk-delete", { method: "POST", headers: { cookie }, body: bulk })).status).toBe(200);
  expect(database.query<{ deleted_at: string }, [string]>("SELECT deleted_at FROM tags WHERE id=?").get(bulkTagId)).not.toEqual({ deleted_at: null });

  const tagId = id("tags", "title", "After tag");
  expect((await app.request(`/dashboard/admin/tags/${tagId}`, { method: "DELETE", headers: { cookie } })).status).toBe(200);
  expect(database.query<{ deleted_at: string }, [string]>("SELECT deleted_at FROM tags WHERE id=?").get(tagId)).not.toEqual({ deleted_at: null });
});

test("meet tags and attendees can be managed independently", async () => {
  initializeEventsDatabase(database);
  await initializeDatabase(database, { email: "admin@example.com", password: "secret123" });
  const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  const userId = generateId(), tagId = generateId(), meetId = generateId();
  database.run("INSERT INTO users (id,email,password_hash,role_id) VALUES (?,?,'hash',?)", [userId, "guest@example.com", role.id]);
  database.run("INSERT INTO tags (id,title,description) VALUES (?,?,?)", [tagId, "Bun", "Bun runtime"]);
  database.run("INSERT INTO meets (id,title,scheduled_date,scheduled_time) VALUES (?,?,'2099-01-01','18:00')", [meetId, "Runtime meetup"]);

  const login = new FormData(); login.set("identifier", "admin@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  initCache(database);
  const edit = await (await app.request(`/dashboard/admin/meets/${meetId}/edit`, { headers: { cookie } })).text();
  expect(edit).toContain(`/dashboard/admin/meets/${meetId}/tags`);
  expect(edit).toContain(`/dashboard/admin/meets/${meetId}/attendees`);

  const tag = new FormData(); tag.set("tag_id", tagId);
  const tagResponse = await app.request(`/dashboard/admin/meets/${meetId}/tags`, { method: "POST", headers: { cookie }, body: tag });
  expect(tagResponse.status).toBe(200);
  expect(await tagResponse.text()).toContain("Bun runtime");
  expect(database.query("SELECT 1 FROM meet_tags WHERE meet_id=? AND tag_id=?").get(meetId, tagId)).toBeTruthy();

  const attendee = new FormData(); attendee.set("user_id", userId);
  const attendeeResponse = await app.request(`/dashboard/admin/meets/${meetId}/attendees`, { method: "POST", headers: { cookie }, body: attendee });
  expect(attendeeResponse.status).toBe(200);
  expect(await attendeeResponse.text()).toContain("guest@example.com");
  expect(database.query("SELECT 1 FROM meet_attendees WHERE meet_id=? AND user_id=?").get(meetId, userId)).toBeTruthy();
  const landingBefore = await (await app.request("/")).text();
  expect(landingBefore).toContain("Runtime meetup");
  expect(landingBefore).toContain("Bun");
  expect(landingBefore).toContain("1 attending");

  expect((await app.request(`/dashboard/admin/meets/${meetId}/tags/${tagId}`, { method: "DELETE", headers: { cookie } })).status).toBe(200);
  expect((await app.request(`/dashboard/admin/meets/${meetId}/attendees/${userId}`, { method: "DELETE", headers: { cookie } })).status).toBe(200);
  expect(database.query("SELECT 1 FROM meet_tags WHERE meet_id=? AND tag_id=?").get(meetId, tagId)).toBeNull();
  expect(database.query("SELECT 1 FROM meet_attendees WHERE meet_id=? AND user_id=?").get(meetId, userId)).toBeNull();
  const landingAfter = await (await app.request("/")).text();
  expect(landingAfter).not.toContain("Bun");
  expect(landingAfter).toContain("0 attending");
});

test("member dashboard does not show admin navigation", async () => {
  await initializeEventsDatabase(database);
  const tag1 = generateId(), tag2 = generateId(), tag3 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'T1'), (?, 'T2'), (?, 'T3')", [tag1, tag2, tag3]);

  const register = new FormData();
  register.set("email", "member@example.com");
  register.set("password", "secret123");
  register.set("password_confirmation", "secret123");
  register.append("tagIds", tag1);
  register.append("tagIds", tag2);
  register.append("tagIds", tag3);
  await app.request("/auth/register", { method: "POST", body: register });
  const login = new FormData();
  login.set("identifier", "member@example.com");
  login.set("password", "secret123");
  const response = await app.request("/auth/login", { method: "POST", body: login });
  const dashboard = await app.request("/dashboard/user", { headers: { cookie: response.headers.get("set-cookie")!.split(";")[0] } });
  expect(await dashboard.text()).not.toContain('href="/dashboard/admin"');
});

test("authenticated users update only their own profile", async () => {
  const tag1 = generateId(), tag2 = generateId(), tag3 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'T1'), (?, 'T2'), (?, 'T3')", [tag1, tag2, tag3]);

  const register = new FormData(); register.set("email", "member@example.com"); register.set("password", "secret123"); register.set("password_confirmation", "secret123");
  register.append("tagIds", tag1); register.append("tagIds", tag2); register.append("tagIds", tag3);
  await app.request("/auth/register", { method: "POST", body: register });
  const login = new FormData(); login.set("identifier", "member@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const profile = new FormData(); profile.set("first_name", "Member"); profile.set("password", "new-secret"); profile.set("password_confirmation", "new-secret");
  expect((await app.request("/dashboard/profile", { method: "POST", headers: { cookie }, body: profile })).status).toBe(200);
  const user = database.query<{ first_name: string; password_hash: string }, []>("SELECT first_name,password_hash FROM users WHERE email='member@example.com'").get()!;
  expect(user.first_name).toBe("Member"); expect(await Bun.password.verify("new-secret", user.password_hash)).toBe(true);
});

test("profile uniqueness errors return visible feedback", async () => {
  const member = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title='member'").get()!;
  database.run("INSERT INTO users (id,email,username,password_hash,role_id) VALUES (?,?,?,?,?)", [generateId(), "taken@example.com", "taken", "hash", member.id]);
  const tag1 = generateId(), tag2 = generateId(), tag3 = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'T1'), (?, 'T2'), (?, 'T3')", [tag1, tag2, tag3]);

  const register = new FormData(); register.set("email", "member@example.com"); register.set("password", "secret123"); register.set("password_confirmation", "secret123");
  register.append("tagIds", tag1); register.append("tagIds", tag2); register.append("tagIds", tag3);
  await app.request("/auth/register", { method: "POST", body: register });
  const login = new FormData(); login.set("identifier", "member@example.com"); login.set("password", "secret123");
  const cookie = (await app.request("/auth/login", { method: "POST", body: login })).headers.get("set-cookie")!.split(";")[0];
  const profile = new FormData(); profile.set("username", "taken");
  const response = await app.request("/dashboard/profile", { method: "POST", headers: { cookie }, body: profile });
  expect(response.status).toBe(409);
  const html = await response.text();
  expect(html).toContain('role="alert"');
  expect(html).toContain("already in use");
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
