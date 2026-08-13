import type { Database } from "bun:sqlite";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export function initializeLandingDatabase(database: Database) {
  database.exec(schema);
}
