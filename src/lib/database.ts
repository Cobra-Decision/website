import { Database } from "bun:sqlite";

export const database = new Database("app.sqlite");
