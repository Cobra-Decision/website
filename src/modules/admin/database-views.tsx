import type { Database } from "bun:sqlite";
import { getCurrentVersion, migrations } from "../../lib/database/migration";
import type { Locale } from "../../lib/i18n/translations";
import { DatabaseBackupIcon, UploadIcon, DownloadIcon } from "../../ui/icons";

export interface DatabaseStats {
  sqliteVersion: string;
  databaseSizeFormatted: string;
  walMode: string;
  integrityStatus: string;
  currentMigrationVersion: number;
  totalMigrationsAvailable: number;
  tables: { name: string; rowCount: number }[];
  backupTime: string;
  ftpConfigured: boolean;
  ftpRetention: number;
}

export function getDatabaseStats(db: Database): DatabaseStats {
  const sqliteVerRow = db.query<{ version: string }, []>("SELECT sqlite_version() as version").get();
  const journalRow = db.query<{ journal_mode: string }, []>("PRAGMA journal_mode;").get();
  const integrityRow = db.query<{ integrity_check: string }, []>("PRAGMA integrity_check(1);").get();

  const tables = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    )
    .all();

  const tableStats = tables.map((t) => {
    try {
      const countRow = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
      return { name: t.name, rowCount: countRow?.count ?? 0 };
    } catch {
      return { name: t.name, rowCount: 0 };
    }
  });

  const dbPath = process.env.DATABASE_PATH ?? "data/app.sqlite";
  let sizeStr = "Unknown";
  try {
    const file = Bun.file(dbPath);
    const bytes = file.size;
    if (bytes < 1024) sizeStr = `${bytes} B`;
    else if (bytes < 1024 * 1024) sizeStr = `${(bytes / 1024).toFixed(1)} KB`;
    else sizeStr = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    sizeStr = "N/A";
  }

  return {
    sqliteVersion: sqliteVerRow?.version ?? "3.x",
    databaseSizeFormatted: sizeStr,
    walMode: (journalRow?.journal_mode ?? "wal").toUpperCase(),
    integrityStatus: integrityRow?.integrity_check ?? "ok",
    currentMigrationVersion: getCurrentVersion(db),
    totalMigrationsAvailable: migrations.length,
    tables: tableStats,
    backupTime: process.env.BACKUP_TIME ?? "03:30",
    ftpConfigured: !!(process.env.FTP_HOST && process.env.FTP_USER),
    ftpRetention: process.env.FTP_BACKUP_RETENTION_COUNT ? parseInt(process.env.FTP_BACKUP_RETENTION_COUNT, 10) : 3,
  };
}

