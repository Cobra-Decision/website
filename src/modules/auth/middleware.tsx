import type { Context, Next } from "hono";
import type { Database } from "bun:sqlite";
import { getCookie } from "hono/cookie";
import { database } from "../../lib/database";
import {
  SESSION_COOKIE,
  SESSION_DURATION,
  getSessionCookieOptions,
  verifyAndRefreshSession,
  type SessionClaims,
} from "./session";

export {
  SESSION_COOKIE,
  SESSION_DURATION,
  getSessionCookieOptions,
  verifyAndRefreshSession,
};

export type Claims = SessionClaims;

const permissionCache = new Map<string, Set<string>>();

export const ADMIN_SECTION_ENDPOINTS = [
  "/dashboard/admin/calendar",
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
  "/dashboard/admin/platforms-data",
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
  if (isSuperAdmin) return "/dashboard/admin/calendar";
  for (const ep of ADMIN_SECTION_ENDPOINTS) {
    if (allowed.has(ep)) return ep;
  }
  return "/dashboard/user";
}

const patternCache = new Map<string, RegExp>();

function patternToRegex(pattern: string): RegExp {
  let regex = patternCache.get(pattern);
  if (!regex) {
    // Replace :param with dynamic single-segment regex [^/]+
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:[a-zA-Z0-9_]+/g, "[^/]+");
    regex = new RegExp(`^${escaped}$`);
    patternCache.set(pattern, regex);
  }
  return regex;
}

export function matchEndpointPattern(allowedPatterns: Set<string>, path: string): boolean {
  if (allowedPatterns.has(path)) return true;
  for (const pattern of allowedPatterns) {
    if (pattern.includes(":")) {
      const rx = patternToRegex(pattern);
      if (rx.test(path)) return true;
    }
  }
  return false;
}

export function createPermissionChecker(db: Database) {
  const check = (roleId: string, path: string) => {
    const permissions = getRoleAllowedEndpoints(db, roleId);
    return matchEndpointPattern(permissions, path);
  };
  check.clear = (roleId?: string) => (roleId === undefined ? permissionCache.clear() : permissionCache.delete(roleId));
  return check;
}

const canAccess = createPermissionChecker(database);

export const authGuard = (jwtSecret = process.env.JWT_SECRET ?? "development-secret", db: Database = database) =>
  async (c: Context, next: Next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const claims = await verifyAndRefreshSession(c, token, jwtSecret, db);
    if (!claims) return c.redirect("/auth");
    c.set("auth", claims);
    return next();
  };

export const requirePermission = (jwtSecret = process.env.JWT_SECRET ?? "development-secret", db: Database = database) => {
  const canAccessDb = createPermissionChecker(db);
  return async (c: Context, next: Next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const claims = await verifyAndRefreshSession(c, token, jwtSecret, db);
    if (!claims) return c.html(<p class="alert alert-error">Authentication required.</p>, 401);
    if (!canAccessDb(claims.role_id, c.req.path)) {
      return c.html(<p class="alert alert-error">You do not have permission to access this page.</p>, 403);
    }
    c.set("auth", claims);
    return next();
  };
};

export function clearPermissionCache(roleId?: string) {
  canAccess.clear(roleId);
}
