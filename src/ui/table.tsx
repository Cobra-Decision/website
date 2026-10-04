import type { Child } from "hono/jsx";

export interface TableColumn {
  header: Child;
  key?: string;
  sortable?: boolean;
  type?: "text" | "number";
  class?: string;
}

export interface TableProps {
  columns: TableColumn[];
  children?: Child;
  id?: string;
  class?: string;
  tableClass?: string;
  empty?: boolean;
  emptyMessage?: Child;
  [key: string]: any;
}

export interface TableRowProps {
  children?: Child;
  id?: string;
  class?: string;
  [key: string]: any;
}

export interface TableCellProps {
  children?: Child;
  sortVal?: string | number | null;
  class?: string;
  colSpan?: number;
  [key: string]: any;
}

/**
 * Unified Table component with built-in client-side sorting and responsive styling.
 */
export function Table({
  columns,
  children,
  id,
  class: containerClass = "",
  tableClass = "",
  empty = false,
  emptyMessage = "No records found.",
  ...props
}: TableProps) {
  const hasSortable = columns.some((c) => c.sortable);

  return (
    <div
      id={id}
      class={`overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm ${containerClass}`}
      {...(hasSortable
        ? {
            "x-data": `{
              sortCol: null,
              sortAsc: true,
              sortBy(colIdx, type) {
                if (this.sortCol === colIdx) {
                  this.sortAsc = !this.sortAsc;
                } else {
                  this.sortCol = colIdx;
                  this.sortAsc = true;
                }
                const tbody = this.$refs.tableBody;
                if (!tbody) return;
                const rows = Array.from(tbody.querySelectorAll('tr[data-table-row]'));
                const factor = this.sortAsc ? 1 : -1;
                rows.sort((a, b) => {
                  const cellA = a.children[colIdx];
                  const cellB = b.children[colIdx];
                  const valA = (cellA?.getAttribute('data-sort-val') ?? cellA?.textContent ?? '').trim();
                  const valB = (cellB?.getAttribute('data-sort-val') ?? cellB?.textContent ?? '').trim();
                  if (type === 'number') {
                    return ((parseFloat(valA) || 0) - (parseFloat(valB) || 0)) * factor;
                  }
                  return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * factor;
                });
                rows.forEach(r => tbody.appendChild(r));
              }
            }`,
          }
        : {})}
      {...props}
    >
      <table class={`table table-zebra table-sm w-full ${tableClass}`}>
        <thead class="bg-base-200/50 text-xs font-semibold uppercase tracking-wider text-base-content/70">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} class={`whitespace-nowrap ${col.class ?? ""}`}>
                {col.sortable ? (
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs -ms-2 font-semibold uppercase tracking-wider flex items-center gap-1"
                    x-on:click={`sortBy(${idx}, '${col.type ?? "text"}')`}
                  >
                    <span>{col.header}</span>
                    <span
                      class="text-xs font-mono opacity-70"
                      x-text={`sortCol === ${idx} ? (sortAsc ? ' ↑' : ' ↓') : ' ↕'`}
                    ></span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody x-ref="tableBody">
          {empty ? (
            <tr>
              <td colSpan={columns.length} class="text-center py-8 text-base-content/50 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({
  children,
  id,
  class: rowClass = "",
  ...props
}: TableRowProps) {
  return (
    <tr id={id} data-table-row class={`hover ${rowClass}`} {...props}>
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  sortVal,
  class: cellClass = "",
  ...props
}: TableCellProps) {
  return (
    <td
      class={cellClass}
      {...(sortVal !== undefined && sortVal !== null ? { "data-sort-val": String(sortVal) } : {})}
      {...props}
    >
      {children}
    </td>
  );
}
