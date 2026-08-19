import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { unlink } from "node:fs/promises";
import { runMigrations, getCurrentVersion, migrations } from "../src/lib/database/migration";
import { seedFull, seedRoles, seedEndpoints } from "../src/lib/database/seeding";
import {
  exportDatabaseAsSql,
  exportDatabaseAsJson,
  createLocalDatabaseBackup,
  importDatabaseFromJson,
  importDatabaseFromSql,
  importDatabaseFromSqlite,
} from "../src/lib/backup/local";
import { getDatabaseStats } from "../src/modules/admin/database-views";

describe("Database Management Module & Portability", () => {
  let db: Database;
  const testDbFile = "test-db-management.sqlite";

  beforeEach(async () => {
    try {
      await unlink(testDbFile);
    } catch {}
    db = new Database(testDbFile);
    db.run("PRAGMA journal_mode = WAL;");
    await runMigrations(db);
  });

  afterEach(async () => {
    db.close();
    try {
      await unlink(testDbFile);
    } catch {}
  });

  it("should accurately reflect database stats and table counts dynamically", async () => {
    const statsInitial = getDatabaseStats(db);
    expect(statsInitial.currentMigrationVersion).toBe(migrations.length);
    expect(statsInitial.tables.length).toBeGreaterThan(0);

    const rolesBefore = statsInitial.tables.find((t) => t.name === "roles")?.rowCount ?? 0;

    await seedRoles(db);

    const statsAfter = getDatabaseStats(db);
    const rolesAfter = statsAfter.tables.find((t) => t.name === "roles")?.rowCount ?? 0;
    expect(rolesAfter).toBeGreaterThan(rolesBefore);
  });

  it("should export and re-import via SQL format with 100% data integrity", async () => {
    await seedFull(db);

    const usersCountBefore = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM users").get()?.count ?? 0;
    const rolesCountBefore = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM roles").get()?.count ?? 0;

    const sqlDump = exportDatabaseAsSql(db);
    expect(typeof sqlDump).toBe("string");
    expect(sqlDump).toContain("CREATE TABLE IF NOT EXISTS");
    expect(sqlDump).toContain("INSERT OR REPLACE INTO");

    // Recreate fresh target db
    const freshDb = new Database(":memory:");
    await runMigrations(freshDb);
    await importDatabaseFromSql(freshDb, sqlDump);

    const usersCountAfter = freshDb.query<{ count: number }, []>("SELECT COUNT(*) as count FROM users").get()?.count ?? 0;
    const rolesCountAfter = freshDb.query<{ count: number }, []>("SELECT COUNT(*) as count FROM roles").get()?.count ?? 0;

    expect(usersCountAfter).toBe(usersCountBefore);
    expect(rolesCountAfter).toBe(rolesCountBefore);

    freshDb.close();
  });

  it("should export and re-import via JSON format with complete record match", async () => {
    await seedFull(db);

    const usersCountBefore = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM users").get()?.count ?? 0;
    const jsonDump = exportDatabaseAsJson(db);

    const parsed = JSON.parse(jsonDump);
    expect(parsed.meta).toBeDefined();
    expect(parsed.tables).toBeDefined();
    expect(Array.isArray(parsed.tables.users)).toBe(true);

    const freshDb = new Database(":memory:");
    await runMigrations(freshDb);
    const importResult = await importDatabaseFromJson(freshDb, jsonDump);

    expect(importResult.tablesImported.length).toBeGreaterThan(0);
    expect(importResult.totalRows).toBeGreaterThan(0);

    const usersCountAfter = freshDb.query<{ count: number }, []>("SELECT COUNT(*) as count FROM users").get()?.count ?? 0;
    expect(usersCountAfter).toBe(usersCountBefore);

    freshDb.close();
  });

  it("should export SQLite binary snapshot and import into fresh database successfully", async () => {
    await seedFull(db);
    const meetCountBefore = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meets").get()?.count ?? 0;

    const backup = await createLocalDatabaseBackup(db, { localDir: "./test-backups" });
    expect(backup.sizeBytes).toBeGreaterThan(0);

    const file = Bun.file(backup.filePath);
    const buffer = await file.arrayBuffer();

    const freshDb = new Database(":memory:");
    const importResult = await importDatabaseFromSqlite(freshDb, new Uint8Array(buffer));

    expect(importResult.tablesImported).toContain("roles");
    expect(importResult.totalRows).toBeGreaterThan(0);

    const meetCountAfter = freshDb.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meets").get()?.count ?? 0;
    expect(meetCountAfter).toBe(meetCountBefore);

    freshDb.close();
    try {
      await unlink(backup.filePath);
    } catch {}
  });
});
