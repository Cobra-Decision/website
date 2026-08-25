import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations, getCurrentVersion, getAppliedMigrations } from "./migration";
import { seedRoles, seedEndpoints, seedTags, seedUsers, seedMeets, seedMailer, seedFull } from "./seeding";
import { exportDatabaseAsSql, exportDatabaseAsJson, importDatabaseFromJson, importDatabaseFromSql, createLocalDatabaseBackup } from "../backup/local";
import { executeBackup } from "../backup/scheduler";

test("Database migration engine runs sequentially and tracks versions", async () => {
  const db = new Database(":memory:");
  expect(getCurrentVersion(db)).toBe(0);

  const res = await runMigrations(db);
  expect(res.applied.length).toBe(7);
  expect(res.currentVersion).toBe(7);
  expect(getCurrentVersion(db)).toBe(7);

  const applied = getAppliedMigrations(db);
  expect(applied.length).toBe(7);
  expect(applied[0].name).toBe("001_core_auth_schema");

  // Re-run migration should be no-op
  const secondRun = await runMigrations(db);
  expect(secondRun.applied.length).toBe(0);
});

test("Modular feature seeding handles dependencies and creates records", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);

  // Seed roles
  const roleReport = await seedRoles(db);
  expect(roleReport.roles[0].created).toBe(3);

  // Seed endpoints
  const endpointReport = await seedEndpoints(db);
  expect(endpointReport.endpoints.some((r) => r.table === "endpoints")).toBe(true);

  // Seed users (prerequisite roles automatically ensured)
  const userReport = await seedUsers(db);
  expect(userReport.users.some((r) => r.table === "users")).toBe(true);

  // Seed tags
  const tagReport = await seedTags(db);
  expect(tagReport.tags.some((r) => r.table === "tags")).toBe(true);

  // Seed meets (links meet_tags and meet_attendees)
  const meetReport = await seedMeets(db);
  expect(meetReport.meets.some((r) => r.table === "meets")).toBe(true);
  const createdMeets = db.query("SELECT COUNT(*) as c FROM meets").get() as { c: number };
  expect(createdMeets.c).toBeGreaterThan(0);

  // Seed mailer
  const mailReport = await seedMailer(db);
  expect(mailReport.mailer.some((r) => r.table === "emails_schema")).toBe(true);
});

test("Full seed works idempotently", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);

  const report1 = await seedFull(db);
  expect(Object.keys(report1).length).toBeGreaterThan(0);

  // Second run should skip / not duplicate unique entities
  const report2 = await seedFull(db);
  const totalCreatedSecond = Object.values(report2).flat().reduce((acc, r) => acc + r.created, 0);
  expect(totalCreatedSecond).toBe(0);
});

test("Export and Import SQL & JSON dumps preserve data", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  await seedTags(db);

  // JSON Export & Import Test
  const jsonExport = exportDatabaseAsJson(db);
  expect(jsonExport).toContain("roles");
  expect(jsonExport).toContain("tags");

  const newDbJson = new Database(":memory:");
  await runMigrations(newDbJson);
  const jsonImportRes = await importDatabaseFromJson(newDbJson, jsonExport);
  expect(jsonImportRes.tablesImported.length).toBeGreaterThan(0);

  // SQL Export & Import Test
  const sqlExport = exportDatabaseAsSql(db);
  expect(sqlExport).toContain("INTO \"roles\"");

  const newDbSql = new Database(":memory:");
  await runMigrations(newDbSql);
  await importDatabaseFromSql(newDbSql, sqlExport);

  const roleCount = newDbSql.query<{ count: number }, []>("SELECT COUNT(*) as count FROM roles").get();
  expect(roleCount?.count).toBe(3);
});

test("Local database backup snapshots execute atomically", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);

  const backupRes = await createLocalDatabaseBackup(db, { localDir: "./backups" });
  expect(backupRes.fileName).toMatch(/^backup-\d+-\d+-[a-z0-9]+\.sqlite$/);
  expect(backupRes.sizeBytes).toBeGreaterThan(0);

  const backupDb = new Database(backupRes.filePath);
  const roles = backupDb.query("SELECT COUNT(*) as c FROM roles").get() as { c: number };
  expect(roles.c).toBe(3);
  backupDb.close();

  // Test full execution helper with unique filename
  const execRes = await executeBackup(db);
  expect(execRes.success).toBe(true);
  expect(execRes.localFile).toBeTruthy();
});
