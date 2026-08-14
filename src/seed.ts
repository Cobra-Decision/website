import { database } from "./lib/database";
import { seedSampleData } from "./lib/seed";
import { initializeDatabase } from "./modules/auth/database";
import { initializeEventsDatabase } from "./modules/events/database";
import { initializeLandingDatabase } from "./modules/landing/database";

await initializeDatabase(database, { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
initializeEventsDatabase(database);
initializeLandingDatabase(database);
await seedSampleData(database);
console.log("CobraDecision database seeded.");
