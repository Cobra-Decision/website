import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Database } from "bun:sqlite";

export interface BackupOptions {
  localDir?: string;
  prefix?: string;
}

export async function createLocalDatabaseBackup(
  db: Database,
  options: BackupOptions = {}
): Promise<{ filePath: string; fileName: string; sizeBytes: number; timestamp: string }> {
  const localDir = options.localDir ?? process.env.BACKUP_LOCAL_DIR ?? "./backups";
  await mkdir(localDir, { recursive: true });

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${randomSuffix}`;
  const fileName = `backup-${timestamp}.sqlite`;
  const filePath = join(localDir, fileName);

  // SQLite VACUUM INTO creates an exact, consistent snapshot
  db.run(`VACUUM INTO '${filePath.replace(/'/g, "''")}';`);

  const file = Bun.file(filePath);
  const sizeBytes = file.size;

  return { filePath, fileName, sizeBytes, timestamp };
}

export function exportDatabaseAsSql(db: Database): string {
  const tables = db.query<{ name: string; sql: string }, []>(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_migrations' ORDER BY name ASC"
  ).all();

  const lines: string[] = [
    "-- CobraDecision Database SQL Dump",
    `-- Generated: ${new Date().toISOString()}`,
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
  ];

  for (const table of tables) {
    if (!table.sql) continue;
    lines.push(`\n-- Table: ${table.name}`);
    const createSql = table.sql.replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
    lines.push(`${createSql};`);

    const rows = db.query(`SELECT * FROM "${table.name}"`).all() as Record<string, any>[];
    for (const row of rows) {
      const keys = Object.keys(row);
      if (keys.length === 0) continue;
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const vals = keys
        .map((k) => {
          const v = row[k];
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "number") return v;
          return `'${String(v).replace(/'/g, "''")}'`;
        })
        .join(", ");
      lines.push(`INSERT OR REPLACE INTO "${table.name}" (${cols}) VALUES (${vals});`);
    }
  }

  lines.push("\nCOMMIT;");
  lines.push("PRAGMA foreign_keys = ON;");
  return lines.join("\n");
}

export function exportDatabaseAsJson(db: Database): string {
  const tables = db.query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
  ).all();

  const dump: Record<string, any> = {
    meta: {
      version: 1,
      exportedAt: new Date().toISOString(),
    },
    tables: {} as Record<string, any[]>,
  };

  for (const { name } of tables) {
    dump.tables[name] = db.query(`SELECT * FROM "${name}"`).all();
  }

  return JSON.stringify(dump, null, 2);
}

export async function importDatabaseFromJson(db: Database, jsonString: string): Promise<{ tablesImported: string[]; totalRows: number }> {
  const data = JSON.parse(jsonString);
  if (!data || !data.tables) {
    throw new Error("Invalid backup JSON format: missing 'tables' payload");
  }

  let totalRows = 0;
  const tablesImported: string[] = [];

  db.run("PRAGMA foreign_keys = OFF;");
  db.run("BEGIN TRANSACTION;");

  try {
    for (const [tableName, rows] of Object.entries(data.tables as Record<string, any[]>)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        const keys = Object.keys(row);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => row[k]);
        db.run(`INSERT OR REPLACE INTO "${tableName}" (${cols}) VALUES (${placeholders})`, values);
        totalRows++;
      }
      tablesImported.push(tableName);
    }
    db.run("COMMIT;");
    db.run("PRAGMA foreign_keys = ON;");
  } catch (err) {
    db.run("ROLLBACK;");
    db.run("PRAGMA foreign_keys = ON;");
    throw err;
  }

  return { tablesImported, totalRows };
}

export async function importDatabaseFromSql(db: Database, sqlString: string): Promise<void> {
  db.run("PRAGMA foreign_keys = OFF;");
  try {
    db.exec(sqlString);
    db.run("PRAGMA foreign_keys = ON;");
  } catch (err) {
    db.run("PRAGMA foreign_keys = ON;");
    throw err;
  }
}
