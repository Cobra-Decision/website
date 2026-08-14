import type { Database } from "bun:sqlite";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { create, deriveHmacKeySecret, randomInt } from "altcha-lib/frameworks/hono";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { Document } from "../../ui/layout";
import { FormMessage } from "../../ui/form-message";
import { refreshLandingCache } from "../../lib/cache";
import { generateId } from "../../lib/id";
import { normalizeRegistration } from "./service";
import { Dashboard, Login, ProfileForm, Register, type Profile } from "./views";

type Captcha = { middleware: MiddlewareHandler; challengeHandler: Handler };
type Claims = { sub: string; username: string; role_title: string; role_id: string };
const sessionDuration = 60 * 60 * 8;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax" as const,
  path: "/",
  maxAge: sessionDuration,
};

export async function createAltcha(): Promise<Captcha> {
  const secret = process.env.ALTCHA_HMAC_SECRET ?? "development-secret";
  const altcha = create({
    hmacSignatureSecret: secret,
    hmacKeySignatureSecret: await deriveHmacKeySecret(secret),
    deriveKey,
    createChallengeParameters: () => ({ algorithm: "PBKDF2/SHA-256", cost: 5000, counter: randomInt(5000, 10000), expiresAt: new Date(Date.now() + 600_000) }),
  });
  return { middleware: altcha.middleware(), challengeHandler: altcha.challengeHandler };
}

export function createAuthRoutes(database: Database, captcha: Captcha, jwtSecret: string) {
  const hasActiveSession = async (token: string | undefined) => {
    if (!token) return false;
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
      return Boolean(database.query("SELECT 1 FROM users WHERE id = ? AND deleted_at IS NULL").get(claims.sub));
    } catch {
      return false;
    }
  };
  const redirectAuthenticated = async (c: Parameters<Handler>[0]) => {
    if (await hasActiveSession(getCookie(c, "session"))) {
      const claims = (await verify(getCookie(c, "session")!, jwtSecret, "HS256")) as unknown as Claims;
      return c.redirect(`/dashboard/${claims.role_title === "Super Admin" ? "admin" : "user"}`);
    }
    return null;
  };
  return new Hono()
    .get("/", async (c) => (await redirectAuthenticated(c)) ?? c.html(<Document title="Sign in"><Login /></Document>))
    .get("/register", async (c) => (await redirectAuthenticated(c)) ?? c.html(<Document title="Register"><Register /></Document>))
    .get("/altcha/challenge", captcha.challengeHandler)
    .post("/login", captcha.middleware, async (c) => {
      const form = await c.req.parseBody();
      const identifier = String(form.identifier ?? "").trim();
      const user = database.query<{
        id: string; email: string; username: string | null; password_hash: string; role_id: string; role_title: string;
      }, [string, string, string]>(`SELECT u.id, u.email, u.username, u.password_hash, u.role_id, r.title role_title
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE (u.email = ? OR u.phone = ? OR u.username = ?)
          AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).get(identifier, identifier, identifier);
      if (!user || !(await Bun.password.verify(String(form.password ?? ""), user.password_hash))) {
        return c.html(<FormMessage message="Invalid credentials." />, 401);
      }
      const now = Math.floor(Date.now() / 1000);
      const token = await sign({ sub: user.id, username: user.username ?? user.email, role_title: user.role_title, role_id: user.role_id, iat: now, exp: now + sessionDuration }, jwtSecret, "HS256");
      setCookie(c, "session", token, cookieOptions);
      c.header("HX-Redirect", `/dashboard/${user.role_title === "Super Admin" ? "admin" : "user"}`);
      return c.body(null);
    })
    .post("/register", captcha.middleware, async (c) => {
      const input = normalizeRegistration(await c.req.parseBody());
      if (!input) return c.html(<FormMessage message="A valid email and matching passwords are required." />, 400);
      const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get();
      if (!role) return c.html(<FormMessage message="Registration is unavailable." />, 500);
      try {
        database.run(`INSERT INTO users (id, username, email, phone, password_hash, first_name, last_name, role_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [generateId(), input.username, input.email, input.phone, await Bun.password.hash(input.password), input.firstName, input.lastName, role.id]);
        refreshLandingCache(database);
        c.header("HX-Redirect", "/auth");
        return c.body(null);
      } catch {
        return c.html(<FormMessage message="That email, username, or phone is already in use." />, 409);
      }
    })
    .post("/logout", (c) => {
      deleteCookie(c, "session", cookieOptions);
      c.header("HX-Redirect", "/auth");
      return c.body(null);
    });
}

