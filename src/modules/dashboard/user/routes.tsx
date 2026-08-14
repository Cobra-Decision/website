import type { Database } from "bun:sqlite";
import { Hono, type Context, type Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { Claims } from "../../auth/middleware";
import type { Profile } from "../../auth/views";
import type { Tag } from "../../events/types";
import { filterMeets } from "../../events/queries";
import { UserDashboard, MeetsGrid } from "./views";
import { getLocale } from "../../../lib/i18n/context";

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

export function createUserDashboardRoutes(database: Database, jwtSecret = process.env.JWT_SECRET ?? "development-secret") {
  const app = new Hono<{ Variables: { auth: Claims } }>();

  app.use("*", authGuard(jwtSecret));

  const loadUser = (userId: string): Profile | null => {
    return database
      .query<Profile, [string]>(
        `SELECT u.id, u.email, u.username, u.phone, u.first_name, u.last_name, r.title role_title
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.deleted_at IS NULL`
      )
      .get(userId);
  };

  const getTags = (): Tag[] => {
    return database.query<Tag, []>("SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY title").all();
  };

  const renderMeetsPage = (c: Context, activeTab: "all" | "attended") => {
    const auth = c.get("auth") as Claims;
    const locale = getLocale(c);
    const user = loadUser(auth.sub);
    if (!user) return c.redirect("/auth");

    const meets = filterMeets(database, {
      userId: user.id,
      attendedOnly: activeTab === "attended",
    });

    const tags = getTags();
    return c.html(<UserDashboard user={user} meets={meets} tags={tags} activeTab={activeTab} locale={locale} />);
  };

  app.get("/", (c) => renderMeetsPage(c, "all"));
  app.get("/meets", (c) => renderMeetsPage(c, "all"));
  app.get("/my-meets", (c) => renderMeetsPage(c, "attended"));

  app.get("/meets/filter", (c) => {
    const auth = c.get("auth") as Claims;
    const locale = getLocale(c);
    const q = c.req.query("q");
    const tagId = c.req.query("tagId") ?? c.req.query("tag_id");
    const startDate = c.req.query("startDate") ?? c.req.query("start_date");
    const endDate = c.req.query("endDate") ?? c.req.query("end_date");
    const attendedOnly = c.req.query("attendedOnly") === "true" || c.req.query("attended_only") === "true";

    const meets = filterMeets(database, {
      q,
      tagId: tagId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: auth.sub,
      attendedOnly,
    });

    return c.html(<MeetsGrid meets={meets} userId={auth.sub} locale={locale} />);
  });

  return app;
}
