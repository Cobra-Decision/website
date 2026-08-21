import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { sign } from "hono/jwt";
import { runMigrations } from "../../lib/database/migration";
import { seedFull } from "../../lib/database/seeding";
import { createApp } from "../../app";
import {
  createPermissionChecker,
  getFirstAllowedAdminPath,
  getRoleAllowedEndpoints,
  clearPermissionCache,
  ADMIN_SECTION_ENDPOINTS,
} from "./middleware";

const JWT_SECRET = "test-jwt-secret";

async function setupTestApp() {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedFull(db);
  clearPermissionCache();

  const dummyCaptcha = {
    middleware: async (_c: any, next: any) => next(),
    challengeHandler: async (c: any) => c.text("ok"),
  };

  const app = createApp({
    database: db,
    captcha: dummyCaptcha,
    jwtSecret: JWT_SECRET,
  });

  return { db, app };
}

async function createAuthCookie(user: { id: string; username: string; role_title: string; role_id: string }) {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: user.id, username: user.username, role_title: user.role_title, role_id: user.role_id, iat: now, exp: now + 3600 },
    JWT_SECRET,
    "HS256"
  );
  return `session=${token}`;
}

describe("Permissions & Endpoint Integrity Suite", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const setup = await setupTestApp();
    db = setup.db;
    app = setup.app;
  });

  describe("Unit: Permission Checker & Cache Invalidation", () => {
    test("Super Admin bypasses all endpoint checks automatically", () => {
      const superAdminRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("Super Admin")!;
      const can = createPermissionChecker(db);

      for (const endpoint of ADMIN_SECTION_ENDPOINTS) {
        expect(can(superAdminRole.id, endpoint)).toBe(true);
      }
      expect(can(superAdminRole.id, "/dashboard/admin/unknown-subroute")).toBe(false);
    });

    test("Member role cannot access any admin endpoint", () => {
      const memberRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member")!;
      const can = createPermissionChecker(db);

      for (const endpoint of ADMIN_SECTION_ENDPOINTS) {
        expect(can(memberRole.id, endpoint)).toBe(false);
      }
      expect(can(memberRole.id, "/dashboard/user")).toBe(true);
      expect(can(memberRole.id, "/dashboard/account")).toBe(true);
    });

    test("Permission cache updates immediately on endpoint revocation", () => {
      const adminRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("admin")!;
      const usersEp = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/users")!;
      const can = createPermissionChecker(db);

      expect(can(adminRole.id, "/dashboard/admin/users")).toBe(true);

      // Revoke endpoint from role in DB
      db.run("DELETE FROM role_endpoints WHERE role_id = ? AND endpoint_id = ?", [adminRole.id, usersEp.id]);
      clearPermissionCache(adminRole.id);

      expect(can(adminRole.id, "/dashboard/admin/users")).toBe(false);
      expect(can(adminRole.id, "/dashboard/admin/meets")).toBe(true);
    });

    test("Prefix matching allows sub-actions under allowed resource", () => {
      const adminRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("admin")!;
      const can = createPermissionChecker(db);

      expect(can(adminRole.id, "/dashboard/admin/users")).toBe(true);
      expect(can(adminRole.id, "/dashboard/admin/users/123/edit")).toBe(true);
      expect(can(adminRole.id, "/dashboard/admin/users/new")).toBe(true);
    });

    test("getFirstAllowedAdminPath picks earliest valid endpoint in order", () => {
      const adminRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("admin")!;

      expect(getFirstAllowedAdminPath(db, adminRole.id)).toBe("/dashboard/admin/users");

      // Revoke users & meets
      const epUsers = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/users")!;
      const epMeets = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/meets")!;
      db.run("DELETE FROM role_endpoints WHERE role_id = ? AND endpoint_id IN (?, ?)", [adminRole.id, epUsers.id, epMeets.id]);
      clearPermissionCache(adminRole.id);

      expect(getFirstAllowedAdminPath(db, adminRole.id)).toBe("/dashboard/admin/tags");

      // Revoke all admin endpoints
      db.run("DELETE FROM role_endpoints WHERE role_id = ?", [adminRole.id]);
      clearPermissionCache(adminRole.id);

      expect(getFirstAllowedAdminPath(db, adminRole.id)).toBe("/dashboard/user");
    });
  });

  describe("Integration: HTTP Route Guards & HTTP Status Codes", () => {
    test("Unauthenticated requests to admin routes redirect to /auth", async () => {
      const res = await app.fetch(new Request("http://localhost/dashboard/admin/meets", { redirect: "manual" }));
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/auth");
    });

    test("Tampered or invalid session token is rejected with redirect to /auth", async () => {
      const res = await app.fetch(new Request("http://localhost/dashboard/admin/meets", {
        headers: { Cookie: "session=invalid.tampered.token" },
        redirect: "manual",
      }));
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/auth");
    });

    test("Standard member user receives 403 on admin subroutes", async () => {
      const member = db.query<{ id: string; username: string; role_id: string }, [string]>(
        "SELECT id, username, role_id FROM users WHERE email = ?"
      ).get("maya@example.com")!;

      const cookie = await createAuthCookie({
        id: member.id,
        username: member.username,
        role_title: "member",
        role_id: member.role_id,
      });

      for (const endpoint of ["/dashboard/admin/users", "/dashboard/admin/meets", "/dashboard/admin/database", "/dashboard/admin/files"]) {
        const res = await app.fetch(new Request(`http://localhost${endpoint}`, {
          headers: { Cookie: cookie },
        }));
        expect(res.status).toBe(403);
      }
    });

    test("Admin with custom stripped permissions cannot GET, POST, or DELETE forbidden endpoints", async () => {
      const admin = db.query<{ id: string; username: string; role_id: string }, [string]>(
        "SELECT id, username, role_id FROM users WHERE email = ?"
      ).get("alex.admin@example.com")!;

      // Strip users and database management
      const epUsers = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/users")!;
      const epDb = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/database")!;
      db.run("DELETE FROM role_endpoints WHERE role_id = ? AND endpoint_id IN (?, ?)", [admin.role_id, epUsers.id, epDb.id]);
      clearPermissionCache(admin.role_id);

      const cookie = await createAuthCookie({
        id: admin.id,
        username: admin.username,
        role_title: "admin",
        role_id: admin.role_id,
      });

      // GET Forbidden
      const resGet = await app.fetch(new Request("http://localhost/dashboard/admin/users", { headers: { Cookie: cookie } }));
      expect(resGet.status).toBe(403);

      // POST Forbidden
      const resPost = await app.fetch(new Request("http://localhost/dashboard/admin/users", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
        body: "email=hacker@example.com&password=secret&role_id=" + admin.role_id,
      }));
      expect(resPost.status).toBe(403);

      // DELETE Forbidden
      const resDelete = await app.fetch(new Request("http://localhost/dashboard/admin/users/fake-id", {
        method: "DELETE",
        headers: { Cookie: cookie },
      }));
      expect(resDelete.status).toBe(403);

      // Allowed endpoint remains accessible
      const resAllowed = await app.fetch(new Request("http://localhost/dashboard/admin/meets", { headers: { Cookie: cookie } }));
      expect(resAllowed.status).toBe(200);
    });

    test("Login and /dashboard/admin route redirect to first authorized endpoint", async () => {
      const admin = db.query<{ id: string; username: string; role_id: string }, [string]>(
        "SELECT id, username, role_id FROM users WHERE email = ?"
      ).get("alex.admin@example.com")!;

      // Remove /dashboard/admin/users from admin
      const epUsers = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/users")!;
      db.run("DELETE FROM role_endpoints WHERE role_id = ? AND endpoint_id = ?", [admin.role_id, epUsers.id]);
      clearPermissionCache(admin.role_id);

      const cookie = await createAuthCookie({
        id: admin.id,
        username: admin.username,
        role_title: "admin",
        role_id: admin.role_id,
      });

      // Admin root navigation
      const resRoot = await app.fetch(new Request("http://localhost/dashboard/admin", {
        headers: { Cookie: cookie },
        redirect: "manual",
      }));
      expect(resRoot.status).toBe(302);
      expect(resRoot.headers.get("location")).toBe("/dashboard/admin/meets");

      // Auth root redirect for already authenticated user
      const resAuth = await app.fetch(new Request("http://localhost/auth", {
        headers: { Cookie: cookie },
        redirect: "manual",
      }));
      expect(resAuth.status).toBe(302);
      expect(resAuth.headers.get("location")).toBe("/dashboard/admin");
    });

    test("Super Admin protection: Super Admin role cannot be modified or deleted", async () => {
      const superAdminRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("Super Admin")!;
      const admin = db.query<{ id: string; username: string; role_id: string }, [string]>(
        "SELECT id, username, role_id FROM users WHERE email = ?"
      ).get("alex.admin@example.com")!;

      const cookie = await createAuthCookie({
        id: admin.id,
        username: admin.username,
        role_title: "admin",
        role_id: admin.role_id,
      });

      // Try assigning endpoint to Super Admin
      const epUsers = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get("/dashboard/admin/users")!;
      const resAssign = await app.fetch(new Request(`http://localhost/dashboard/admin/roles/${superAdminRole.id}/endpoints`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
        body: `endpoint_id=${epUsers.id}`,
      }));
      expect(resAssign.status).toBe(403);

      // Try deleting Super Admin role
      const resDelete = await app.fetch(new Request(`http://localhost/dashboard/admin/roles/${superAdminRole.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      }));
      expect(resDelete.status).toBe(403);
    });
  });
});
