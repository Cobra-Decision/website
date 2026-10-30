import type { Context } from "hono";
import type { Database } from "bun:sqlite";
import { setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import type { CookieOptions } from "hono/utils/cookie";
import type { JWTPayload } from "hono/utils/jwt/types";
import { database as defaultDb } from "../../lib/database";
import { getTimezone } from "../../lib/i18n/context";

export const SESSION_COOKIE = "session";
export const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days in seconds
export const REFRESH_THRESHOLD = 60 * 60 * 24 * 15; // 15 days in seconds
export const MAX_REFRESH_GRACE_PERIOD = 60 * 60 * 24 * 7; // 7 days grace in seconds
const SESSION_ALGORITHM = "HS256";

export type SessionIdentity = {
  sub: string;
  username: string;
  role_title: string;
  role_id: string;
};

export type SessionClaims = SessionIdentity & {
  iat: number;
  exp: number;
};

export type AuthEnv = {
  Variables: {
    auth?: SessionClaims;
  };
};

export function getSessionCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "None" : "Lax") as "None" | "Lax",
    path: "/",
    maxAge: SESSION_DURATION,
  };
}

function isValidPayload(payload: unknown): payload is JWTPayload & { sub: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as JWTPayload).sub === "string" &&
    ((payload as JWTPayload).sub as string).length > 0 &&
    ((payload as JWTPayload).iat === undefined ||
      (typeof (payload as JWTPayload).iat === "number" &&
        Number.isSafeInteger((payload as JWTPayload).iat) &&
        ((payload as JWTPayload).iat as number) >= 0)) &&
    ((payload as JWTPayload).exp === undefined ||
      (typeof (payload as JWTPayload).exp === "number" &&
        Number.isSafeInteger((payload as JWTPayload).exp)))
  );
}

export async function signSessionToken(
  identity: SessionIdentity,
  jwtSecret: string
): Promise<{ token: string; claims: SessionClaims }> {
  const now = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = {
    sub: identity.sub,
    username: identity.username,
    role_title: identity.role_title,
    role_id: identity.role_id,
    iat: now,
    exp: now + SESSION_DURATION,
  };
  const token = await sign(claims, jwtSecret, SESSION_ALGORITHM);
  return { token, claims };
}

export async function verifySessionToken(
  token: string | undefined,
  jwtSecret: string,
  options: { allowGrace?: boolean } = {}
): Promise<SessionClaims | null> {
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);

  // 1. First attempt: standard strict HS256 signature + expiration check
  try {
    const payload = (await verify(token, jwtSecret, SESSION_ALGORITHM)) as unknown as JWTPayload;
    if (isValidPayload(payload)) return payload as unknown as SessionClaims;
  } catch {
    // If not standard valid, check if grace period is enabled
    if (options.allowGrace) {
      try {
        const payload = (await verify(token, jwtSecret, {
          alg: SESSION_ALGORITHM,
          exp: false,
        })) as unknown as JWTPayload;
        if (
          isValidPayload(payload) &&
          typeof payload.exp === "number" &&
          payload.exp <= now &&
          now - payload.exp <= MAX_REFRESH_GRACE_PERIOD
        ) {
          return payload as unknown as SessionClaims;
        }
      } catch {}
    }
  }
  return null;
}

export async function verifyAndRefreshSession(
  c: Context,
  token: string | undefined,
  jwtSecret: string,
  db: Database = defaultDb
): Promise<SessionClaims | null> {
  const claims = await verifySessionToken(token, jwtSecret, { allowGrace: true });
  if (!claims) return null;

  let user: {
    id: string;
    username: string | null;
    email: string;
    timezone?: string | null;
    role_title: string;
    role_id: string;
  } | null = null;

  try {
    user = db
      .query<
        { id: string; username: string | null; email: string; timezone?: string | null; role_title: string; role_id: string },
        [string]
      >(
        `SELECT u.id, u.username, u.email, u.timezone, r.title role_title, u.role_id
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`
      )
      .get(claims.sub);
  } catch {
    try {
      user = db
        .query<
          { id: string; username: string | null; email: string; role_title: string; role_id: string },
          [string]
        >(
          `SELECT u.id, u.username, u.email, r.title role_title, u.role_id
           FROM users u JOIN roles r ON r.id = u.role_id
           WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`
        )
        .get(claims.sub);
    } catch {
      return null;
    }
  }

  if (!user) return null;

  // Sync client timezone if changed
  let reqTz = "";
  try {
    reqTz = getTimezone(c, "");
  } catch {}
  if (reqTz && user.timezone !== undefined && reqTz !== user.timezone) {
    try {
      db.run(
        "UPDATE users SET timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (timezone IS NULL OR timezone != ?)",
        [reqTz, user.id, reqTz]
      );
      user.timezone = reqTz;
    } catch {}
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = typeof claims.exp === "number" ? claims.exp <= now : false;
  const isStale = isExpired || typeof claims.exp !== "number" || claims.exp - now < REFRESH_THRESHOLD;
  const isDataUpdated =
    claims.role_id !== user.role_id ||
    claims.role_title !== user.role_title ||
    claims.username !== (user.username ?? user.email);

  if (isStale || isDataUpdated) {
    const refreshed = await signSessionToken(
      {
        sub: user.id,
        username: user.username ?? user.email,
        role_title: user.role_title,
        role_id: user.role_id,
      },
      jwtSecret
    );
    setCookie(c, SESSION_COOKIE, refreshed.token, getSessionCookieOptions());
    return refreshed.claims;
  }

  return claims;
}
