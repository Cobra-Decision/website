import { describe, expect, it } from "bun:test";
import { Table, TableRow, TableCell } from "./table";

describe("Unified Table Component", () => {
  it("renders empty state correctly", () => {
    const html = (
      <Table
        columns={[{ header: "Col 1" }, { header: "Col 2" }]}
        empty={true}
        emptyMessage="No data available"
      />
    ).toString();

    expect(html).toContain("No data available");
    expect(html).toContain('colSpan="2"');
  });

  it("renders sortable headers with Alpine.js handlers and row content", () => {
    const html = (
      <Table
        columns={[
          { header: "Name", sortable: true },
          { header: "Count", sortable: true, type: "number" },
          { header: "Actions" },
        ]}
      >
        <TableRow id="row-1">
          <TableCell sortVal="Alpha">Alpha</TableCell>
          <TableCell sortVal={10}>10</TableCell>
          <TableCell>Edit</TableCell>
        </TableRow>
      </Table>
    ).toString();

    expect(html).toContain("x-data=");
    expect(html).toContain("sortBy(0, &#39;text&#39;)");
    expect(html).toContain("sortBy(1, &#39;number&#39;)");
    expect(html).toContain("data-table-row");
    expect(html).toContain('data-sort-val="Alpha"');
    expect(html).toContain('data-sort-val="10"');
  });
});
