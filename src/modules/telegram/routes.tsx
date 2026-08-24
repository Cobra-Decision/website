import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { Document } from "../../ui/layout";
import { FormMessage } from "../../ui/form-message";
import { generateId } from "../../lib/id";
import { getAllTags, setUserPreferredTags } from "../events/queries";
import { mailService } from "../mailer/service";
import { logger } from "../../lib/logger";
import { validateTelegramInitData } from "./crypto";
import { TelegramConnectView, TelegramOtpForm } from "./views";

const sessionDuration = 60 * 60 * 8;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax" as const,
  path: "/",
  maxAge: sessionDuration,
};

export function createTelegramRoutes(
  database: Database,
  jwtSecret: string,
  botToken?: string
) {
  const getBotToken = () => botToken || process.env.TELEGRAM_BOT_TOKEN || "development-bot-token";
  const app = new Hono();

  /**
   * Main entry point for Telegram WebApp.
   * Loads Telegram WebApp JS SDK, captures initData, and POSTs to /tg/auth via HTMX/fetch
   */
  app.get("/app", async (c) => {
    return c.html(
      <Document title="CobraDecision | Telegram Mini App">
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <div id="tg-loader" class="min-h-screen flex flex-col items-center justify-center p-4 bg-base-200">
          <div class="card w-full max-w-sm bg-base-100 shadow-xl border border-base-300 p-8 text-center space-y-4">
            <span class="loading loading-ring loading-lg text-primary mx-auto"></span>
            <h2 class="font-bold text-lg">Authenticating with Telegram...</h2>
            <p class="text-xs text-base-content/70">Connecting your secure session.</p>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener("DOMContentLoaded", () => {
                const tg = window.Telegram?.WebApp;
                if (tg) {
                  tg.ready();
                  tg.expand();
                }
                const initData = tg?.initData || "";
                if (!initData) {
                  document.getElementById("tg-loader").innerHTML = '<div class="alert alert-warning max-w-sm mx-auto">Please open this page inside Telegram.</div>';
                  return;
                }
                fetch("/tg/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ initData })
                }).then(async (res) => {
                  if (res.redirected) {
                    window.location.href = res.url;
                  } else if (res.ok) {
                    const html = await res.text();
                    if (html) {
                      document.body.innerHTML = html;
                      if (window.htmx) window.htmx.process(document.body);
                    } else {
                      window.location.href = "/dashboard/user";
                    }
                  } else {
                    const err = await res.text();
                    document.getElementById("tg-loader").innerHTML = '<div class="alert alert-error max-w-sm mx-auto">' + (err || "Authentication failed.") + '</div>';
                  }
                }).catch(() => {
                  document.getElementById("tg-loader").innerHTML = '<div class="alert alert-error max-w-sm mx-auto">Network connection error.</div>';
                });
              });
            `,
          }}
        />
      </Document>
    );
  });

  /**
   * Endpoint validating initData and checking if user is already linked
   */
  app.post("/auth", async (c) => {
    const body = await c.req.json<{ initData?: string }>().catch(() => ({ initData: undefined }));
    const initData = body.initData;

    if (!initData) {
      return c.text("Missing initData", 400);
    }

    const token = getBotToken();
    const validated = await validateTelegramInitData(initData, token);
    if (!validated) {
      logger.auth("TELEGRAM_INIT_DATA_INVALID", {
        level: "WARN",
        actor: { ip: c.req.header("x-forwarded-for") ?? "local", userAgent: c.req.header("user-agent") },
        data: { hasToken: Boolean(token && token !== "development-bot-token") },
      });
      return c.text("Invalid or expired Telegram signature", 401);
    }

    const tgId = String(validated.user.id);
    const existingUser = database
      .query<{ id: string; username: string | null; email: string; role_title: string; role_id: string }, [string]>(
        `SELECT u.id, u.username, u.email, r.title role_title, u.role_id
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.telegram_id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`
      )
      .get(tgId);

    if (existingUser) {
      // User is already linked -> Auto-login with JWT
      const now = Math.floor(Date.now() / 1000);
      const token = await sign(
        {
          sub: existingUser.id,
          username: existingUser.username ?? existingUser.email,
          role_title: existingUser.role_title,
          role_id: existingUser.role_id,
          iat: now,
          exp: now + sessionDuration,
        },
        jwtSecret,
        "HS256"
      );
      setCookie(c, "session", token, cookieOptions);
      logger.auth("TELEGRAM_AUTO_LOGIN_SUCCESS", {
        actor: { userId: existingUser.id, email: existingUser.email, role: existingUser.role_title },
        data: { telegramId: tgId },
      });
      return c.redirect("/dashboard/user");
    }

    // User is NOT linked -> Return connect & onboarding view
    const tags = getAllTags(database);
    const name = [validated.user.first_name, validated.user.last_name].filter(Boolean).join(" ");
    return c.html(
      <TelegramConnectView
        telegramId={tgId}
        telegramUsername={validated.user.username}
        telegramName={name || "Telegram User"}
        tags={tags}
      />
    );
  });

  /**
   * Link existing CobraDecision account with Telegram ID
   */
  app.post("/link-account", async (c) => {
    const body = await c.req.parseBody();
    const identifier = String(body.identifier ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const telegramId = String(body.telegram_id ?? "").trim();

    if (!telegramId) return c.html(<FormMessage message="Missing Telegram ID." />, 400);

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

    // Save telegram_id
    database.run("UPDATE users SET telegram_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [telegramId, user.id]);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: user.id, username: user.username ?? user.email, role_title: user.role_title, role_id: user.role_id, iat: now, exp: now + sessionDuration },
      jwtSecret,
      "HS256"
    );
    setCookie(c, "session", token, cookieOptions);

    logger.auth("TELEGRAM_ACCOUNT_LINKED", {
      actor: { userId: user.id, email: user.email, role: user.role_title },
      data: { telegramId },
    });

    c.header("HX-Redirect", "/dashboard/user");
    return c.body(null);
  });

  /**
   * Send OTP for quick register inside Telegram Mini App
   */
  app.post("/register-otp", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const email = String(body.email ?? "").trim().toLowerCase();
    const telegramId = String(body.telegram_id ?? "").trim();
    const telegramName = String(body.telegram_name ?? "").trim();
    const telegramUsername = String(body.telegram_username ?? "").trim() || null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !telegramId) {
      return c.html(<FormMessage message="Valid email address is required." />, 400);
    }

    // Extract tags
    let tagIds: string[] = [];
    if (Array.isArray(body.tagIds)) tagIds = body.tagIds.map(String);
    else if (typeof body.tagIds === "string" && body.tagIds.trim()) tagIds = [body.tagIds.trim()];

    if (tagIds.length < 3) {
      return c.html(<FormMessage message="Please select at least 3 topics of interest." />, 400);
    }

    // Check if email or telegram_id already taken
    const existing = database
      .query<{ id: string }, [string, string]>(
        "SELECT id FROM users WHERE (LOWER(email) = ? OR telegram_id = ?) AND deleted_at IS NULL"
      )
      .get(email, telegramId);

    if (existing) {
      return c.html(<FormMessage message="This email or Telegram account is already in use." />, 409);
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const payload = {
      email,
      telegramId,
      telegramName,
      telegramUsername,
      tagIds,
    };

    database.run(
      "INSERT OR REPLACE INTO registration_otps (email, otp_code, payload, expires_at) VALUES (?, ?, ?, ?)",
      [email, otpCode, JSON.stringify(payload), expiresAt]
    );

    await mailService.sendOtpEmail(email, otpCode);

    return c.html(<TelegramOtpForm email={email} telegramId={telegramId} />);
  });

  /**
   * Verify OTP and complete registration
   */
  app.post("/verify-otp", async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email ?? "").trim().toLowerCase();
    const otp = String(body.otp ?? "").trim();

    const record = database
      .query<{ email: string; otp_code: string; payload: string; expires_at: number }, [string]>(
        "SELECT email, otp_code, payload, expires_at FROM registration_otps WHERE email = ?"
      )
      .get(email);

    if (!record || record.otp_code !== otp || Date.now() > record.expires_at) {
      return c.html(<FormMessage message="Invalid or expired verification code." />, 400);
    }

    const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get();
    if (!role) return c.html(<FormMessage message="Registration unavailable." />, 500);

    try {
      const payload = JSON.parse(record.payload);
      const userId = generateId();
      const randomPassword = generateId() + generateId(); // Random initial password hash

      const nameParts = (payload.telegramName || "User").split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      database.transaction(() => {
        database.run(
          `INSERT INTO users (id, username, email, password_hash, first_name, last_name, telegram_id, role_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            payload.telegramUsername,
            payload.email,
            Bun.password.hashSync(randomPassword),
            firstName,
            lastName,
            payload.telegramId,
            role.id,
          ]
        );
        setUserPreferredTags(database, userId, payload.tagIds || []);
        database.run("DELETE FROM registration_otps WHERE email = ?", [email]);
      })();

      // Sign user session
      const now = Math.floor(Date.now() / 1000);
      const token = await sign(
        { sub: userId, username: payload.telegramUsername ?? payload.email, role_title: "member", role_id: role.id, iat: now, exp: now + sessionDuration },
        jwtSecret,
        "HS256"
      );
      setCookie(c, "session", token, cookieOptions);

      logger.auth("TELEGRAM_REGISTER_SUCCESS", {
        actor: { userId, email: payload.email, role: "member" },
        data: { telegramId: payload.telegramId },
      });

      c.header("HX-Redirect", "/dashboard/user");
      return c.body(null);
    } catch (err) {
      return c.html(<FormMessage message="Failed to complete registration." />, 409);
    }
  });

  return app;
}
