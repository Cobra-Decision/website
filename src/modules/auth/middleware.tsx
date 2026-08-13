import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { database } from "../../lib/database";

type Claims = { sub: string; username: string; role_title: string; role_id: number };
const permissionCache = new Map<number, Set<string>>();

function permissionsFor(roleId: number) {
  const cached = permissionCache.get(roleId);
  if (cached) return cached;
  const rows = database.query<{ title: string }, [number]>(
    `SELECT e.title FROM endpoints e
     JOIN role_endpoints re ON re.endpoint_id = e.id
     WHERE re.role_id = ? AND e.deleted_at IS NULL
       AND re.deleted_at IS NULL`,
  ).all(roleId);
  const permissions = new Set(rows.map(({ title }) => title));
  permissionCache.set(roleId, permissions);
  return permissions;
}

export const requirePermission = (jwtSecret = process.env.JWT_SECRET ?? "development-secret") =>
  async (c: Context, next: Next) => {
    const token = getCookie(c, "session");
    if (!token) return c.html(<p class="alert alert-error">Authentication required.</p>, 401);
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
      if (!permissionsFor(claims.role_id).has(c.req.path)) {
        return c.html(<p class="alert alert-error">You do not have permission to access this page.</p>, 403);
      }
      c.set("auth", claims);
      return next();
    } catch {
      return c.html(<p class="alert alert-error">Invalid session.</p>, 401);
    }
  };

export function clearPermissionCache(roleId?: number) {
  if (roleId === undefined) permissionCache.clear();
  else permissionCache.delete(roleId);
}
