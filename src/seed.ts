import { database } from "./lib/database";
import { seedSampleData } from "./lib/seed";
import { initializeDatabase as initAuthModule } from "./modules/auth";
import { initializeEventsDatabase as initEventsModule } from "./modules/events";
import { initializeLandingDatabase as initLandingModule } from "./modules/landing";
import { initializeMailerDatabase as initMailerModule } from "./modules/mailer";

await initAuthModule(database, { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
initEventsModule(database);
initLandingModule(database);
initMailerModule(database);
await seedSampleData(database);
console.log("CobraDecision database seeded.");
