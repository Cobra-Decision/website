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
