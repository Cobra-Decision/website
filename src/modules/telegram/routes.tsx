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

const sessionDuration = 60 * 60 * 8;
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  // Inside Telegram Web iframes (web.telegram.org), cookies must be SameSite=None + Secure (or Lax in non-https dev)
  sameSite: (isProd ? "None" : "Lax") as "None" | "Lax",
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
                const rawHash = window.location.hash.slice(1);
                const hashParams = new URLSearchParams(rawHash);
                let initData = tg?.initData || "";
                if (!initData && hashParams.has("tgWebAppData")) {
                  const paramVal = hashParams.get("tgWebAppData") || "";
                  try {
                    initData = paramVal.includes("hash=") ? paramVal : decodeURIComponent(paramVal);
                  } catch {
                    initData = paramVal;
                  }
                }
                if (!initData) {
                  document.getElementById("tg-loader").innerHTML = '<div class="alert alert-warning max-w-sm mx-auto">Please open this page inside Telegram.</div>';
                  return;
                }
                fetch("/tg/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ initData }),
                  redirect: "follow"
                }).then(async (res) => {
                  if (res.redirected) {
                    window.location.href = res.url;
                  } else if (res.ok) {
                    const html = await res.text();
                    if (html) {
                      document.body.innerHTML = html;
                      if (window.htmx) window.htmx.process(document.body);
                    } else {
                      const startParam = tg?.initDataUnsafe?.start_param || "";
                      if (startParam.startsWith("meet_")) {
                        const meetId = startParam.slice(5);
                        window.location.href = "/meets/" + encodeURIComponent(meetId) + "?platform=telegram";
                      } else {
                        window.location.href = "/dashboard/user";
                      }
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
    const startParam = validated.raw?.start_param || "";
    let redirectUrl = "/dashboard/user";
    if (startParam.startsWith("meet_")) {
      const meetId = startParam.slice(5);
      redirectUrl = `/meets/${encodeURIComponent(meetId)}?platform=telegram`;
    }

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
        data: { telegramId: tgId, redirectUrl },
      });
      return c.redirect(redirectUrl);
    }

    // User is NOT linked -> Save tg_link_id cookie for later linking
    setCookie(c, "tg_link_id", tgId, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    // If a specific meet was requested, redirect directly to it as guest; otherwise go to /auth
    if (startParam.startsWith("meet_")) {
      return c.redirect(redirectUrl);
    }

    return c.redirect("/auth");
  });

  return app;
}
