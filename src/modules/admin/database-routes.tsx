import { Hono, type Context } from "hono";
import type { Database } from "bun:sqlite";
import { AdminLayout } from "./views";
import { DatabaseManagementView, getDatabaseStats } from "./database-views";
import { exportDatabaseAsSql, exportDatabaseAsJson, importDatabaseFromJson, importDatabaseFromSql } from "../../lib/backup/local";
import { executeBackup } from "../../lib/backup/scheduler";
import { runMigrations } from "../../lib/database/migration";
import { getLocale } from "../../lib/i18n/context";

type AdminEnv = {
  Variables: {
    auth: { sub: string; role_id: string };
  };
};

export function createDatabaseAdminRoutes(
  db: Database,
  pageRenderer: (c: Context<AdminEnv>, title: string, body: any) => Response | Promise<Response>
) {
  const app = new Hono<AdminEnv>();

  // Database Management View
  app.get("/dashboard/admin/database", (c) => {
    const stats = getDatabaseStats(db);
    const locale = getLocale(c);
    return pageRenderer(
      c,
      "Database Center",
      <DatabaseManagementView stats={stats} locale={locale} />
    );
  });

  // Export DB
  app.get("/dashboard/admin/database/export", async (c) => {
    const format = c.req.query("format") ?? "sql";
    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "json") {
      const json = exportDatabaseAsJson(db);
      return new Response(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="database-export-${dateStr}.json"`,
        },
      });
    }

    if (format === "sqlite") {
      const dbPath = process.env.DATABASE_PATH ?? "app.sqlite";
      const file = Bun.file(dbPath);
      return new Response(file, {
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="app-${dateStr}.sqlite"`,
        },
      });
    }

    // Default to SQL
    const sql = exportDatabaseAsSql(db);
    return new Response(sql, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="database-export-${dateStr}.sql"`,
      },
    });
  });

  // Trigger Backup Now
  app.post("/dashboard/admin/database/backup-now", async (c) => {
    const result = await executeBackup(db);
    if (!result.success) {
      return c.html(
        <div class="alert alert-error text-sm">
          <span>Failed to trigger backup: {result.error}</span>
        </div>
      );
    }

    return c.html(
      <div class="alert alert-success text-sm">
        <span>
          ✓ Snapshot saved: <strong>{result.localFile}</strong> ({(result.sizeBytes / 1024).toFixed(1)} KB)
          {result.ftpUploaded && <span class="ml-2">| Uploaded to FTP server successfully.</span>}
        </span>
      </div>
    );
  });

  // Run Pending Migrations
  app.post("/dashboard/admin/database/migrate", async (c) => {
    try {
      const res = await runMigrations(db);
      return c.html(
        <div class="alert alert-success text-sm">
          <span>
            ✓ Applied {res.applied.length} migration(s). Database is now at v{res.currentVersion}.
          </span>
        </div>
      );
    } catch (err) {
      return c.html(
        <div class="alert alert-error text-sm">
          <span>Migration error: {(err as Error).message}</span>
        </div>
      );
    }
  });

  // Import DB
  app.post("/dashboard/admin/database/import", async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body["backup_file"];

      if (!file || typeof file === "string") {
        return c.html(
          <div class="alert alert-warning text-sm">
            <span>Please select a valid .sql or .json file to import.</span>
          </div>
        );
      }

      const fileObj = file as File;
      const fileName = fileObj.name.toLowerCase();
      const content = await fileObj.text();

      if (fileName.endsWith(".json")) {
        const res = await importDatabaseFromJson(db, content);
        return c.html(
          <div class="alert alert-success text-sm">
            <span>
              ✓ Successfully imported {res.totalRows} records across {res.tablesImported.length} tables from JSON backup.
            </span>
          </div>
        );
      } else if (fileName.endsWith(".sql")) {
        await importDatabaseFromSql(db, content);
        return c.html(
          <div class="alert alert-success text-sm">
            <span>✓ Successfully executed SQL dump and restored database.</span>
          </div>
        );
      } else {
        return c.html(
          <div class="alert alert-error text-sm">
            <span>Unsupported file extension. Please provide a .sql or .json file.</span>
          </div>
        );
      }
    } catch (err) {
      return c.html(
        <div class="alert alert-error text-sm">
          <span>Import failed: {(err as Error).message}</span>
        </div>
      );
    }
  });

  return app;
}
