import { describe, expect, it } from "bun:test";
import { calculatePagination, parsePaginationParams, buildPaginationUrl } from "./pagination";

describe("Admin Pagination Helper", () => {
  it("parses query parameters with safe defaults", () => {
    expect(parsePaginationParams({})).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(parsePaginationParams({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, offset: 20 });
    expect(parsePaginationParams({ page: "-5", limit: "0" })).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(parsePaginationParams({ page: "invalid" })).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it("calculates pagination state correctly", () => {
    const state = calculatePagination(35, 2, 10);
    expect(state).toEqual({
      page: 2,
      limit: 10,
      offset: 10,
      totalPages: 4,
      totalCount: 35,
      hasPrev: true,
      hasNext: true,
    });
  });

  it("handles empty and boundary counts", () => {
    const empty = calculatePagination(0, 1, 10);
    expect(empty.totalPages).toBe(1);
    expect(empty.hasPrev).toBe(false);
    expect(empty.hasNext).toBe(false);

    const firstPage = calculatePagination(10, 1, 10);
    expect(firstPage.totalPages).toBe(1);
    expect(firstPage.hasPrev).toBe(false);
    expect(firstPage.hasNext).toBe(false);
  });

  it("builds URL preserving existing query parameters", () => {
    const url = buildPaginationUrl("/dashboard/admin/users", 3, {
      q: "ali",
      search_field: "email",
      sort: "created_at",
      direction: "desc",
    });
    expect(url).toContain("/dashboard/admin/users?");
    expect(url).toContain("page=3");
    expect(url).toContain("q=ali");
    expect(url).toContain("search_field=email");
    expect(url).toContain("sort=created_at");
    expect(url).toContain("direction=desc");
  });
});
