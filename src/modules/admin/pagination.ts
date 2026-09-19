export interface PaginationState {
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
  totalCount: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function parsePaginationParams(
  query: Record<string, string | undefined> = {},
  defaultLimit = 10
): { page: number; limit: number; offset: number } {
  const rawPage = Number.parseInt(String(query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(query.limit ?? defaultLimit), 10);

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? defaultLimit : Math.min(rawLimit, 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function calculatePagination(totalCount: number, page: number, limit: number): PaginationState {
  const safeTotal = Math.max(0, totalCount);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * limit;

  return {
    page: safePage,
    limit,
    offset,
    totalPages,
    totalCount: safeTotal,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function buildPaginationUrl(
  baseUrl: string,
  page: number,
  query: Record<string, string | undefined> = {}
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "" && key !== "page") {
      params.set(key, value);
    }
  }
  params.set("page", String(page));
  return `${baseUrl}?${params.toString()}`;
}
