import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { normalizeRegistration } from "../src/modules/auth/service";
import { createPermissionChecker } from "../src/modules/auth/middleware";
import { initializeDatabase } from "../src/modules/auth/database";

test("registration requires only a valid email and password", () => {
  expect(normalizeRegistration({ email: " user@example.com ", password: "secret123" })).toEqual({
    email: "user@example.com", password: "secret123", username: null, phone: null, firstName: null, lastName: null,
  });
  expect(normalizeRegistration({ email: "invalid", password: "secret123" })).toBeNull();
  expect(normalizeRegistration({ email: "user@example.com", password: "" })).toBeNull();
});

test("permission checker ignores soft-deleted permissions and can clear its cache", async () => {
  const database = new Database(":memory:");
  await initializeDatabase(database);
  const admin = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'admin' AND deleted_at IS NULL").get()!;
  const canAccess = createPermissionChecker(database);
  expect(canAccess(admin.id, "/dashboard")).toBe(true);
  database.run("UPDATE role_endpoints SET deleted_at = CURRENT_TIMESTAMP");
  expect(canAccess(admin.id, "/dashboard")).toBe(true);
  canAccess.clear(admin.id);
  expect(canAccess(admin.id, "/dashboard")).toBe(false);
  database.close();
});
