# Sliding Persistent JWT Remember-Me Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable automatic 30-day sliding remember-me authentication using HttpOnly JWT cookies across all auth entry points (Login, OTP verification, Telegram auto-login) so active users rarely see the login page, while supporting 7-day grace revival and instant DB-driven user revocation.

**Architecture:** Consolidate session constants, cookie options, token signing, verification, and sliding refresh into a single source of truth module (`src/modules/auth/session.ts`). Tokens and cookies are set to 30 days (`2,592,000s`). When a token has less than 15 days remaining (or is expired within a 7-day grace window), it is re-signed and the cookie is re-issued for 30 days. On every authenticated request, user existence and deletion status are validated in SQLite (`deleted_at IS NULL`).

**Tech Stack:** Bun, Hono (`hono/jwt`, `hono/cookie`), SQLite (`bun:sqlite`), TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-31-remember-me-design.md`

## Global Constraints
- Token expiration: 30 days (`SESSION_DURATION = 60 * 60 * 24 * 30 = 2592000`).
- Sliding threshold: 15 days (`REFRESH_THRESHOLD = 60 * 60 * 24 * 15 = 1296000`).
- Max refresh grace period: 7 days (`MAX_REFRESH_GRACE_PERIOD = 60 * 60 * 24 * 7 = 604800`).
- Cookie options: `httpOnly: true`, `path: "/"`, `sameSite: isProd ? "None" : "Lax"`, `secure: isProd`, `maxAge: SESSION_DURATION`.
- Cookie name: `session` (`SESSION_COOKIE = "session"`).
- Database checks must enforce `u.deleted_at IS NULL AND r.deleted_at IS NULL`.
- All tests must run with `bun test`. Typecheck must pass with `bun run check`.

---

### Task 1: Create Session Module and Unit Tests

**Files:**
- Create: `src/modules/auth/session.ts`
- Create: `src/modules/auth/session.test.ts`

**Interfaces:**
- Produces:
  - `SESSION_COOKIE: string`
  - `SESSION_DURATION: number`
  - `REFRESH_THRESHOLD: number`
  - `MAX_REFRESH_GRACE_PERIOD: number`
  - `type SessionIdentity = { sub: string; username: string; role_title: string; role_id: string }`
  - `type SessionClaims = SessionIdentity & { iat: number; exp: number }`
  - `type AuthEnv = { Variables: { auth?: SessionClaims } }`
  - `getSessionCookieOptions(): CookieOptions`
  - `signSessionToken(identity: SessionIdentity, jwtSecret: string): Promise<{ token: string; claims: SessionClaims }>`
  - `verifySessionToken(token: string | undefined, jwtSecret: string, options?: { allowGrace?: boolean }): Promise<SessionClaims | null>`
  - `verifyAndRefreshSession(c: Context, token: string | undefined, jwtSecret: string, db: Database): Promise<SessionClaims | null>`

- [ ] **Step 1: Write unit tests in `src/modules/auth/session.test.ts` using real Hono app testing**

```ts
import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import {
  SESSION_COOKIE,
  SESSION_DURATION,
  REFRESH_THRESHOLD,
  MAX_REFRESH_GRACE_PERIOD,
  getSessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  verifyAndRefreshSession,
} from "./session";

const TEST_SECRET = "test-jwt-secret-key-for-session-tests";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = ON;");
  db.run(`
    CREATE TABLE roles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    );
  `);
  db.run("INSERT INTO roles (id, title) VALUES ('role-member', 'member')");
  db.run(
    "INSERT INTO users (id, username, email, password_hash, role_id) VALUES ('user-1', 'alice', 'alice@example.com', 'hash', 'role-member')"
  );
  return db;
}

