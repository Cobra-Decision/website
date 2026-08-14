import type { Database } from "bun:sqlite";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export function initializeEventsDatabase(database: Database) {
  database.exec(schema);
  if (!database.query("SELECT 1 FROM pragma_table_info('meets') WHERE name='description'").get()) database.exec("ALTER TABLE meets ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  if (!database.query("SELECT 1 FROM pragma_table_info('meets') WHERE name='scheduled_at_utc'").get()) database.exec("ALTER TABLE meets ADD COLUMN scheduled_at_utc TEXT");
  database.exec("UPDATE meets SET scheduled_at_utc=datetime(scheduled_date || ' ' || scheduled_time, '-3 hours', '-30 minutes') || '.000Z' WHERE scheduled_at_utc IS NULL");
}
