import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../../src/app";
import { initializeDatabase } from "../../src/modules/auth/database";
import { initializeEventsDatabase } from "../../src/modules/events/database";
import { generateId } from "../../src/lib/id";
import { seedSampleData } from "../../src/lib/seed";
import { join } from "node:path";
import { writeFile, rm } from "node:fs/promises";

let database: Database;
let app: ReturnType<typeof createApp>;
let adminCookie: string;
let memberCookie: string;
const TEST_STORAGE_DIR = "./public/uploads_test";

beforeEach(async () => {
  process.env.STORAGE_DIR = TEST_STORAGE_DIR;
  database = new Database(":memory:");
  await initializeDatabase(database);
  initializeEventsDatabase(database);
  await seedSampleData(database);

  const passCaptcha: MiddlewareHandler = async (_, next) => next();
  app = createApp({ database, captcha: { middleware: passCaptcha, challengeHandler: (c) => c.json({}) } });

  // Login as admin
  const loginForm = new FormData();
  loginForm.set("identifier", "alex.admin@example.com");
  loginForm.set("password", "sample-password");
  const loginRes = await app.request("/auth/login", { method: "POST", body: loginForm });
  adminCookie = loginRes.headers.get("set-cookie")!.split(";")[0];

  // Login as member
  const memberLoginForm = new FormData();
  memberLoginForm.set("identifier", "maya@example.com");
  memberLoginForm.set("password", "sample-password");
  const memberLoginRes = await app.request("/auth/login", { method: "POST", body: memberLoginForm });
  memberCookie = memberLoginRes.headers.get("set-cookie")!.split(";")[0];
});

afterEach(async () => {
  database.close();
  await rm(TEST_STORAGE_DIR, { recursive: true, force: true }).catch(() => {});
});

test("Admin endpoints permission check rejects unauthorized member", async () => {
  const res = await app.request("/dashboard/admin/users", {
    headers: { cookie: memberCookie },
  });
  expect(res.status).toBe(403);
});

