import { createApp } from "./app";
import { database } from "./lib/database";
import { initializeDatabase as initAuthModule, createAltcha } from "./modules/auth";
import { initializeEventsDatabase as initEventsModule } from "./modules/events";
import { initializeLandingDatabase as initLandingModule } from "./modules/landing";
import { initializeMailerDatabase as initMailerModule, startMailerScheduler } from "./modules/mailer";
import { initCache } from "./lib/cache";

await initAuthModule(database, {
  email: process.env.SEED_ADMIN_EMAIL,
  password: process.env.SEED_ADMIN_PASSWORD,
});
initEventsModule(database);
initLandingModule(database);
initMailerModule(database);
initCache(database);
startMailerScheduler(database);

export const app = createApp({ database, captcha: await createAltcha() });

export default { port: 3000, fetch: app.fetch };
