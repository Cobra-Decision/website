import type { Context, Next } from "hono";
import type { Database } from "bun:sqlite";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { database } from "../../lib/database";

export type Claims = { sub: string; username: string; role_title: string; role_id: string };
const permissionCache = new Map<string, Set<string>>();

export const ADMIN_SECTION_ENDPOINTS = [
  "/dashboard/admin/users",
  "/dashboard/admin/meets",
  "/dashboard/admin/tags",
  "/dashboard/admin/roles",
  "/dashboard/admin/endpoints",
  "/dashboard/admin/files",
  "/dashboard/admin/mail-editor",
  "/dashboard/admin/mail-scheduler",
  "/dashboard/admin/mail-management",
  "/dashboard/admin/mailer",
  "/dashboard/admin/database",
  "/dashboard/admin/report",
] as const;

export function getRoleAllowedEndpoints(db: Database, roleId: string): Set<string> {
  let permissions = permissionCache.get(roleId);
  if (!permissions) {
    const isSuperAdmin = db.query<{ title: string }, [string]>("SELECT title FROM roles WHERE id = ? AND deleted_at IS NULL").get(roleId)?.title === "Super Admin";
    if (isSuperAdmin) {
      const allEndpoints = db.query<{ title: string }, []>("SELECT title FROM endpoints WHERE deleted_at IS NULL").all();
      permissions = new Set(allEndpoints.map(({ title }) => title));
    } else {
      const rows = db.query<{ title: string }, [string]>(
        `SELECT e.title FROM endpoints e JOIN role_endpoints re ON re.endpoint_id = e.id
         WHERE re.role_id = ? AND e.deleted_at IS NULL AND re.deleted_at IS NULL`,
      ).all(roleId);
      permissions = new Set(rows.map(({ title }) => title));
    }
    permissionCache.set(roleId, permissions);
  }
  return permissions;
}

export function getFirstAllowedAdminPath(db: Database, roleId: string): string {
  const allowed = getRoleAllowedEndpoints(db, roleId);
  const isSuperAdmin = db.query<{ title: string }, [string]>("SELECT title FROM roles WHERE id = ? AND deleted_at IS NULL").get(roleId)?.title === "Super Admin";
  if (isSuperAdmin) return "/dashboard/admin/users";
  for (const ep of ADMIN_SECTION_ENDPOINTS) {
    if (allowed.has(ep)) return ep;
  }
  return "/dashboard/user";
}

export function createPermissionChecker(db: Database) {
  const check = (roleId: string, path: string) => {
    const permissions = getRoleAllowedEndpoints(db, roleId);
    if (permissions.has(path)) return true;
    const basePath = path.match(/^\/dashboard\/admin\/[^/]+/)?.[0];
    if (basePath && permissions.has(basePath)) return true;
    return false;
  };
  check.clear = (roleId?: string) => roleId === undefined ? permissionCache.clear() : permissionCache.delete(roleId);
  return check;
}

const canAccess = createPermissionChecker(database);

export const requirePermission = (jwtSecret = process.env.JWT_SECRET ?? "development-secret") =>
  async (c: Context, next: Next) => {
    const token = getCookie(c, "session");
    if (!token) return c.html(<p class="alert alert-error">Authentication required.</p>, 401);
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
      if (!canAccess(claims.role_id, c.req.path)) {
        return c.html(<p class="alert alert-error">You do not have permission to access this page.</p>, 403);
      }
      c.set("auth", claims);
      return next();
    } catch {
      return c.html(<p class="alert alert-error">Invalid session.</p>, 401);
    }
  };

export function clearPermissionCache(roleId?: string) {
  canAccess.clear(roleId);
}
