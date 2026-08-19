import type { Database } from "bun:sqlite";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export function initializeEventsDatabase(database: Database) {
  database.exec(schema);
}

export * from "./queries";
