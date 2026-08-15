import type { Database } from "bun:sqlite";
import { generateId } from "../../lib/id";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export type AdminSeed = { email?: string; password?: string };

export async function initializeDatabase(database: Database, admin: AdminSeed = {}) {
  database.exec(schema);

  const roles = [
    { title: "member", description: "Default user role" },
    { title: "admin", description: "Administrator" },
    { title: "Super Admin", description: "Full administrative access" },
  ];
  for (const role of roles) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get(role.title);
    if (!existing) {
      database.run("INSERT INTO roles (id, title, description) VALUES (?, ?, ?)", [generateId(), role.title, role.description]);
    }
  }

  const endpoints = [
    "/dashboard",
    "/dashboard/user",
    "/dashboard/user/meets",
    "/dashboard/user/my-meets",
    "/dashboard/account",
    "/dashboard/admin",
    "/dashboard/admin/users",
    "/dashboard/admin/users/bulk-confirm",
    "/dashboard/admin/meets",
    "/dashboard/admin/meets/bulk-confirm",
    "/dashboard/admin/tags",
    "/dashboard/admin/tags/bulk-confirm",
    "/dashboard/admin/roles",
    "/dashboard/admin/roles/bulk-confirm",
    "/dashboard/admin/endpoints",
    "/dashboard/admin/endpoints/bulk-confirm",
    "/dashboard/admin/files",
    "/dashboard/admin/files/upload",
    "/dashboard/admin/files/upload-modal",
    "/dashboard/admin/files/preview-modal",
    "/dashboard/admin/files/rename",
    "/dashboard/admin/files/rename-modal",
    "/dashboard/admin/files/duplicate",
    "/dashboard/admin/files/bulk-confirm",
    "/dashboard/admin/report",
    "/dashboard/admin/mailer",
    "/dashboard/admin/mailer/send",
  ];
  for (const endpoint of endpoints) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get(endpoint);
    if (!existing) {
      database.run("INSERT INTO endpoints (id, title, description) VALUES (?, ?, ?)", [generateId(), endpoint, "Administrative endpoint"]);
    }
  }

  const adminRoles = database.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE title IN ('admin', 'Super Admin')").all();
  const allEndpoints = database.query<{ id: string; title: string }, []>("SELECT id, title FROM endpoints").all();

  for (const r of adminRoles) {
    for (const e of allEndpoints) {
      if (r.title === "admin" && e.title === "/dashboard/admin/report") continue;
      database.run(
        "INSERT OR IGNORE INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)",
        [generateId(), r.id, e.id, "Dashboard access"]
      );
    }
  }

  const memberRole = database.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");
  if (memberRole) {
    const memberEndpoints = ["/dashboard", "/dashboard/user", "/dashboard/user/meets", "/dashboard/user/my-meets", "/dashboard/account"];
    for (const path of memberEndpoints) {
      const ep = database.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get(path);
      if (ep) {
        database.run(
          "INSERT OR IGNORE INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)",
          [generateId(), memberRole.id, ep.id, "Member dashboard access"]
        );
      }
    }
  }

  const errorMessages = [
    ["success", "admin.created", "Record created."],
    ["success", "admin.deleted", "Record deleted."],
    ["error", "admin.error", "The action could not be completed."],
    ["error", "admin.invalid_relation", "Choose a valid related record."],
    ["warning", "admin.nothing_selected", "Select at least one record."],
    ["info", "admin.no_changes", "No changes were needed."],
  ];
  for (const [type, title, description] of errorMessages) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM error_messages WHERE title = ?").get(title);
    if (!existing) {
      database.run("INSERT OR IGNORE INTO error_messages (id, type, title, description) VALUES (?, ?, ?, ?)", [generateId(), type, title, description]);
    }
  }

  if (admin.email && admin.password) {
    const role = database.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'Super Admin' AND deleted_at IS NULL").get()!;
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(admin.email.trim().toLowerCase());
    if (!existing) {
      database.run(
        "INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
        [generateId(), admin.email.trim().toLowerCase(), await Bun.password.hash(admin.password), role.id]
      );
    } else {
      database.run("UPDATE users SET role_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [role.id, existing.id]);
    }
  }
}
