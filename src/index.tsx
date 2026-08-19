import { createApp } from "./app";
import { database } from "./lib/database";
import { runMigrations } from "./lib/database/migration";
import { seedEndpoints } from "./lib/database/seeding";
import { initializeDatabase as initAuthModule, createAltcha } from "./modules/auth";
import { initializeEventsDatabase as initEventsModule } from "./modules/events";
import { initializeLandingDatabase as initLandingModule } from "./modules/landing";
import { initializeMailerDatabase as initMailerModule, startMailerScheduler } from "./modules/mailer";
import { startDailyBackupScheduler } from "./lib/backup/scheduler";
import { initCache } from "./lib/cache";

// Ensure latest schema version is applied
await runMigrations(database);
await seedEndpoints(database);

await initAuthModule(database, {
  email: process.env.SEED_ADMIN_EMAIL,
  password: process.env.SEED_ADMIN_PASSWORD,
});
initEventsModule(database);
initLandingModule(database);
initMailerModule(database);
initCache(database);
startMailerScheduler(database);
startDailyBackupScheduler(database);

export const app = createApp({ database, captcha: await createAltcha() });

export default { port: 3000, fetch: app.fetch };