describe("Session Module", () => {
  it("exports correct session constants and cookie options", () => {
    expect(SESSION_COOKIE).toBe("session");
    expect(SESSION_DURATION).toBe(60 * 60 * 24 * 30);
    expect(REFRESH_THRESHOLD).toBe(60 * 60 * 24 * 15);
    expect(MAX_REFRESH_GRACE_PERIOD).toBe(60 * 60 * 24 * 7);
    const opts = getSessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(SESSION_DURATION);
  });

  it("signs and verifies valid session token", async () => {
    const identity = {
      sub: "user-1",
      username: "alice",
      role_title: "member",
      role_id: "role-member",
    };
    const { token, claims } = await signSessionToken(identity, TEST_SECRET);
    expect(token).toBeString();
    expect(claims.sub).toBe("user-1");
    expect(claims.exp - claims.iat).toBe(SESSION_DURATION);

    const verified = await verifySessionToken(token, TEST_SECRET);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("user-1");
    expect(verified?.role_title).toBe("member");
  });

  it("rejects token with wrong secret or malformed format", async () => {
    const identity = {
      sub: "user-1",
      username: "alice",
      role_title: "member",
      role_id: "role-member",
    };
    const { token } = await signSessionToken(identity, TEST_SECRET);
    expect(await verifySessionToken(token, "wrong-secret")).toBeNull();
    expect(await verifySessionToken("malformed.token.value", TEST_SECRET)).toBeNull();
    expect(await verifySessionToken(undefined, TEST_SECRET)).toBeNull();
  });

  it("handles expired tokens according to grace policy", async () => {
    const now = Math.floor(Date.now() / 1000);
    // Expired 1 hour ago (< 7 days grace)
    const recentExpiredToken = await sign(
      {
        sub: "user-1",
        username: "alice",
        role_title: "member",
        role_id: "role-member",
        iat: now - 3600,
        exp: now - 100,
      },
      TEST_SECRET,
      "HS256"
    );
    expect(await verifySessionToken(recentExpiredToken, TEST_SECRET)).toBeNull();
    expect(await verifySessionToken(recentExpiredToken, TEST_SECRET, { allowGrace: true })).not.toBeNull();

    // Expired 10 days ago (> 7 days grace)
    const oldExpiredToken = await sign(
      {
        sub: "user-1",
        username: "alice",
        role_title: "member",
        role_id: "role-member",
        iat: now - 20 * 86400,
        exp: now - 10 * 86400,
      },
      TEST_SECRET,
      "HS256"
    );
    expect(await verifySessionToken(oldExpiredToken, TEST_SECRET, { allowGrace: true })).toBeNull();
  });

  it("verifies and refreshes session in Hono request flow", async () => {
    const db = createTestDb();
    const now = Math.floor(Date.now() / 1000);
    // Token with 10 days remaining (< 15 days threshold)
    const token = await sign(
      {
        sub: "user-1",
        username: "alice",
        role_title: "member",
        role_id: "role-member",
        iat: now - 20 * 86400,
        exp: now + 10 * 86400,
      },
      TEST_SECRET,
      "HS256"
    );

    const app = new Hono();
    app.get("/test", async (c) => {
      const claims = await verifyAndRefreshSession(c, getCookie(c, SESSION_COOKIE), TEST_SECRET, db);
      return c.json({ claims });
    });

    const res = await app.request("/test", {
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { claims: any };
    expect(body.claims).not.toBeNull();
    expect(body.claims.exp).toBeGreaterThan(now + 29 * 86400);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain(`Max-Age=${SESSION_DURATION}`);
  });

  it("rejects authentication when user is soft-deleted", async () => {
    const db = createTestDb();
    db.run("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'user-1'");

    const identity = {
      sub: "user-1",
      username: "alice",
      role_title: "member",
      role_id: "role-member",
    };
    const { token } = await signSessionToken(identity, TEST_SECRET);

    const app = new Hono();
    app.get("/test", async (c) => {
      const claims = await verifyAndRefreshSession(c, getCookie(c, SESSION_COOKIE), TEST_SECRET, db);
      return c.json({ claims });
    });

    const res = await app.request("/test", {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    const body = (await res.json()) as { claims: any };
    expect(body.claims).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/modules/auth/session.test.ts`
Expected: FAIL (`Cannot find module './session'`)

- [ ] **Step 3: Implement `src/modules/auth/session.ts`**

```ts
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

function isSessionClaims(payload: JWTPayload): payload is JWTPayload & SessionClaims {
  return (
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    typeof payload.username === "string" &&
    typeof payload.role_title === "string" &&
    typeof payload.role_id === "string" &&
    payload.role_id.length > 0 &&
    typeof payload.iat === "number" &&
    Number.isSafeInteger(payload.iat) &&
    payload.iat >= 0 &&
    typeof payload.exp === "number" &&
    Number.isSafeInteger(payload.exp) &&
    payload.exp > payload.iat
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
    if (isSessionClaims(payload)) return payload;
  } catch {
    // If not standard valid, check if grace period is enabled
    if (options.allowGrace) {
      try {
        const payload = (await verify(token, jwtSecret, {
          alg: SESSION_ALGORITHM,
          exp: false,
        })) as unknown as JWTPayload;
        if (
          isSessionClaims(payload) &&
          payload.exp <= now &&
          now - payload.exp <= MAX_REFRESH_GRACE_PERIOD
        ) {
          return payload;
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
    return null;
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
  const isExpired = claims.exp <= now;
  const isStale = isExpired || claims.exp - now < REFRESH_THRESHOLD;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/modules/auth/session.test.ts`
Expected: PASS (all 6 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/session.ts src/modules/auth/session.test.ts
git commit -m "feat(auth): create unified session module with 30-day sliding token and grace support"
```

---

### Task 2: Refactor `src/modules/auth/middleware.tsx`

**Files:**
- Modify: `src/modules/auth/middleware.tsx`
- Test: `src/modules/auth/permissions.test.ts`

**Interfaces:**
- Consumes from `session.ts`:
  - `SESSION_COOKIE`, `SESSION_DURATION`, `getSessionCookieOptions`, `verifyAndRefreshSession`, `SessionClaims`, `SessionIdentity`
- Produces:
  - Re-exports `SESSION_COOKIE`, `SESSION_DURATION`, `getSessionCookieOptions`, `verifyAndRefreshSession`, `Claims` (type alias to `SessionClaims`)
  - `authGuard(jwtSecret, db)`
  - `requirePermission(jwtSecret, db)`

- [ ] **Step 1: Check existing permissions test passes initially**

Run: `bun test src/modules/auth/permissions.test.ts`
Expected: PASS

- [ ] **Step 2: Refactor `src/modules/auth/middleware.tsx`**

- Import `SESSION_COOKIE`, `SESSION_DURATION`, `getSessionCookieOptions`, `verifyAndRefreshSession`, `SessionClaims` from `./session`.
- Re-export `SESSION_COOKIE`, `SESSION_DURATION`, `getSessionCookieOptions`, `verifyAndRefreshSession`.
- Export `type Claims = SessionClaims`.
- Remove redundant duplicate functions and constants.
- Fix `requirePermission` to construct `createPermissionChecker(db)` with the provided database parameter instead of global singleton:
```ts
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
```

- [ ] **Step 3: Run permissions test and session test**

Run: `bun test src/modules/auth/permissions.test.ts src/modules/auth/session.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/middleware.tsx
git commit -m "refactor(auth): delegate middleware to session module and bind db to permission checker"
```

---

### Task 3: Refactor `src/modules/auth/routes.tsx` and `src/modules/telegram/routes.tsx`

**Files:**
- Modify: `src/modules/auth/routes.tsx`
- Modify: `src/modules/telegram/routes.tsx`
- Test: `bun test src/modules/auth/`

**Interfaces:**
- Consumes from `session.ts`:
  - `SESSION_COOKIE`, `getSessionCookieOptions`, `signSessionToken`, `verifySessionToken`, `verifyAndRefreshSession`, `type SessionClaims`

- [ ] **Step 1: Refactor `src/modules/auth/routes.tsx`**

- Remove local `sessionDuration` and `cookieOptions`.
- Create clean cookie options helper for transient cookies:
```ts
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "None" : "Lax") as "None" | "Lax",
  path: "/",
};
```
- In `/login`:
```ts
const tgLinkId = getCookie(c, "tg_link_id");
const clientTz = getTimezone(c);
if (tgLinkId) {
  database.run("UPDATE users SET telegram_id = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [tgLinkId, clientTz, user.id]);
  deleteCookie(c, "tg_link_id", baseCookieOptions);
} else {
  database.run("UPDATE users SET timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [clientTz, user.id]);
}

const { token } = await signSessionToken(
  {
    sub: user.id,
    username: user.username ?? user.email,
    role_title: user.role_title,
    role_id: user.role_id,
  },
  jwtSecret
);
setCookie(c, SESSION_COOKIE, token, getSessionCookieOptions());
```
- In `/verify-otp`:
```ts
if (tgLinkId) deleteCookie(c, "tg_link_id", baseCookieOptions);
```
- In `/logout`:
```ts
.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  const claims = await verifySessionToken(token, jwtSecret);
  logger.auth("AUTH_LOGOUT", {
    actor: { userId: claims?.sub, email: claims?.username, role: claims?.role_title, ip: c.req.header("x-forwarded-for") ?? "local" },
  });
  deleteCookie(c, SESSION_COOKIE, getSessionCookieOptions());
  c.header("HX-Redirect", "/auth");
  return c.body(null);
});
```

- [ ] **Step 2: Refactor `src/modules/telegram/routes.tsx`**

- In `src/modules/telegram/routes.tsx`, import `SESSION_COOKIE`, `getSessionCookieOptions`, `signSessionToken` from `../auth/session`.
- In `POST /init`:
```ts
if (existingUser) {
  const { token } = await signSessionToken(
    {
      sub: existingUser.id,
      username: existingUser.username ?? existingUser.email,
      role_title: existingUser.role_title,
      role_id: existingUser.role_id,
    },
    jwtSecret
  );
  setCookie(c, SESSION_COOKIE, token, getSessionCookieOptions());
  ...
}
```

- [ ] **Step 3: Run all auth tests**

Run: `bun test src/modules/auth/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/routes.tsx src/modules/telegram/routes.tsx
git commit -m "refactor(auth,telegram): standardize 30-day session issuance across login and telegram flows"
```

---

### Task 4: Integration Regression Tests & Project Typecheck

**Files:**
- Test: `test/auth.integration.test.ts`
- Test: All tests across project (`bun test`)
- Typecheck: `bun run check`

- [ ] **Step 1: Verify `test/auth.integration.test.ts`**

Run: `bun test test/auth.integration.test.ts`
Expected: PASS (confirms expired token grace renewal and timezone update behavior)

- [ ] **Step 2: Run complete project test suite**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 3: Run typecheck**

Run: `bun run check`
Expected: Exit code 0, no type errors.

- [ ] **Step 4: Commit and finalize**

```bash
git status
```
Confirm working tree is clean.
