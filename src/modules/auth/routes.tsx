import type { Database } from "bun:sqlite";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { create, deriveHmacKeySecret, randomInt } from "altcha-lib/frameworks/hono";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { Document } from "../../ui/layout";
import { normalizeRegistration } from "./service";
import { Dashboard, Login, Register, type Profile } from "./views";

type Captcha = { middleware: MiddlewareHandler; challengeHandler: Handler };
type Claims = { sub: string; username: string; role_title: string; role_id: number };

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
  return new Hono()
    .get("/", (c) => c.html(<Document title="Sign in"><Login /></Document>))
    .get("/register", (c) => c.html(<Document title="Register"><Register /></Document>))
    .get("/altcha/challenge", captcha.challengeHandler)
    .post("/login", captcha.middleware, async (c) => {
      const form = await c.req.parseBody();
      const identifier = String(form.identifier ?? "").trim();
      const user = database.query<{
        id: number; email: string; username: string | null; password_hash: string; role_id: number; role_title: string;
      }, [string, string, string]>(`SELECT u.id, u.email, u.username, u.password_hash, u.role_id, r.title role_title
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE (u.email = ? OR u.phone = ? OR u.username = ?)
          AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).get(identifier, identifier, identifier);
      if (!user || !(await Bun.password.verify(String(form.password ?? ""), user.password_hash))) {
        return c.html(<p class="alert alert-error">Invalid credentials.</p>, 401);
      }
      const token = await sign({ sub: String(user.id), username: user.username ?? user.email, role_title: user.role_title, role_id: user.role_id }, jwtSecret, "HS256");
      setCookie(c, "session", token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
      c.header("HX-Redirect", "/dashboard");
      return c.body(null);
    })
    .post("/register", captcha.middleware, async (c) => {
      const input = normalizeRegistration(await c.req.parseBody());
      if (!input) return c.html(<p class="alert alert-error">A valid email and password are required.</p>, 400);
      const role = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get();
      if (!role) return c.html(<p class="alert alert-error">Registration is unavailable.</p>, 500);
      try {
        database.run(`INSERT INTO users (username, email, phone, password_hash, first_name, last_name, role_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.username, input.email, input.phone, await Bun.password.hash(input.password), input.firstName, input.lastName, role.id]);
        c.header("HX-Redirect", "/auth");
        return c.body(null);
      } catch {
        return c.html(<p class="alert alert-error">That email, username, or phone is already in use.</p>, 409);
      }
    })
    .post("/logout", (c) => {
      deleteCookie(c, "session", { path: "/", secure: true });
      c.header("HX-Redirect", "/auth");
      return c.body(null);
    });
}

export function createDashboardRoute(database: Database, jwtSecret: string) {
  return new Hono().get("/", async (c) => {
    const token = getCookie(c, "session");
    if (!token) return c.redirect("/auth");
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
      const user = database.query<Profile, [number]>(`SELECT u.email, u.username, u.phone, u.first_name, u.last_name, r.title role_title
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).get(Number(claims.sub));
      if (!user) return c.redirect("/auth");
      return c.html(<Document title="Dashboard"><Dashboard user={user} /></Document>);
    } catch {
      return c.redirect("/auth");
    }
  });
}
