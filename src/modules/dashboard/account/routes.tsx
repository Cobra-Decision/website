import type { Database } from "bun:sqlite";
import { Hono, type Context, type Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { Document } from "../../../ui/layout";
import { FormMessage } from "../../../ui/form-message";
import { refreshLandingCache } from "../../../lib/cache";
import type { Claims } from "../../auth/middleware";
import type { Profile } from "../../auth/views";
import { getAllTags, getUserPreferredTags, setUserPreferredTags } from "../../events/queries";
import { getLocale } from "../../../lib/i18n/context";
import { AccountPage } from "./views";

const authGuard = (jwtSecret: string) => async (c: Context, next: Next) => {
  const token = getCookie(c, "session");
  if (!token) return c.redirect("/auth");
  try {
    const claims = (await verify(token, jwtSecret, "HS256")) as unknown as Claims;
    c.set("auth", claims);
    return next();
  } catch {
    return c.redirect("/auth");
  }
};

export function createAccountRoutes(database: Database, jwtSecret = process.env.JWT_SECRET ?? "development-secret") {
  const app = new Hono<{ Variables: { auth: Claims } }>();

  app.use("*", authGuard(jwtSecret));

  const loadUser = (userId: string): Profile | null => {
    return database
      .query<Profile, [string]>(
        `SELECT u.id, u.email, u.username, u.phone, u.first_name, u.last_name, r.title role_title
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

  app.post("/", async (c) => {
    const auth = c.get("auth") as Claims;
    const user = loadUser(auth.sub);
    if (!user) return c.redirect("/auth");

    const body = await c.req.parseBody();
    const email = body.email !== undefined ? String(body.email ?? "").trim().toLowerCase() : user.email;
    const username = body.username !== undefined ? (String(body.username ?? "").trim() || null) : user.username;
    const phone = body.phone !== undefined ? (String(body.phone ?? "").trim() || null) : user.phone;
    const firstName = body.first_name !== undefined ? (String(body.first_name ?? "").trim() || null) : user.first_name;
    const lastName = body.last_name !== undefined ? (String(body.last_name ?? "").trim() || null) : user.last_name;
    const password = String(body.password ?? "");
    const passwordConfirmation = String(body.password_confirmation ?? "");

    if (!email || !email.includes("@")) {
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
