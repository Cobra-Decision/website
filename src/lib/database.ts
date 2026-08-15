import { Database } from "bun:sqlite";

export const database = new Database(process.env.DATABASE_PATH ?? "app.sqlite");

// Memory and performance pragmas
database.run("PRAGMA journal_mode = WAL;");
database.run("PRAGMA synchronous = NORMAL;");
database.run("PRAGMA cache_size = -8000;"); // 8MB cache limit
database.run("PRAGMA temp_store = MEMORY;");
database.run("PRAGMA busy_timeout = 5000;");