export function createDashboardRoute(database: Database, jwtSecret: string, expectedRole: "admin" | "member" = "member") {
  const app = new Hono();
  const loadUser = async (c: Parameters<Handler>[0]) => {
    const token = getCookie(c, "session");
    if (!token) return null;
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
      const user = database.query<Profile, [string]>(`SELECT u.id, u.email, u.username, u.phone, u.first_name, u.last_name, r.title role_title
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).get(claims.sub);
      return user ? { claims, user } : null;
    } catch {
      return null;
    }
  };
  app.get("/", async (c) => { const loaded = await loadUser(c); if (!loaded) return c.redirect("/auth"); if ((expectedRole === "admin") !== (loaded.user.role_title === "Super Admin")) return c.redirect(`/dashboard/${loaded.user.role_title === "Super Admin" ? "admin" : "user"}`); return c.html(<Document title="Dashboard"><Dashboard user={loaded.user} /></Document>); });
  app.get("/profile", async (c) => { const loaded = await loadUser(c); if (!loaded) return c.redirect("/auth"); return c.html(<Document title="Profile"><div class="container mx-auto max-w-2xl p-6"><h1 class="text-3xl font-bold">Your profile</h1><form class="mt-6 grid gap-4" hx-post="/dashboard/member/profile" hx-target="#profile-result"><input class="input input-bordered" name="first_name" value={loaded.user.first_name ?? ""} placeholder="First name"/><input class="input input-bordered" name="last_name" value={loaded.user.last_name ?? ""} placeholder="Last name"/><input class="input input-bordered" name="phone" value={loaded.user.phone ?? ""} placeholder="Phone"/><input class="input input-bordered" name="password" type="password" placeholder="New password"/><input class="input input-bordered" name="password_confirmation" type="password" placeholder="Confirm new password"/><button class="btn btn-primary">Save profile</button><div id="profile-result"></div></form></div></Document>); });
  app.post("/profile", async (c) => { const loaded = await loadUser(c); if (!loaded) return c.redirect("/auth"); const body = await c.req.parseBody(); const password = String(body.password ?? ""); if (password && password !== String(body.password_confirmation ?? "")) return c.html(<FormMessage message="Passwords do not match." />, 400); try { database.run("UPDATE users SET first_name=?,last_name=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [String(body.first_name ?? "").trim() || null, String(body.last_name ?? "").trim() || null, String(body.phone ?? "").trim() || null, loaded.claims.sub]); if (password) database.run("UPDATE users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [await Bun.password.hash(password), loaded.claims.sub]); refreshLandingCache(database); return c.html(<FormMessage type="success" message="Profile updated." />); } catch { return c.html(<FormMessage message="That phone number is already in use." />, 409); } });
  return app;
}

export function createProfileRoute(database: Database, jwtSecret: string) {
  const userFor = async (c: Parameters<Handler>[0]) => {
    const token = getCookie(c, "session"); if (!token) return null;
    try { const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims; return { claims, user: database.query<Profile, [string]>(`SELECT u.id, u.email,u.username,u.phone,u.first_name,u.last_name,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.deleted_at IS NULL`).get(claims.sub) }; } catch { return null; }
  };
  return new Hono().get("/", async (c) => { const current = await userFor(c); return current?.user ? c.html(<Document title="Profile"><ProfileForm user={current.user} /></Document>) : c.redirect("/auth"); }).post("/", async (c) => { const current = await userFor(c); if (!current?.user) return c.redirect("/auth"); const form = await c.req.parseBody(); const password = String(form.password ?? ""); if (password !== String(form.password_confirmation ?? "")) return c.html(<FormMessage message="Passwords do not match." />, 400); const values = ["username", "phone", "first_name", "last_name"].map((field) => String(form[field] ?? "").trim() || null); try { database.run(`UPDATE users SET username=?,phone=?,first_name=?,last_name=?${password ? ",password_hash=?" : ""},updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, ...(password ? [await Bun.password.hash(password)] : []), current.claims.sub]); refreshLandingCache(database); return c.html(<FormMessage type="success" message="Profile updated." />); } catch { return c.html(<FormMessage message="That username or phone number is already in use." />, 409); } });
}
