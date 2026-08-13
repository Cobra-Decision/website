import type { Database } from "bun:sqlite";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export function initializeEventsDatabase(database: Database) {
  database.exec(schema);
  if (!database.query("SELECT 1 FROM pragma_table_info('meets') WHERE name='description'").get()) database.exec("ALTER TABLE meets ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}
