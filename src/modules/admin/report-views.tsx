import type { Database } from "bun:sqlite";

type SchemaRow = { table_name: string; name: string; type: string; notnull: number; dflt_value: string | null; pk: number };
const fields = ["table_name", "name", "type", "notnull", "dflt_value", "pk"] as const;
type SchemaField = typeof fields[number];

export function SchemaTable({ database, query = {} }: { database: Database; query?: Record<string, string> }) {
  const tables = database.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const rows = tables.flatMap(({ name }) => database.query<Omit<SchemaRow, "table_name">, []>(`SELECT * FROM pragma_table_info('${name.replaceAll("'", "''")}')`).all().map((row) => ({ ...row, table_name: name })));
  const field = fields.includes(query.schema_field as SchemaField) ? query.schema_field as SchemaField : "table_name";
  const sort = fields.includes(query.schema_sort as SchemaField) ? query.schema_sort as SchemaField : "table_name";
  const direction = query.schema_direction === "desc" ? "desc" : "asc";
  const q = query.schema_q?.trim().toLowerCase() ?? "";
  const filtered = rows.filter((row) => !q || String(row[field] ?? "").toLowerCase().includes(q)).sort((a, b) => {
    const left = String(a[sort] ?? "").toLowerCase(); const right = String(b[sort] ?? "").toLowerCase();
    return (left === right ? 0 : left < right ? -1 : 1) * (direction === "asc" ? 1 : -1);
  });
  const url = (column: SchemaField) => `/dashboard/admin/report?schema_q=${encodeURIComponent(query.schema_q ?? "")}&schema_field=${encodeURIComponent(field)}&schema_sort=${column}&schema_direction=${sort === column && direction === "asc" ? "desc" : "asc"}`;

  return (
    <div id="schema-table" class="space-y-4">
      <form class="flex flex-wrap items-end gap-3" hx-get="/dashboard/admin/report" hx-target="#schema-table" hx-swap="outerHTML">
        <label class="form-control">
          <span class="label-text text-xs font-medium">Search Field</span>
          <select class="select select-bordered select-sm" name="schema_field">
            {fields.map((name) => (
              <option value={name} selected={field === name}>
                {name === "table_name" ? "Table" : name === "name" ? "Column" : name.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label class="form-control min-w-52 flex-1">
          <span class="label-text text-xs font-medium">Search Schema</span>
          <input class="input input-bordered input-sm" name="schema_q" value={query.schema_q ?? ""} placeholder="Filter tables or columns..." />
        </label>
        <button class="btn btn-primary btn-sm">Search</button>
        <a class="btn btn-ghost btn-sm" href="/dashboard/admin/report">Reset</a>
      </form>

      <div class="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <table class="table table-zebra table-sm">
          <thead class="bg-base-200/50 text-xs font-semibold uppercase tracking-wider text-base-content/70">
            <tr>
              {fields.map((name) => (
                <th key={name}>
                  <button type="button" class="btn btn-ghost btn-xs -ml-2 font-semibold uppercase tracking-wider" hx-get={url(name)} hx-target="#schema-table" hx-swap="outerHTML">
                    {name === "table_name" ? "Table" : name === "name" ? "Column" : name.replaceAll("_", " ")}
                    {sort === name ? direction === "asc" ? " ↑" : " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((row) => (
                <tr key={`${row.table_name}.${row.name}`} class="hover">
                  <td class="font-mono font-medium text-xs text-primary">{row.table_name}</td>
                  <td class="font-mono text-xs">{row.name}</td>
                  <td><code class="rounded bg-base-300 px-1.5 py-0.5 text-xs text-secondary font-mono">{row.type || "ANY"}</code></td>
                  <td>{row.notnull ? <span class="badge badge-error badge-xs font-semibold">NOT NULL</span> : <span class="text-base-content/40 text-xs">Nullable</span>}</td>
                  <td class="font-mono text-xs">{row.dflt_value ?? <span class="text-base-content/40">—</span>}</td>
                  <td>{row.pk ? <span class="badge badge-primary badge-xs font-semibold">PK</span> : ""}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={fields.length} class="py-8 text-center text-sm text-base-content/60">
                  No matching schema columns found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
