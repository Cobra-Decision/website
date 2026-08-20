import { database } from "../lib/database";
import { runMigrations } from "../lib/database/migration";
import {
  seedRoles,
  seedEndpoints,
  seedTags,
  seedUsers,
  seedMeets,
  seedMailer,
  seedFull,
  type SeedReport,
} from "../lib/database/seeding";

// Ensure schema is up to date before seeding
await runMigrations(database);

const args = process.argv.slice(2);
const feature = (args[0] || "full").toLowerCase().trim();

function printSeedReport(featureTarget: string, report: SeedReport) {
  console.log(`\n========================================`);
  console.log(` Database Seeding Report: [${featureTarget.toUpperCase()}]`);
  console.log(`========================================`);
  console.log(` Target Feature:   ${featureTarget}`);
  console.log(` Database:         ${process.env.DATABASE_PATH ?? "data/app.sqlite"}`);
  console.log(`----------------------------------------`);
  console.log(` Feature       | Table             | Created | Updated | Skipped`);
  console.log(`---------------+-------------------+---------+---------+--------`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const [feat, items] of Object.entries(report)) {
    for (const item of items) {
      totalCreated += item.created;
      totalUpdated += item.updated;
      totalSkipped += item.skipped;
      const featStr = feat.padEnd(13, " ");
      const tableStr = item.table.padEnd(17, " ");
      const cStr = String(item.created).padStart(7, " ");
      const uStr = String(item.updated).padStart(7, " ");
      const sStr = String(item.skipped).padStart(6, " ");
      console.log(` ${featStr} | ${tableStr} | ${cStr} | ${uStr} | ${sStr}`);
    }
  }

  console.log(`----------------------------------------`);
  console.log(` TOTALS:       | Created: ${totalCreated} | Updated: ${totalUpdated} | Skipped: ${totalSkipped}`);
  console.log(`========================================\n`);
}

try {
  let report: SeedReport = {};

  switch (feature) {
    case "roles":
    case "role":
      report = await seedRoles(database);
      break;
    case "endpoints":
    case "endpoint":
    case "permissions":
      report = await seedEndpoints(database);
      break;
    case "tags":
    case "tag":
    case "platforms":
      report = await seedTags(database);
      break;
    case "users":
    case "user":
      report = await seedUsers(database);
      break;
    case "meets":
    case "meet":
    case "events":
      report = await seedMeets(database);
      break;
    case "mailer":
    case "emails":
    case "templates":
      report = await seedMailer(database);
      break;
    case "full":
    case "all":
    default:
      report = await seedFull(database);
      break;
  }

  printSeedReport(feature, report);
} catch (error) {
  console.error("Seeding failed:", error);
  process.exit(1);
}
