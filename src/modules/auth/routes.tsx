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
import { getLocale, t } from "../../lib/i18n/context";
import { normalizeRegistration } from "./service";
import { getAllTags, setUserPreferredTags } from "../events/queries";
import { mailService } from "../mailer/service";
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
  const secret = (process.env.ALTCHA_HMAC_SECRET ?? "altcha-dev-secret-minimum-32-chars!").padEnd(32, "x");
  const hmacKey = await deriveHmacKeySecret(secret);
  return {
    middleware: create({
      hmacKey,
      fetchParams: async () => ({
        challenge: await deriveKey("challenge", secret),
        maxNumber: 50_000,
        salt: String(randomInt(100_000, 999_999)),
      }),
    }),
    challengeHandler: async (c) =>
      c.json({
        algorithm: "SHA-256",
        challenge: await deriveKey("challenge", secret),
        maxnumber: 50_000,
        salt: String(randomInt(100_000, 999_999)),
        signature: "sample-sig",
      }),
  };
}

export function createAuthRoutes(database: Database, captcha: Captcha, jwtSecret: string) {
  return new Hono()
    .get("/altcha-challenge", captcha.challengeHandler)
    .get("/", async (c) => {
      const locale = getLocale(c);
      return c.html(
        <Document title="Sign in | CobraDecision" locale={locale}>
          <Login locale={locale} />
        </Document>
      );
    })
    .get("/register", async (c) => {
      const locale = getLocale(c);
      const tags = getAllTags(database);
      return c.html(
        <Document title="Register | CobraDecision" locale={locale}>
          <Register tags={tags} locale={locale} />
        </Document>
      );
    })
    .post("/login", captcha.middleware, async (c) => {
      const body = await c.req.parseBody();
      const identifier = String(body.identifier ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const user = database
        .query<{ id: string; username: string | null; email: string; password_hash: string; role_title: string; role_id: string }, [string, string, string]>(
          `SELECT u.id, u.username, u.email, u.password_hash, r.title role_title, u.role_id
           FROM users u JOIN roles r ON r.id = u.role_id
           WHERE (LOWER(u.email) = ? OR LOWER(u.username) = ? OR u.phone = ?)
             AND u.deleted_at IS NULL AND r.deleted_at IS NULL`
        )
        .get(identifier, identifier, identifier);
      if (!user || !(await Bun.password.verify(password, user.password_hash))) {
        return c.html(<FormMessage message="Invalid email/username or password." />, 401);
      }
      const now = Math.floor(Date.now() / 1000);
      const token = await sign(
        { sub: user.id, username: user.username ?? user.email, role_title: user.role_title, role_id: user.role_id, iat: now, exp: now + sessionDuration },
        jwtSecret,
        "HS256"
      );
      setCookie(c, "session", token, cookieOptions);
      c.header("HX-Redirect", `/dashboard/${user.role_title === "Super Admin" ? "admin" : "user"}`);
      return c.body(null);
    })
    .post("/register", captcha.middleware, async (c) => {
      const locale = getLocale(c);
      const body = await c.req.parseBody({ all: true });
      const input = normalizeRegistration(body);
      if (!input) {
        let tagIds: string[] = [];
        if (Array.isArray(body.tagIds)) tagIds = body.tagIds.map(String);
        else if (typeof body.tagIds === "string" && body.tagIds.trim()) tagIds = [body.tagIds.trim()];
        if (tagIds.length < 3) {
          return c.html(<FormMessage message={t("auth.tags_min_required_error", locale)} />, 400);
        }
        return c.html(<FormMessage message="A valid email and matching passwords are required." />, 400);
      }

      // Check if email or username or phone already exists
      const existing = database
        .query<{ id: string }, [string, string, string]>(
          "SELECT id FROM users WHERE (LOWER(email) = ? OR (username IS NOT NULL AND LOWER(username) = ?) OR (phone IS NOT NULL AND phone = ?)) AND deleted_at IS NULL"
        )
        .get(input.email.toLowerCase(), input.username?.toLowerCase() ?? "", input.phone ?? "");
      if (existing) {
        return c.html(<FormMessage message="That email, username, or phone is already in use." />, 409);
      }

      // Generate 6 digit numeric OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store pending registration in database
      database.run(
        "INSERT OR REPLACE INTO registration_otps (email, otp_code, payload, expires_at) VALUES (?, ?, ?, ?)",
        [input.email.toLowerCase(), otpCode, JSON.stringify(input), expiresAt]
      );

      // Send OTP Email
      await mailService.sendOtpEmail(input.email, otpCode);

      // Return OTP verification UI component via HTMX swap
      return c.html(
        <div class="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4 text-start animate-fade-in">
          <div class="space-y-1">
            <h3 class="font-bold text-lg text-base-content">{t("auth.otp_code", locale)}</h3>
            <p class="text-xs text-base-content/70">{t("auth.otp_sent_msg", locale)}</p>
          </div>
          <form class="space-y-3" hx-post="/auth/verify-otp" hx-target="#auth-result" hx-swap="innerHTML">
            <input type="hidden" name="email" value={input.email} />
            <div class="form-control">
              <input
                type="text"
                name="otp"
                required
                maxlength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                autocomplete="one-time-code"
                class="input input-bordered input-primary w-full text-center text-2xl font-mono tracking-widest"
                autofocus
              />
            </div>
            <div id="otp-error"></div>
            <button class="btn btn-primary w-full" type="submit">
              <span class="htmx-indicator loading loading-spinner loading-sm"></span>
              {t("auth.verify_btn", locale)}
            </button>
          </form>
        </div>
      );
    })
    .post("/verify-otp", async (c) => {
      const locale = getLocale(c);
      const body = await c.req.parseBody();
      const email = String(body.email ?? "").trim().toLowerCase();
      const otp = String(body.otp ?? "").trim();

      const record = database
        .query<{ email: string; otp_code: string; payload: string; expires_at: number }, [string]>(
          "SELECT email, otp_code, payload, expires_at FROM registration_otps WHERE email = ?"
        )
        .get(email);

      if (!record || record.otp_code !== otp || Date.now() > record.expires_at) {
        return c.html(<FormMessage message={t("auth.invalid_otp", locale)} />, 400);
      }

      const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get();
      if (!role) return c.html(<FormMessage message="Registration is unavailable." />, 500);

      try {
        const input = JSON.parse(record.payload);
        const userId = generateId();

        database.transaction(() => {
          database.run(
            `INSERT INTO users (id, username, email, phone, password_hash, first_name, last_name, role_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, input.username, input.email, input.phone, Bun.password.hashSync(input.password), input.firstName, input.lastName, role.id]
          );
          setUserPreferredTags(database, userId, input.tagIds);
          database.run("DELETE FROM registration_otps WHERE email = ?", [email]);
        })();

        refreshLandingCache(database);
        mailService.sendWelcomeEmail({
          email: input.email,
          firstName: input.firstName,
          username: input.username,
        }).catch((err) => console.error("[Auth] Welcome email failed:", err));

        c.header("HX-Redirect", "/auth");
        return c.body(null);
      } catch (err) {
        return c.html(<FormMessage message="Registration could not be completed." />, 409);
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

  app.use("*", async (c, next) => {
    const session = await loadUser(c);
    if (!session) return c.redirect("/auth");
    if (expectedRole === "admin" && session.claims.role_title !== "Super Admin" && session.claims.role_title !== "admin") {
      return c.redirect("/dashboard/user");
    }
    c.set("sessionUser", session);
    return next();
  });

  app.get("/", async (c) => {
    const session = c.get("sessionUser");
    return c.html(
      <Document title="Dashboard | CobraDecision">
        <Dashboard user={session.user} />
      </Document>
    );
  });

  return app;
}

export function createProfileRoute(database: Database, jwtSecret: string) {
  const app = new Hono();
  app.get("/", async (c) => {
    const token = getCookie(c, "session");
    if (!token) return c.redirect("/auth");
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
      const user = database.query<Profile, [string]>(`SELECT u.id, u.email, u.username, u.phone, u.first_name, u.last_name, r.title role_title
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`).get(claims.sub);
      if (!user) return c.redirect("/auth");
      return c.html(
        <Document title="Your Profile | CobraDecision">
          <ProfileForm user={user} />
        </Document>
      );
    } catch {
      return c.redirect("/auth");
    }
  });
  return app;
}
