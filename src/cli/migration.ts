import { database } from "../lib/database";
import { runMigrations, getAppliedMigrations, getCurrentVersion, migrations } from "../lib/database/migration";

const args = process.argv.slice(2);
const command = args[0] || "up";

function printReport(title: string, data: { currentVersion: number; appliedCount?: number }) {
  console.log(`\n========================================`);
  console.log(` 🚀 Database Migration Engine Report`);
  console.log(`========================================`);
  console.log(` Status:           ${title}`);
  console.log(` Current Version:  v${data.currentVersion} / v${Math.max(...migrations.map((m) => m.version), 0)}`);
  if (data.appliedCount !== undefined) {
    console.log(` Migrations Run:   ${data.appliedCount}`);
  }
  console.log(` Database:         ${process.env.DATABASE_PATH ?? "data/app.sqlite"}`);
  console.log(`========================================\n`);
}

if (command === "status") {
  const current = getCurrentVersion(database);
  const applied = getAppliedMigrations(database);
  console.log("\nApplied Migrations:");
  if (applied.length === 0) {
    console.log(" (None)");
  } else {
    for (const m of applied) {
      console.log(`  - [v${m.version}] ${m.name} (applied: ${m.applied_at})`);
    }
  }

  const pending = migrations.filter((m) => m.version > current);
  console.log("\nPending Migrations:");
  if (pending.length === 0) {
    console.log(" (Up to date)");
  } else {
    for (const m of pending) {
      console.log(`  - [v${m.version}] ${m.name}`);
    }
  }

  printReport("Checked Status", { currentVersion: current });
  process.exit(0);
}

try {
  let targetVersion: number | undefined;
  const toArg = args.find((a) => a.startsWith("--to="));
  if (toArg) {
    targetVersion = parseInt(toArg.split("=")[1], 10);
  }

  const result = await runMigrations(database, { targetVersion });
  if (result.applied.length === 0) {
    console.log(`Database is already at latest version (v${result.currentVersion}).`);
  } else {
    console.log(`Successfully applied ${result.applied.length} migration(s):`);
    for (const step of result.applied) {
      console.log(`  ✓ [v${step.version}] ${step.name}`);
    }
  }
  printReport("Migration Completed", {
    currentVersion: result.currentVersion,
    appliedCount: result.applied.length,
  });
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}
