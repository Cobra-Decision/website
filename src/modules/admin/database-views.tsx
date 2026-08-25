import type { Database } from "bun:sqlite";
import { getCurrentVersion, migrations } from "../../lib/database/migration";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
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
            {t("admin.db.title", locale)}
          </h1>
          <p class="text-sm text-base-content/60 mt-1">
            {t("admin.db.subtitle", locale)}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            hx-post="/dashboard/admin/database/backup-now"
            hx-target="#db-feedback"
            class="btn btn-primary btn-sm gap-2"
          >
            <DatabaseBackupIcon class="w-4 h-4" />
            {t("admin.db.backup_now", locale)}
          </button>
        </div>
      </div>

      <div id="db-feedback" />

      {/* Top Stats Overview */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">{t("admin.db.sqlite_version", locale)}</div>
          <div class="text-xl font-bold mt-1 text-base-content">SQLite v{formatLocalizedNumber(stats.sqliteVersion, locale)}</div>
          <div class="text-xs text-success font-medium mt-1">{t("admin.db.wal_mode", locale)}: {stats.walMode}</div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">{t("admin.db.file_size", locale)}</div>
          <div class="text-xl font-bold mt-1 text-base-content">{stats.databaseSizeFormatted}</div>
          <div class="text-xs text-base-content/60 mt-1">{t("admin.db.integrity", locale)}: <span class="badge badge-success badge-xs font-mono">{stats.integrityStatus}</span></div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">{t("admin.db.migrations", locale)}</div>
          <div class="text-xl font-bold mt-1 text-base-content">
            v{formatLocalizedNumber(stats.currentMigrationVersion, locale)} <span class="text-xs font-normal text-base-content/50">/ v{formatLocalizedNumber(stats.totalMigrationsAvailable, locale)}</span>
          </div>
          <div class="text-xs mt-1">
            {isUpToDate ? (
              <span class="text-success font-medium">✓ {t("admin.db.migrations_uptodate", locale)}</span>
            ) : (
              <span class="text-warning font-medium">⚠ {formatLocalizedNumber(stats.totalMigrationsAvailable - stats.currentMigrationVersion, locale)} {t("admin.db.migrations_pending", locale)}</span>
            )}
          </div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm p-4">
          <div class="text-xs uppercase font-bold text-base-content/50">{t("admin.db.daily_schedule", locale)}</div>
          <div class="text-xl font-bold mt-1 text-base-content">{formatLocalizedNumber(stats.backupTime, locale)}</div>
          <div class="text-xs text-base-content/60 mt-1">
            FTP: {stats.ftpConfigured ? <span class="text-success font-medium">{t("admin.db.ftp_configured", locale)} ({formatLocalizedNumber(stats.ftpRetention, locale)} {t("admin.db.copies", locale)})</span> : <span class="text-base-content/40">{t("admin.db.ftp_disabled", locale)}</span>}
          </div>
        </div>
      </div>

      {/* Migration & Schema Tools */}
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body p-6">
          <h2 class="text-lg font-bold text-base-content flex items-center justify-between">
            <span>{t("admin.db.migrations", locale)}</span>
            {!isUpToDate && (
              <button
                hx-post="/dashboard/admin/database/migrate"
                hx-target="#db-feedback"
                class="btn btn-warning btn-sm"
              >
                {t("admin.db.run_migrations", locale)}
              </button>
            )}
          </h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-base-200/50 rounded-lg p-4 text-sm space-y-2">
              <div class="font-semibold text-base-content">CLI Commands:</div>
              <div class="font-mono text-xs bg-base-300 p-2.5 rounded text-base-content select-all space-y-1">
                <div>bun run migration</div>
                <div>bun run seeding full</div>
              </div>
            </div>
            <div class="bg-base-200/50 rounded-lg p-4 text-sm space-y-2">
              <div class="font-semibold text-base-content">{t("admin.db.tables_title", locale)}:</div>
              <div class="text-xs text-base-content/70">
                {t("admin.report.table", locale)}: <strong>{formatLocalizedNumber(stats.tables.length, locale)}</strong> | {t("admin.db.rows_count", locale)}: <strong>{formatLocalizedNumber(stats.tables.reduce((acc, t) => acc + t.rowCount, 0), locale)}</strong>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                {stats.tables.map((tbl) => (
                  <span key={tbl.name} class="badge badge-neutral badge-sm font-mono">
                    {tbl.name}: {formatLocalizedNumber(tbl.rowCount, locale)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Data Portability */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div>
              <h2 class="text-lg font-bold text-base-content">{t("admin.db.export_title", locale)}</h2>
              <p class="text-xs text-base-content/60">{t("admin.db.export_desc", locale)}</p>
            </div>
            <div class="flex flex-col gap-2">
              <a href="/dashboard/admin/database/export?format=sql" class="btn btn-outline btn-sm justify-between">
                <span>{t("admin.db.export_sql", locale)}</span>
                <DownloadIcon class="w-4 h-4" />
              </a>
              <a href="/dashboard/admin/database/export?format=json" class="btn btn-outline btn-sm justify-between">
                <span>{t("admin.db.export_json", locale)}</span>
                <DownloadIcon class="w-4 h-4" />
              </a>
              <a href="/dashboard/admin/database/export?format=sqlite" class="btn btn-outline btn-sm justify-between">
                <span>{t("admin.db.export_sqlite", locale)}</span>
                <DownloadIcon class="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div>
              <h2 class="text-lg font-bold text-base-content">{t("admin.db.backup_title", locale)}</h2>
              <p class="text-xs text-base-content/60">{t("admin.db.backup_desc", locale)}</p>
            </div>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between items-center py-1 border-b border-base-200">
                <span class="text-base-content/70">{t("admin.db.daily_schedule", locale)}:</span>
                <span class="font-mono font-medium">{formatLocalizedNumber(stats.backupTime, locale)}</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-base-200">
                <span class="text-base-content/70">{t("admin.db.ftp_mirroring", locale)}:</span>
                <span class={stats.ftpConfigured ? "badge badge-success badge-sm" : "badge badge-ghost badge-sm"}>
                  {stats.ftpConfigured ? t("admin.db.ftp_configured", locale) : t("admin.db.ftp_disabled", locale)}
                </span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-base-200">
                <span class="text-base-content/70">{t("admin.db.ftp_retention", locale)}:</span>
                <span class="font-mono">{formatLocalizedNumber(stats.ftpRetention, locale)} {t("admin.db.copies", locale)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
