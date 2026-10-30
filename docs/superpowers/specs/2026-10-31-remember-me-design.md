# Technical Design: Automatic "Remember Me" via Sliding Persistent JWT Session

- **Date:** 2026-10-31
- **Status:** Approved
- **Target Modules:** `src/modules/auth/` (`session.ts`, `middleware.tsx`, `routes.tsx`)

---

## 1. Context & Problem Statement

Users are frequently required to log back in because sessions expire after 8 hours. The goal is automatic "remember me" so active users rarely or never see the login page, while inactive users remain logged in for up to 30 days of inactivity.

### Root Cause Analysis of Previous Attempt
A prior attempt implemented a 7-day grace period in `src/modules/auth/middleware.tsx` (`MAX_REFRESH_GRACE_PERIOD = 7 days`) using JWT verification with `{ exp: false }`. However:
1. The browser cookie `maxAge` was hardcoded to `SESSION_DURATION = 60 * 60 * 8` (8 hours) in both `middleware.tsx` and `routes.tsx`.
2. After 8 hours of browser inactivity or closure, browsers automatically deleted the `session` cookie.
3. Upon returning, the client never transmitted the cookie header. `getCookie(c, "session")` was `undefined`, causing `verifyAndRefreshSession` to abort immediately before any grace or renewal logic could run.
4. Duplicate session settings existed in multiple files, causing divergence and maintenance friction.

---

## 2. Architectural Decision & Approach

We adopt a **Sliding Persistent JWT Cookie** architecture.

### Key Principles
1. **Single Source of Truth (`src/modules/auth/session.ts`)**:
   - Centralize session cookie name, durations, cookie configuration, JWT signing, token verification, and refresh routines.
2. **30-Day Sliding Window**:
   - Both cookie `maxAge` and JWT `exp` are set to 30 days (`2,592,000` seconds).
   - If a request occurs when the token's remaining lifespan is less than 15 days (`REFRESH_THRESHOLD = 1,296,000` seconds), the server transparently mints a new 30-day JWT and writes an updated `session` cookie.
   - Active users continuously slide their session forward and never see the login page.
3. **Database Guard on Every Request**:
   - The server validates the user's active state against SQLite (`SELECT ... FROM users u JOIN roles r WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).
   - If an account or role is soft-deleted or removed, the session is invalidated immediately, mitigating the stateless nature of JWTs.
4. **Clean Code & KISS**:
   - Zero additional database tables or background cleanup jobs.
   - Eliminates dead/insecure code (e.g., fallback queries that bypassed `deleted_at`).

---

## 3. Specifications

### 3.1 Constants & Types (`src/modules/auth/session.ts`)
```ts
export const SESSION_COOKIE = "session";
export const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days in seconds (2,592,000s)
export const REFRESH_THRESHOLD = 60 * 60 * 24 * 15; // 15 days in seconds (1,296,000s)

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
```

### 3.2 Cookie Options
```ts
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
```

### 3.3 Token Lifecycle Operations
- `signSessionToken(identity: SessionIdentity, jwtSecret: string)`:
  - Generates `iat = Math.floor(Date.now() / 1000)` and `exp = iat + SESSION_DURATION`.
  - Signs payload using `HS256`.
  - Returns `{ token, claims }`.
- `verifySessionToken(token: string | undefined, jwtSecret: string)`:
  - Verifies signature, algorithm (`HS256`), and expiration (`now < exp`).
  - Returns validated `SessionClaims` or `null`.
- `verifyAndRefreshSession(c: Context, token: string | undefined, jwtSecret: string, db: Database)`:
  - Verifies token via `verifySessionToken`.
  - Queries database for active user:
    ```sql
    SELECT u.id, u.username, u.email, u.timezone, r.title role_title, u.role_id
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL
    ```
  - Rejects if user or role is soft-deleted.
  - Updates user timezone if changed.
  - Checks if refresh needed:
    ```ts
    const now = Math.floor(Date.now() / 1000);
    const isStale = (claims.exp - now) < REFRESH_THRESHOLD;
    const isDataUpdated = claims.role_id !== user.role_id ||
                          claims.role_title !== user.role_title ||
                          claims.username !== (user.username ?? user.email);
    ```
  - If refresh is triggered: generates fresh token via `signSessionToken`, writes cookie via `setCookie(c, SESSION_COOKIE, newToken, getSessionCookieOptions())`, and returns updated claims.
  - Otherwise returns existing claims.

### 3.4 Integration Points
- **`src/modules/auth/middleware.tsx`**:
  - Re-exports session types and helpers from `session.ts` for backwards compatibility.
  - `authGuard`: retrieves `session` cookie, runs `verifyAndRefreshSession`, redirects to `/auth` if null, sets `c.set("auth", claims)` on success.
  - `requirePermission`: checks role permissions against endpoint patterns for authenticated claims.
- **`src/modules/auth/routes.tsx`**:
  - `/login`: Uses `signSessionToken` and sets cookie with `getSessionCookieOptions()`.
  - `/logout`: Deletes cookie via `deleteCookie(c, SESSION_COOKIE, getSessionCookieOptions())`.
  - Removes duplicate `sessionDuration` and `cookieOptions`.

---

## 4. Error Handling & Security

1. **Tampering / Invalid Secret:** Verification throws or fails structure validation -> returns `null` -> user redirected to `/auth`.
2. **Expired Session:** Tokens older than 30 days are rejected -> returns `null`.
3. **Revocation / Soft Deletion:** SQLite check validates `u.deleted_at IS NULL AND r.deleted_at IS NULL` on every authenticated request.
4. **Cookie Security:** `HttpOnly`, `Path=/`, `SameSite: Lax` (`Secure` in production) to mitigate XSS and CSRF exposure.

---

## 5. Testing Plan

1. **Unit Tests (`src/modules/auth/session.test.ts`)**:
   - Assert token creation produces correct `iat` and `exp` (+30 days).
   - Assert `verifySessionToken` verifies valid token and rejects invalid/tampered tokens.
   - Assert expired token (> 30 days) returns `null`.
   - Assert `verifyAndRefreshSession` refreshes token and updates cookie when remaining time < 15 days.
   - Assert soft-deleted user in DB fails authentication.
2. **Regression & Health Checks**:
   - `bun test` across existing auth and admin test suites.
   - `bun run check` (TypeScript typecheck).
