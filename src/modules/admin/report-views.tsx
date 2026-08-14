import type { Database } from "bun:sqlite";

type SchemaRow = { table_name: string; name: string; type: string; notnull: number; dflt_value: string | null; pk: number };

export function SchemaTable({ database }: { database: Database }) {
  const tables = database.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const rows = tables.flatMap(({ name }) => database.query<Omit<SchemaRow, "table_name">, []>(`SELECT * FROM pragma_table_info('${name}')`).all().map((row) => ({ ...row, table_name: name })));
  return <div class="overflow-x-auto rounded-box border border-base-300"><table class="table table-sm"><thead><tr><th>Table</th><th>Column</th><th>Type</th><th>Required</th><th>Default</th><th>Key</th></tr></thead><tbody>{rows.map((row) => <tr><td class="font-medium">{row.table_name}</td><td>{row.name}</td><td><code>{row.type}</code></td><td>{row.notnull ? "Yes" : "No"}</td><td>{row.dflt_value ?? "—"}</td><td>{row.pk ? "Primary" : ""}</td></tr>)}</tbody></table></div>;
}
