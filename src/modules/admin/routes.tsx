import { Hono, type Context, type Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { Database } from "bun:sqlite";
import { createPermissionChecker } from "../auth/middleware";
import { AdminLayout, CrudTable, type Row } from "./views";

const secret = () => process.env.JWT_SECRET ?? "development-secret";
const guard = (db: Database, path: string) => async (c: Context, next: Next) => {
  const token = getCookie(c, "session");
  if (!token) return c.redirect("/auth");
  try {
    const claims = await verify(token, secret(), "HS256") as { sub: string; role_id: number };
    if (!createPermissionChecker(db)(claims.role_id, path)) return c.html(<p class="alert alert-error">Forbidden</p>, 403);
    c.set("auth", claims); return next();
  } catch { return c.redirect("/auth"); }
};

export function createAdminRoutes(db: Database) {
  const app = new Hono();
  const page = (c: Context, title: string, body: any) => { const auth = c.get("auth") as { role_id: number }; const allowed = db.query<{ title: string }, [number]>("SELECT e.title FROM endpoints e JOIN role_endpoints re ON re.endpoint_id=e.id WHERE re.role_id=? AND e.deleted_at IS NULL AND re.deleted_at IS NULL").all(auth.role_id).map((r) => r.title); return c.html(<AdminLayout allowed={allowed} title={title}>{body}</AdminLayout>); };
  app.use("*", async (c, next) => guard(db, c.req.path)(c, next));
  app.get("/", (c) => c.redirect("/admin/users"));
  for (const [resource, table, columns] of [["users", "users", ["email", "username", "role_id"]], ["meets", "meets", ["title", "scheduled_date", "scheduled_time"]], ["tags", "tags", ["title", "description"]], ["roles", "roles", ["title", "description"]] ] as const) {
    app.get(`/${resource}`, (c) => page(c, resource, <CrudTable resource={resource} columns={[...columns]} rows={db.query(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE deleted_at IS NULL ORDER BY id DESC`).all() as Row[]} />));
    app.get(`/${resource}/:id/edit`, (c) => c.html(<div class="modal modal-open"><div class="modal-box"><h3 class="font-bold">Edit {resource}</h3><p class="py-4">Edit form for record {c.req.param("id")}</p><button class="btn" onclick="this.closest('.modal').remove()">Close</button></div></div>));
    app.delete(`/${resource}/:id`, (c) => {
      const id = Number(c.req.param("id"));
      if (resource === "roles" && db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin' AND deleted_at IS NULL").get(id)) return c.html(<p class="alert alert-error">The Super Admin role cannot be deleted.</p>, 403);
      db.run(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]);
      return c.body(null, 204);
    });
    app.post(`/${resource}/bulk-delete`, async (c) => { const body = await c.req.parseBody(); const ids = (Array.isArray(body.ids) ? body.ids : [body.ids]).filter(Boolean).map(Number); if (resource === "roles") ids.splice(0, ids.length, ...ids.filter((id) => !db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(id))); for (const id of ids) db.run(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]); return c.html(<p class="alert alert-success">Selected items deleted.</p>); });
  }
  app.post("/roles/:id/endpoints", async (c) => { const roleId = Number(c.req.param("id")); const endpointId = Number((await c.req.parseBody()).endpoint_id); if (!db.query("SELECT 1 FROM endpoints WHERE id=? AND deleted_at IS NULL").get(endpointId)) return c.html(<p class="alert alert-error">Invalid endpoint.</p>, 400); if (db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(roleId)) return c.html(<p class="alert alert-error">The Super Admin role is managed by the system.</p>, 403); db.run("INSERT OR IGNORE INTO role_endpoints (role_id,endpoint_id,description) VALUES (?,?,?)", [roleId, endpointId, "Assigned by admin"]); return c.html(<p class="alert alert-success">Endpoint assigned.</p>); });
  app.get("/roles/:id/endpoints/new", (c) => c.html(<form class="flex gap-2" hx-post={`/admin/roles/${c.req.param("id")}/endpoints`} hx-target="this"><select name="endpoint_id" class="select select-bordered">{db.query<{ id: number; title: string }, []>("SELECT id,title FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all().map((endpoint) => <option value={String(endpoint.id)}>{endpoint.title}</option>)}</select><button class="btn btn-primary">Assign endpoint</button></form>));
  app.get("/endpoints", (c) => page(c, "Endpoints", <CrudTable resource="endpoints" columns={["title", "description"]} rows={db.query("SELECT id,title,description FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all() as Row[]} />));
  app.get("/reports/users", (c) => page(c, "Full Users Report", <CrudTable resource="users" columns={["email", "username", "first_name", "last_name", "role_id"]} rows={db.query("SELECT id,email,username,first_name,last_name,role_id FROM users WHERE deleted_at IS NULL").all() as Row[]} />));
  app.get("/reports/meets", (c) => page(c, "Full Meets Report", <CrudTable resource="meets" columns={["title", "scheduled_date", "scheduled_time", "duration_minutes"]} rows={db.query("SELECT id,title,scheduled_date,scheduled_time,duration_minutes FROM meets WHERE deleted_at IS NULL").all() as Row[]} />));
  return app;
}
