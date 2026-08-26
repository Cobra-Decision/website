import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { Document } from "../../../ui/layout";
import { FormMessage } from "../../../ui/form-message";
import { refreshLandingCache } from "../../../lib/cache";
import { authGuard, type Claims } from "../../auth/middleware";
import type { Profile } from "../../auth/views";
import { getAllTags, getUserPreferredTags, setUserPreferredTags } from "../../events/queries";
import { getLocale, t } from "../../../lib/i18n/context";
import { AccountPage, TelegramConnectionCard } from "./views";
import { logger } from "../../../lib/logger";

export function createAccountRoutes(database: Database, jwtSecret = process.env.JWT_SECRET ?? "development-secret") {
  const app = new Hono<{ Variables: { auth: Claims } }>();

  app.use("*", authGuard(jwtSecret));

  const loadUser = (userId: string): Profile | null => {
    return database
      .query<Profile, [string]>(
        `SELECT u.id, u.email, u.username, u.phone, u.first_name, u.last_name, u.timezone, u.telegram_id, r.title role_title
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.deleted_at IS NULL AND r.deleted_at IS NULL`
      )
      .get(userId);
  };

  app.get("/", (c) => {
    const auth = c.get("auth") as Claims;
    const user = loadUser(auth.sub);
    if (!user) return c.redirect("/auth");

    const from = c.req.query("from") === "admin" ? "admin" : "user";
    const locale = getLocale(c);
    const allTags = getAllTags(database);
    const userTags = getUserPreferredTags(database, user.id!);
    const userTagIds = userTags.map((t) => t.id);

    return c.html(
      <Document title="Account Settings | CobraDecision" locale={locale}>
        <AccountPage
          user={user}
          from={from}
          allTags={allTags}
          userTagIds={userTagIds}
          locale={locale}
        />
      </Document>
    );
  });

  app.post("/telegram/disconnect", (c) => {
    const auth = c.get("auth") as Claims;
    const locale = getLocale(c);

    database.run(
      `UPDATE users SET telegram_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
      [auth.sub]
    );

    return c.html(<TelegramConnectionCard telegramId={null} locale={locale} />);
  });

  app.post("/delete", async (c) => {
    const auth = c.get("auth") as Claims;
    const locale = getLocale(c);

    const userWithSecret = database
      .query<{ id: string; password_hash: string }, [string]>(
        `SELECT id, password_hash FROM users WHERE id = ? AND deleted_at IS NULL`
      )
      .get(auth.sub);

    if (!userWithSecret) {
      return c.html(<FormMessage message="User not found." />, 404);
    }

    const body = await c.req.parseBody();
    const password = String(body.password ?? "");

    if (!password) {
      return c.html(<FormMessage message={t("account.delete_modal_password", locale)} />, 400);
    }

    const isMatch = await Bun.password.verify(password, userWithSecret.password_hash);
    if (!isMatch) {
      return c.html(<FormMessage message={t("account.delete_incorrect_password", locale)} />, 401);
    }

    database.transaction(() => {
      database.run(
        `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [auth.sub]
      );
      database.run(`DELETE FROM meet_attendees WHERE user_id = ?`, [auth.sub]);
    })();

    logger.auth("AUTH_ACCOUNT_DELETED", { actor: { userId: auth.sub } });
    refreshLandingCache(database);

    deleteCookie(c, "session", { path: "/" });
    c.header("HX-Redirect", "/auth");
    return c.text("Account deleted");
  });

  app.post("/", async (c) => {
    const auth = c.get("auth") as Claims;
    const user = loadUser(auth.sub);
    if (!user) return c.redirect("/auth");

    const body = await c.req.parseBody({ all: true });
    const email = body.email !== undefined ? String(Array.isArray(body.email) ? body.email[0] : (body.email ?? "")).trim().toLowerCase() : user.email;
    const username = body.username !== undefined ? (String(Array.isArray(body.username) ? body.username[0] : (body.username ?? "")).trim() || null) : user.username;
    const phone = body.phone !== undefined ? (String(Array.isArray(body.phone) ? body.phone[0] : (body.phone ?? "")).trim() || null) : user.phone;
    const firstName = body.first_name !== undefined ? (String(Array.isArray(body.first_name) ? body.first_name[0] : (body.first_name ?? "")).trim() || null) : user.first_name;
    const lastName = body.last_name !== undefined ? (String(Array.isArray(body.last_name) ? body.last_name[0] : (body.last_name ?? "")).trim() || null) : user.last_name;
    const password = String(Array.isArray(body.password) ? body.password[0] : (body.password ?? ""));
    const passwordConfirmation = String(Array.isArray(body.password_confirmation) ? body.password_confirmation[0] : (body.password_confirmation ?? ""));

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.html(<FormMessage message="A valid email is required." />, 400);
    }

    if (password && password !== passwordConfirmation) {
      return c.html(<FormMessage message="Passwords do not match." />, 400);
    }

    let tagIds: string[] = [];
    if (Array.isArray(body.tagIds)) {
      tagIds = body.tagIds.map(String).filter(Boolean);
    } else if (typeof body.tagIds === "string" && body.tagIds.trim()) {
      tagIds = [body.tagIds.trim()];
    }

    if (body.tagIds !== undefined && tagIds.length < 3) {
      return c.html(<FormMessage message="Please select at least 3 preferred tags." />, 400);
    }

    try {
      database.transaction(() => {
        database.run(
          `UPDATE users
           SET email = ?, username = ?, phone = ?, first_name = ?, last_name = ?${password ? ", password_hash = ?" : ""}, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND deleted_at IS NULL`,
          [
            email,
            username,
            phone,
            firstName,
            lastName,
            ...(password ? [Bun.password.hashSync(password)] : []),
            auth.sub,
          ]
        );

        if (body.tagIds !== undefined) {
          setUserPreferredTags(database, auth.sub, tagIds);
        }
      })();

      refreshLandingCache(database);
      return c.html(<FormMessage type="success" message="Profile successfully updated." />);
    } catch {
      return c.html(<FormMessage message="Email, username, or phone number is already in use." />, 409);
    }
  });

  return app;
}
