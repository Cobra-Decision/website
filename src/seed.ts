import { database } from "./lib/database";
import { runMigrations } from "./lib/database/migration";
import { seedFull } from "./lib/database/seeding";

await runMigrations(database);
await seedFull(database);
console.log("CobraDecision database migrated and seeded successfully.");
