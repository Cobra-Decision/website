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
    // User & Root Dashboard
    "/dashboard",
    "/dashboard/user",
    "/dashboard/user/meets",
    "/dashboard/user/my-meets",
    "/dashboard/account",

    // Admin Base
    "/dashboard/admin",

    // Users CRUD
    "/dashboard/admin/users",
    "/dashboard/admin/users/new",
    "/dashboard/admin/users/:id",
    "/dashboard/admin/users/:id/edit",
    "/dashboard/admin/users/:id/confirm",
    "/dashboard/admin/users/bulk-confirm",
    "/dashboard/admin/users/bulk-delete",

    // Meets CRUD
    "/dashboard/admin/meets",
    "/dashboard/admin/meets/new",
    "/dashboard/admin/meets/:id",
    "/dashboard/admin/meets/:id/edit",
    "/dashboard/admin/meets/:id/confirm",
    "/dashboard/admin/meets/bulk-confirm",
    "/dashboard/admin/meets/bulk-delete",
    "/dashboard/admin/meets/:id/tags",
    "/dashboard/admin/meets/:id/tags/:tagId",
    "/dashboard/admin/meets/:id/attendees",
    "/dashboard/admin/meets/:id/attendees/:userId",

    // Tags CRUD
    "/dashboard/admin/tags",
    "/dashboard/admin/tags/new",
    "/dashboard/admin/tags/:id",
    "/dashboard/admin/tags/:id/edit",
    "/dashboard/admin/tags/:id/confirm",
    "/dashboard/admin/tags/bulk-confirm",
    "/dashboard/admin/tags/bulk-delete",

    // Roles CRUD
    "/dashboard/admin/roles",
    "/dashboard/admin/roles/new",
    "/dashboard/admin/roles/:id",
    "/dashboard/admin/roles/:id/edit",
    "/dashboard/admin/roles/:id/confirm",
    "/dashboard/admin/roles/bulk-confirm",
    "/dashboard/admin/roles/bulk-delete",
    "/dashboard/admin/roles/:id/endpoints",
    "/dashboard/admin/roles/:id/endpoints/:endpointId",
    "/dashboard/admin/roles/:id/endpoints/new",

    // Endpoints CRUD
    "/dashboard/admin/endpoints",
    "/dashboard/admin/endpoints/new",
    "/dashboard/admin/endpoints/:id",
    "/dashboard/admin/endpoints/:id/edit",
    "/dashboard/admin/endpoints/:id/confirm",
    "/dashboard/admin/endpoints/bulk-confirm",
    "/dashboard/admin/endpoints/bulk-delete",

    // Files Management
    "/dashboard/admin/files",
    "/dashboard/admin/files/upload",
    "/dashboard/admin/files/upload-modal",
    "/dashboard/admin/files/preview-modal",
    "/dashboard/admin/files/rename",
    "/dashboard/admin/files/rename-modal",
    "/dashboard/admin/files/duplicate",
    "/dashboard/admin/files/confirm-delete",
    "/dashboard/admin/files/bulk-confirm",
    "/dashboard/admin/files/bulk-delete",
    "/dashboard/admin/files/:filename",

    // Report
    "/dashboard/admin/report",

    // Mailer Center
    "/dashboard/admin/mailer",
    "/dashboard/admin/mail-management",
    "/dashboard/admin/mailer/send",
    "/dashboard/admin/mailer/subscribers",
    "/dashboard/admin/mailer/test-modal",
    "/dashboard/admin/mailer/test-send",
    "/dashboard/admin/mail-editor",
    "/dashboard/admin/mail-editor/save",
    "/dashboard/admin/mail-editor/delete",
    "/dashboard/admin/mail-scheduler",
    "/dashboard/admin/mail-scheduler/schedule",
    "/dashboard/admin/mail-scheduler/repeat",
    "/dashboard/admin/mail-scheduler/cancel",
    "/dashboard/admin/mail-scheduler/delete",

    // Database Center
    "/dashboard/admin/database",
    "/dashboard/admin/database/export",
    "/dashboard/admin/database/import",
    "/dashboard/admin/database/backup-now",
    "/dashboard/admin/database/migrate",
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
