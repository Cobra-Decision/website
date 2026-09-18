import type { Database } from "bun:sqlite";

const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

export function initializeEventsDatabase(database: Database) {
  database.exec(schema);

  const defaultStatuses = [
    { id: "public", title: "Public", description: "Visible to all visitors" },
    { id: "private", title: "Private", description: "Visible only to Super Admins" },
    { id: "restricted", title: "Restricted", description: "Visible only to assigned users and Super Admins" },
  ];
  for (const s of defaultStatuses) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM meet_publish_status_types WHERE id = ?").get(s.id);
    if (!existing) {
      database.run("INSERT INTO meet_publish_status_types (id, title, description) VALUES (?, ?, ?)", [s.id, s.title, s.description]);
    }
  }
}

export * from "./queries";
