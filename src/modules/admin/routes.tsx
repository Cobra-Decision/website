import { Hono, type Context, type Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { Database } from "bun:sqlite";
import { createPermissionChecker } from "../auth/middleware";
import { AdminLayout, CrudTable, type Row } from "./views";
import { getErrorMessage } from "../../lib/cache";
import { Toast } from "./views";

const guard = (db: Database, jwtSecret: string, path: string) => async (c: Context, next: Next) => {
  const token = getCookie(c, "session");
  if (!token) return c.redirect("/auth");
  try {
    const claims = await verify(token, jwtSecret, "HS256") as { sub: string; role_id: number };
    if (!createPermissionChecker(db)(claims.role_id, path)) return c.html(<p class="alert alert-error">Forbidden</p>, 403);
    c.set("auth", claims); return next();
  } catch { return c.redirect("/auth"); }
};

export function createAdminRoutes(db: Database, jwtSecret = process.env.JWT_SECRET ?? "development-secret") {
  const app = new Hono();
  const page = (c: Context, title: string, body: any) => { const auth = c.get("auth") as { role_id: number }; const allowed = db.query<{ title: string }, [number]>("SELECT e.title FROM endpoints e JOIN role_endpoints re ON re.endpoint_id=e.id WHERE re.role_id=? AND e.deleted_at IS NULL AND re.deleted_at IS NULL").all(auth.role_id).map((r) => r.title); return c.html(<AdminLayout allowed={allowed} title={title}>{body}</AdminLayout>); };
  app.use("*", async (c, next) => guard(db, jwtSecret, c.req.path)(c, next));
  app.get("/", (c) => c.redirect("/dashboard/admin/users"));
  const config = {
    users: { table: "users", columns: ["email", "username", "role_id"], fields: ["email", "username", "role_id"] },
    meets: { table: "meets", columns: ["title", "scheduled_date", "scheduled_time"], fields: ["title", "scheduled_date", "scheduled_time"] },
    tags: { table: "tags", columns: ["title", "description"], fields: ["title", "description"] },
    roles: { table: "roles", columns: ["title", "description"], fields: ["title", "description"] },
    endpoints: { table: "endpoints", columns: ["title", "description"], fields: ["title", "description"] },
  } as const;
  const form = (resource: keyof typeof config, id?: number, values: Row = {}) => <dialog id="record-modal" class="modal modal-open"><div class="modal-box"><h3 class="font-bold text-lg">{id ? "Edit" : "Add"} {resource}</h3><form hx-post={`/dashboard/admin/${resource}${id ? `/${id}` : ""}`} hx-target={`#${resource}-table`} hx-swap="outerHTML" class="space-y-3 mt-4">{config[resource].fields.map((field) => <label class="form-control"><span class="label-text">{field}</span><input class="input input-bordered" name={field} value={String(values[field] ?? "")} required={field === "title" || field === "email"} /></label>)}<div class="modal-action"><button type="button" class="btn" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Save</button></div></form></div></dialog>;
  const toast = (title: string, fallback: string) => { const message = getErrorMessage(title); return <Toast type={message.type} title={message.title} description={message.description || fallback} />; };
  for (const resource of Object.keys(config) as (keyof typeof config)[]) {
    const { table, columns, fields } = config[resource];
    app.get(`/${resource}`, (c) => page(c, resource, <CrudTable resource={resource} columns={[...columns]} rows={db.query(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE deleted_at IS NULL ORDER BY id DESC`).all() as Row[]} />));
    app.get(`/${resource}/new`, (c) => c.html(form(resource)));
    app.get(`/${resource}/:id/edit`, (c) => { const row = db.query(`SELECT ${fields.join(", ")} FROM ${table} WHERE id=? AND deleted_at IS NULL`).get(Number(c.req.param("id"))) as Row | null; return row ? c.html(form(resource, Number(c.req.param("id")), row)) : c.notFound(); });
    app.get(`/${resource}/:id/confirm`, (c) => c.html(<dialog class="modal modal-open"><div class="modal-box"><h3 class="font-bold">Delete {resource}?</h3><p class="py-4">This item will be removed from active results.</p><form hx-delete={`/dashboard/admin/${resource}/${c.req.param("id")}`} hx-target={`#${resource}-table`} hx-swap="outerHTML"><button class="btn btn-error">Delete</button><button type="button" class="btn" onclick="this.closest('dialog').close()">Cancel</button></form></div></dialog>));
    app.post(`/${resource}`, async (c) => { const body = await c.req.parseBody(); const values = fields.map((field) => String(body[field] ?? "").trim() || null); db.run(`INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`, values); return c.html(<><CrudTable resource={resource} columns={[...columns]} rows={db.query(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE deleted_at IS NULL ORDER BY id DESC`).all() as Row[]} />{toast("admin.created", "Created")}</>); });
    app.post(`/${resource}/:id`, async (c) => { const body = await c.req.parseBody(); const values = fields.map((field) => String(body[field] ?? "").trim() || null); db.run(`UPDATE ${table} SET ${fields.map((field) => `${field}=?`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, Number(c.req.param("id"))]); return c.html(<CrudTable resource={resource} columns={[...columns]} rows={db.query(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE deleted_at IS NULL ORDER BY id DESC`).all() as Row[]}/>); });
    app.delete(`/${resource}/:id`, (c) => { const id = Number(c.req.param("id")); if (resource === "roles" && db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(id)) return c.html(toast("admin.super_admin_protected", "Protected"), 403); db.run(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]); return c.html(<><CrudTable resource={resource} columns={[...columns]} rows={db.query(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE deleted_at IS NULL ORDER BY id DESC`).all() as Row[]}/>{toast("admin.deleted", "Deleted")}</>); });
    app.post(`/${resource}/bulk-delete`, async (c) => { const body = await c.req.parseBody(); const ids = (Array.isArray(body.ids) ? body.ids : [body.ids]).filter(Boolean).map(Number); for (const id of ids) if (!(resource === "roles" && db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(id))) db.run(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]); return c.html(toast("admin.deleted", "Deleted")); });
  }
  app.post("/roles/:id/endpoints", async (c) => { const roleId = Number(c.req.param("id")); const endpointId = Number((await c.req.parseBody()).endpoint_id); if (!db.query("SELECT 1 FROM endpoints WHERE id=? AND deleted_at IS NULL").get(endpointId)) return c.html(<p class="alert alert-error">Invalid endpoint.</p>, 400); if (db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(roleId)) return c.html(<p class="alert alert-error">The Super Admin role is managed by the system.</p>, 403); db.run("INSERT OR IGNORE INTO role_endpoints (role_id,endpoint_id,description) VALUES (?,?,?)", [roleId, endpointId, "Assigned by admin"]); return c.html(<p class="alert alert-success">Endpoint assigned.</p>); });
  app.get("/roles/:id/endpoints/new", (c) => c.html(<form class="flex gap-2" hx-post={`/dashboard/admin/roles/${c.req.param("id")}/endpoints`} hx-target="this"><select name="endpoint_id" class="select select-bordered">{db.query<{ id: number; title: string }, []>("SELECT id,title FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all().map((endpoint) => <option value={String(endpoint.id)}>{endpoint.title}</option>)}</select><button class="btn btn-primary">Assign endpoint</button></form>));
  app.get("/endpoints", (c) => page(c, "Endpoints", <CrudTable resource="endpoints" columns={["title", "description"]} rows={db.query("SELECT id,title,description FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all() as Row[]} />));
  app.get("/reports/users", (c) => page(c, "Full Users Report", <CrudTable resource="users" columns={["email", "username", "first_name", "last_name", "role_id"]} rows={db.query("SELECT id,email,username,first_name,last_name,role_id FROM users WHERE deleted_at IS NULL").all() as Row[]} />));
  app.get("/reports/meets", (c) => page(c, "Full Meets Report", <CrudTable resource="meets" columns={["title", "scheduled_date", "scheduled_time", "duration_minutes"]} rows={db.query("SELECT id,title,scheduled_date,scheduled_time,duration_minutes FROM meets WHERE deleted_at IS NULL").all() as Row[]} />));
  return app;
}
