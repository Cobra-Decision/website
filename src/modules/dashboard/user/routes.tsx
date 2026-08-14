import type { Database } from "bun:sqlite";
import { Hono, type Context, type Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { Claims } from "../../auth/middleware";
import type { Profile } from "../../auth/views";
import type { Tag } from "../../events/types";
import { filterMeets } from "../../events/queries";
import { UserDashboard, MeetsGrid } from "./views";

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
  const app = new Hono();

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

  app.get("/", (c) => {
    const auth = c.get("auth") as Claims;
    const user = loadUser(auth.sub);
    if (!user) return c.redirect("/auth");

    const tab = c.req.query("tab") === "attended" ? "attended" : "all";
    const meets = filterMeets(database, {
      userId: user.id,
      attendedOnly: tab === "attended",
    });

    const tags = getTags();

    return c.html(<UserDashboard user={user} meets={meets} tags={tags} activeTab={tab} />);
  });

  app.get("/meets/filter", (c) => {
    const auth = c.get("auth") as Claims;
    const q = c.req.query("q");
    const tagId = c.req.query("tagId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const attendedOnly = c.req.query("attendedOnly") === "true";

    const meets = filterMeets(database, {
      q,
      tagId: tagId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: auth.sub,
      attendedOnly,
    });

    return c.html(<MeetsGrid meets={meets} userId={auth.sub} />);
  });

  return app;
}