test("Admin CRUD for tags: add, edit, single delete, bulk delete", async () => {
  // 1. Add tag
  const addForm = new FormData();
  addForm.set("title", "Rust Lang");
  addForm.set("description", "Systems programming");
  const addRes = await app.request("/dashboard/admin/tags", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: addForm,
  });
  expect(addRes.status).toBe(200);
  const tagRecord = database.query<{ id: string; title: string; description: string }, [string]>(
    "SELECT id, title, description FROM tags WHERE title = ? AND deleted_at IS NULL"
  ).get("Rust Lang")!;
  expect(tagRecord).toBeDefined();
  expect(tagRecord.description).toBe("Systems programming");

  // 2. Edit tag modal & submit
  const editModalRes = await app.request(`/dashboard/admin/tags/${tagRecord.id}/edit`, {
    headers: { cookie: adminCookie },
  });
  expect(editModalRes.status).toBe(200);
  expect(await editModalRes.text()).toContain("Rust Lang");

  const editForm = new FormData();
  editForm.set("title", "Rust Programming");
  editForm.set("description", "High performance rust");
  const editRes = await app.request(`/dashboard/admin/tags/${tagRecord.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
    body: editForm,
  });
  expect(editRes.status).toBe(200);
  const updatedTag = database.query<{ title: string; description: string }, [string]>(
    "SELECT title, description FROM tags WHERE id = ?"
  ).get(tagRecord.id)!;
  expect(updatedTag.title).toBe("Rust Programming");
  expect(updatedTag.description).toBe("High performance rust");

  // 3. Single delete confirm modal & delete action
  const confirmRes = await app.request(`/dashboard/admin/tags/${tagRecord.id}/confirm`, {
    headers: { cookie: adminCookie },
  });
  expect(confirmRes.status).toBe(200);
  const confirmHtml = await confirmRes.text();
  expect(confirmHtml).toContain("Rust Programming");
  expect(confirmHtml).toContain(`hx-delete="/dashboard/admin/tags/${tagRecord.id}"`);
  expect(confirmHtml).not.toContain("onclick=\"this.closest('dialog').remove()\"");

  const deleteRes = await app.request(`/dashboard/admin/tags/${tagRecord.id}`, {
    method: "DELETE",
    headers: { cookie: adminCookie },
  });
  expect(deleteRes.status).toBe(200);
  const deletedTag = database.query<{ deleted_at: string | null }, [string]>(
    "SELECT deleted_at FROM tags WHERE id = ?"
  ).get(tagRecord.id)!;
  expect(deletedTag.deleted_at).not.toBeNull();

  // 4. Bulk delete
  const tagA = generateId();
  const tagB = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'Tag A'), (?, 'Tag B')", [tagA, tagB]);

  const bulkConfirmForm = new FormData();
  bulkConfirmForm.append("ids", tagA);
  bulkConfirmForm.append("ids", tagB);
  const bulkConfirmRes = await app.request("/dashboard/admin/tags/bulk-confirm", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: bulkConfirmForm,
  });
  expect(bulkConfirmRes.status).toBe(200);
  const bulkConfirmHtml = await bulkConfirmRes.text();
  expect(bulkConfirmHtml).toContain("Tag A");
  expect(bulkConfirmHtml).toContain("Tag B");
  expect(bulkConfirmHtml).toContain('hx-post="/dashboard/admin/tags/bulk-delete"');

  const bulkDeleteForm = new FormData();
  bulkDeleteForm.append("ids", tagA);
  bulkDeleteForm.append("ids", tagB);
  const bulkDeleteRes = await app.request("/dashboard/admin/tags/bulk-delete", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: bulkDeleteForm,
  });
  expect(bulkDeleteRes.status).toBe(200);
  const remaining = database.query<{ count: number }, [string, string]>(
    "SELECT COUNT(*) as count FROM tags WHERE id IN (?, ?) AND deleted_at IS NULL"
  ).get(tagA, tagB)!;
  expect(remaining.count).toBe(0);
});

test("Admin CRUD for meets: add, edit, single delete, bulk delete, meet relations", async () => {
  // 1. Add meet
  const meetForm = new FormData();
  meetForm.set("title", "Fullstack Bun Meet");
  meetForm.set("description", "Deep dive into Bun");
  meetForm.set("topics", "Bun, TypeScript, Hono");
  meetForm.set("scheduled_date", "2099-05-10");
  meetForm.set("scheduled_time", "19:00");
  meetForm.set("duration_minutes", "90");
  meetForm.set("status", "upcoming");
  meetForm.set("access_status", "public");

  const addRes = await app.request("/dashboard/admin/meets", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: meetForm,
  });
  expect(addRes.status).toBe(200);

  const meetRecord = database.query<{ id: string; title: string; duration_minutes: number }, [string]>(
    "SELECT id, title, duration_minutes FROM meets WHERE title = ? AND deleted_at IS NULL"
  ).get("Fullstack Bun Meet")!;
  expect(meetRecord).toBeDefined();
  expect(meetRecord.duration_minutes).toBe(90);

  // 2. Add and remove tag relation on meet
  const tagId = generateId();
  database.run("INSERT INTO tags (id, title) VALUES (?, 'BunTag')", [tagId]);

  const addTagRelationForm = new FormData();
  addTagRelationForm.set("tag_id", tagId);
  const addTagRelRes = await app.request(`/dashboard/admin/meets/${meetRecord.id}/tags`, {
    method: "POST",
    headers: { cookie: adminCookie },
    body: addTagRelationForm,
  });
  expect(addTagRelRes.status).toBe(200);
  expect(database.query("SELECT 1 FROM meet_tags WHERE meet_id=? AND tag_id=?").get(meetRecord.id, tagId)).toBeTruthy();

  const removeTagRelRes = await app.request(`/dashboard/admin/meets/${meetRecord.id}/tags/${tagId}`, {
    method: "DELETE",
    headers: { cookie: adminCookie },
  });
  expect(removeTagRelRes.status).toBe(200);
  expect(database.query("SELECT 1 FROM meet_tags WHERE meet_id=? AND tag_id=?").get(meetRecord.id, tagId)).toBeNull();

  // 3. Edit meet
  const editForm = new FormData();
  editForm.set("title", "Updated Fullstack Bun Meet");
  editForm.set("description", "Updated description");
  editForm.set("scheduled_date", "2099-05-11");
  editForm.set("scheduled_time", "20:00");
  editForm.set("duration_minutes", "120");
  editForm.set("status", "live");
  editForm.set("access_status", "public");

  const editRes = await app.request(`/dashboard/admin/meets/${meetRecord.id}`, {
    method: "POST",
    headers: { cookie: adminCookie },
    body: editForm,
  });
  expect(editRes.status).toBe(200);
  const updatedMeet = database.query<{ title: string; status: string; duration_minutes: number }, [string]>(
    "SELECT title, status, duration_minutes FROM meets WHERE id=?"
  ).get(meetRecord.id)!;
  expect(updatedMeet.title).toBe("Updated Fullstack Bun Meet");
  expect(updatedMeet.status).toBe("live");
  expect(updatedMeet.duration_minutes).toBe(120);

  // 4. Single delete
  const deleteRes = await app.request(`/dashboard/admin/meets/${meetRecord.id}`, {
    method: "DELETE",
    headers: { cookie: adminCookie },
  });
  expect(deleteRes.status).toBe(200);
  expect(database.query("SELECT 1 FROM meets WHERE id=? AND deleted_at IS NULL").get(meetRecord.id)).toBeNull();
});

test("Admin CRUD for files: upload, rename, duplicate, single delete, bulk delete", async () => {
  // 1. Upload file
  const fileContent = new Uint8Array([1, 2, 3, 4]);
  const uploadFile = new File([fileContent], "test_doc.pdf", { type: "application/pdf" });
  const uploadForm = new FormData();
  uploadForm.set("file", uploadFile);

  const uploadRes = await app.request("/dashboard/admin/files/upload", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: uploadForm,
  });
  expect(uploadRes.status).toBe(200);

  // 2. Duplicate file
  const dupForm = new FormData();
  dupForm.set("filename", "test_doc.pdf");
  const dupRes = await app.request("/dashboard/admin/files/duplicate", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: dupForm,
  });
  expect(dupRes.status).toBe(200);
  const dupHtml = await dupRes.text();
  expect(dupHtml).toContain("copy_");

  // 3. Rename file
  const renameForm = new FormData();
  renameForm.set("oldName", "test_doc.pdf");
  renameForm.set("newName", "renamed_doc.pdf");
  const renameRes = await app.request("/dashboard/admin/files/rename", {
    method: "PUT",
    headers: { cookie: adminCookie },
    body: renameForm,
  });
  expect(renameRes.status).toBe(200);
  const renameHtml = await renameRes.text();
  expect(renameHtml).toContain("renamed_doc.pdf");

  // 4. Delete confirm modal & single delete
  const confirmRes = await app.request("/dashboard/admin/files/confirm-delete?name=renamed_doc.pdf", {
    headers: { cookie: adminCookie },
  });
  expect(confirmRes.status).toBe(200);
  const confirmHtml = await confirmRes.text();
  expect(confirmHtml).toContain("renamed_doc.pdf");
  expect(confirmHtml).toContain('hx-delete="/dashboard/admin/files/renamed_doc.pdf"');
  expect(confirmHtml).not.toContain("onclick=\"this.closest('dialog').remove()\"");

  const deleteRes = await app.request("/dashboard/admin/files/renamed_doc.pdf", {
    method: "DELETE",
    headers: { cookie: adminCookie },
  });
  expect(deleteRes.status).toBe(200);

  // 5. Bulk delete files
  await writeFile(join(TEST_STORAGE_DIR, "file_a.png"), "test content");
  await writeFile(join(TEST_STORAGE_DIR, "file_b.png"), "test content");

  const bulkConfirmForm = new FormData();
  bulkConfirmForm.append("filenames", "file_a.png");
  bulkConfirmForm.append("filenames", "file_b.png");
  const bulkConfirmRes = await app.request("/dashboard/admin/files/bulk-confirm", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: bulkConfirmForm,
  });
  expect(bulkConfirmRes.status).toBe(200);
  const bulkHtml = await bulkConfirmRes.text();
  expect(bulkHtml).toContain("file_a.png");
  expect(bulkHtml).toContain("file_b.png");

  const bulkDeleteForm = new FormData();
  bulkDeleteForm.append("filenames", "file_a.png");
  bulkDeleteForm.append("filenames", "file_b.png");
  const bulkDeleteRes = await app.request("/dashboard/admin/files/bulk-delete", {
    method: "POST",
    headers: { cookie: adminCookie },
    body: bulkDeleteForm,
  });
  expect(bulkDeleteRes.status).toBe(200);
  expect(await Bun.file(join(TEST_STORAGE_DIR, "file_a.png")).exists()).toBe(false);
  expect(await Bun.file(join(TEST_STORAGE_DIR, "file_b.png")).exists()).toBe(false);
});