export function DatabaseManagementView({
  stats,
  locale = "en",
}: {
  stats: DatabaseStats;
  locale?: Locale;
}) {
  const isUpToDate = stats.currentMigrationVersion >= stats.totalMigrationsAvailable;

  return (
    <div class="space-y-8">
      {/* Header */}
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-base-content">
            Database Center
          </h1>
          <p class="text-sm text-base-content/60 mt-1">
            Manage database schemas, migrations, backups, and data portability.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            hx-post="/dashboard/admin/database/backup-now"
            hx-target="#db-feedback"
            class="btn btn-primary btn-sm gap-2"
          >
            <DatabaseBackupIcon class="w-4 h-4" />
            Trigger Backup Now
          </button>
        </div>
      </div>

      <div id="db-feedback" />

      {/* Top Stats Overview */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">Database Engine</div>
          <div class="text-xl font-bold mt-1 text-base-content">SQLite v{stats.sqliteVersion}</div>
          <div class="text-xs text-success font-medium mt-1">Mode: {stats.walMode}</div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">Database Size</div>
          <div class="text-xl font-bold mt-1 text-base-content">{stats.databaseSizeFormatted}</div>
          <div class="text-xs text-base-content/60 mt-1">Integrity: <span class="badge badge-success badge-xs font-mono">{stats.integrityStatus}</span></div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">Migration Version</div>
          <div class="text-xl font-bold mt-1 text-base-content">
            v{stats.currentMigrationVersion} <span class="text-xs font-normal text-base-content/50">/ v{stats.totalMigrationsAvailable}</span>
          </div>
          <div class="text-xs mt-1">
            {isUpToDate ? (
              <span class="text-success font-medium">✓ Schema Up to Date</span>
            ) : (
              <span class="text-warning font-medium">⚠ Updates Available</span>
            )}
          </div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">Scheduled Backup</div>
          <div class="text-xl font-bold mt-1 text-base-content">{stats.backupTime} AM Daily</div>
          <div class="text-xs text-base-content/60 mt-1">
            FTP: {stats.ftpConfigured ? <span class="text-success font-medium">Active ({stats.ftpRetention} max)</span> : <span class="text-base-content/40">Disabled</span>}
          </div>
        </div>
      </div>

      {/* Migration & Schema Tools */}
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-6">
          <h2 class="text-lg font-bold text-base-content flex items-center justify-between">
            <span>Schema & Migration Status</span>
            {!isUpToDate && (
              <button
                hx-post="/dashboard/admin/database/migrate"
                hx-target="#db-feedback"
                class="btn btn-warning btn-sm"
              >
                Run Pending Migrations
              </button>
            )}
          </h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-base-200/50 rounded-lg p-4 text-sm space-y-2">
              <div class="font-semibold text-base-content">CLI Commands for VPS / Host:</div>
              <div class="font-mono text-xs bg-base-300 p-2.5 rounded text-base-content select-all space-y-1">
                <div># Local / Host execution</div>
                <div>bun run migration</div>
                <div>bun run migration status</div>
                <div>bun run seeding full</div>
                <div class="pt-1 text-base-content/60"># Docker container execution</div>
                <div>docker compose exec website bun run migration</div>
                <div>docker compose exec website bun run seeding full</div>
              </div>
            </div>
            <div class="bg-base-200/50 rounded-lg p-4 text-sm space-y-2">
              <div class="font-semibold text-base-content">Database Schema Inventory:</div>
              <div class="text-xs text-base-content/70">
                Total Tables: <strong>{stats.tables.length}</strong> | Total Records: <strong>{stats.tables.reduce((acc, t) => acc + t.rowCount, 0)}</strong>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                {stats.tables.map((t) => (
                  <span key={t.name} class="badge badge-neutral badge-sm font-mono">
                    {t.name}: {t.rowCount}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export & Import Data */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div>
              <h2 class="text-lg font-bold text-base-content flex items-center gap-2">
                <UploadIcon class="w-5 h-5 text-primary" />
                Export Database
              </h2>
              <p class="text-xs text-base-content/60 mt-1">
                Download a clean production snapshot of your entire database.
              </p>
            </div>

            <div class="space-y-2">
              <a
                href="/dashboard/admin/database/export?format=sql"
                download="database-export.sql"
                class="btn btn-outline btn-block justify-between btn-sm h-auto min-h-8 py-2 px-3 gap-2 flex-wrap sm:flex-nowrap"
              >
                <span>Standard SQL Dump (.sql)</span>
                <span class="badge badge-ghost badge-xs shrink-0">DDL + Inserts</span>
              </a>

              <a
                href="/dashboard/admin/database/export?format=json"
                download="database-export.json"
                class="btn btn-outline btn-block justify-between btn-sm h-auto min-h-8 py-2 px-3 gap-2 flex-wrap sm:flex-nowrap"
              >
                <span>Structured JSON Backup (.json)</span>
                <span class="badge badge-ghost badge-xs shrink-0">Portable Data</span>
              </a>

              <a
                href="/dashboard/admin/database/export?format=sqlite"
                download="app.sqlite"
                class="btn btn-outline btn-block justify-between btn-sm h-auto min-h-8 py-2 px-3 gap-2 flex-wrap sm:flex-nowrap"
              >
                <span>Raw SQLite Binary (.sqlite)</span>
                <span class="badge badge-ghost badge-xs shrink-0">Binary Copy</span>
              </a>
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div>
              <h2 class="text-lg font-bold text-base-content flex items-center gap-2">
                <DownloadIcon class="w-5 h-5 text-secondary" />
                Import & Restore Database
              </h2>
              <p class="text-xs text-base-content/60 mt-1">
                Restore schema & table data from a valid SQL, JSON, or SQLite backup file.
              </p>
            </div>

            <form
              hx-post="/dashboard/admin/database/import"
              hx-encoding="multipart/form-data"
              hx-target="#db-feedback"
              class="space-y-3"
            >
              <div class="form-control">
                <input
                  type="file"
                  name="backup_file"
                  accept=".sql,.json,.sqlite,.db,.sqlite3"
                  required
                  class="file-input file-input-bordered file-input-sm w-full"
                />
              </div>
              <button type="submit" class="btn btn-secondary btn-sm btn-block">
                Upload & Restore
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
