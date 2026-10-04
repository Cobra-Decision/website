import type { Context, Next } from "hono";
import type { Database } from "bun:sqlite";
import { getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { database } from "../../lib/database";
import { getTimezone } from "../../lib/i18n/context";

export type Claims = { sub: string; username: string; role_title: string; role_id: string; iat?: number; exp?: number };
const permissionCache = new Map<string, Set<string>>();
export const SESSION_DURATION = 60 * 60 * 8; // 8 hours
const REFRESH_THRESHOLD = 60 * 60 * 2; // Refresh if remaining life < 2 hours
const MAX_REFRESH_GRACE_PERIOD = 60 * 60 * 24 * 7; // Max 7 days to revive an expired session

export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "None" : "Lax") as "None" | "Lax",
    path: "/",
    maxAge: SESSION_DURATION,
  };
}

export async function verifyAndRefreshSession(
  c: Context,
  token: string | undefined,
  jwtSecret: string,
  db: Database = database
): Promise<Claims | null> {
  if (!token) return null;
  try {
    let claims: Claims;
    let isExpired = false;
    try {
      claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
    } catch {
      claims = (await verify(token, jwtSecret, { alg: "HS256", exp: false })) as unknown as Claims;
      isExpired = true;
    }

    const now = Math.floor(Date.now() / 1000);
    if (isExpired && claims.exp && now - claims.exp > MAX_REFRESH_GRACE_PERIOD) {
      return null;
    }

    let user: { id: string; username: string | null; email: string; timezone?: string | null; role_title: string; role_id: string } | null = null;
    try {
      user = db
        .query<{ id: string; username: string | null; email: string; timezone?: string | null; role_title: string; role_id: string }, [string]>(
          `SELECT u.id, u.username, u.email, u.timezone, r.title role_title, u.role_id
           FROM users u JOIN roles r ON r.id = u.role_id
           WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`
        )
        .get(claims.sub);
    } catch {
      // Fallback for minimal test schema variations
      try {
        user = db
          .query<{ id: string; username: string | null; email: string; role_title: string; role_id: string }, [string]>(
            `SELECT u.id, u.username, u.email, r.title role_title, u.role_id
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.id = ?`
          )
          .get(claims.sub);
      } catch {}
    }

    if (!user) return null;

    const reqTz = getTimezone(c, "");
    if (reqTz && user.timezone !== undefined && reqTz !== user.timezone) {
      try {
        db.run(
          "UPDATE users SET timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (timezone IS NULL OR timezone != ?)",
          [reqTz, user.id, reqTz]
        );
        user.timezone = reqTz;
      } catch {}
    }

    const isExpiredOrStale = isExpired || !claims.exp || claims.exp <= now || (claims.exp - now) < REFRESH_THRESHOLD;
    const isDataUpdated = claims.role_id !== user.role_id || claims.role_title !== user.role_title || claims.username !== (user.username ?? user.email);

    if (isExpiredOrStale || isDataUpdated) {
      const refreshedClaims: Claims = {
        sub: user.id,
        username: user.username ?? user.email,
        role_title: user.role_title,
        role_id: user.role_id,
        iat: now,
        exp: now + SESSION_DURATION,
      };
      const newToken = await sign(refreshedClaims, jwtSecret, "HS256");
      setCookie(c, "session", newToken, getSessionCookieOptions());
      return refreshedClaims;
    }
    return claims;
  } catch {
    return null;
  }
}

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
  check.clear = (roleId?: string) => roleId === undefined ? permissionCache.clear() : permissionCache.delete(roleId);
  return check;
}

const canAccess = createPermissionChecker(database);

export const authGuard = (jwtSecret = process.env.JWT_SECRET ?? "development-secret", db: Database = database) =>
  async (c: Context, next: Next) => {
    const token = getCookie(c, "session");
    const claims = await verifyAndRefreshSession(c, token, jwtSecret, db);
    if (!claims) return c.redirect("/auth");
    c.set("auth", claims);
    return next();
  };

export const requirePermission = (jwtSecret = process.env.JWT_SECRET ?? "development-secret", db: Database = database) =>
  async (c: Context, next: Next) => {
    const token = getCookie(c, "session");
    const claims = await verifyAndRefreshSession(c, token, jwtSecret, db);
    if (!claims) return c.html(<p class="alert alert-error">Authentication required.</p>, 401);
    if (!canAccess(claims.role_id, c.req.path)) {
      return c.html(<p class="alert alert-error">You do not have permission to access this page.</p>, 403);
    }
    c.set("auth", claims);
    return next();
  };

export function clearPermissionCache(roleId?: string) {
  canAccess.clear(roleId);
}
