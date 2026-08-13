import { createApp } from "./app";
import { database } from "./lib/database";
import { initializeDatabase } from "./modules/auth/database";
import { createAltcha } from "./modules/auth/routes";
import { initializeEventsDatabase } from "./modules/events/database";

await initializeDatabase(database, {
  email: process.env.SEED_ADMIN_EMAIL,
  password: process.env.SEED_ADMIN_PASSWORD,
});
initializeEventsDatabase(database);

export const app = createApp({ database, captcha: await createAltcha() });

export default { port: 3000, fetch: app.fetch };
