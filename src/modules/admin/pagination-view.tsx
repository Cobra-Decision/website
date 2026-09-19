import type { Locale } from "../../lib/i18n/translations";
import { formatLocalizedNumber } from "../../lib/i18n/context";
import { buildPaginationUrl, type PaginationState } from "./pagination";

export interface PaginationProps {
  state: PaginationState;
  resource: string;
  baseUrl: string;
  targetId: string;
  query?: Record<string, string | undefined>;
  locale?: Locale;
}

export function Pagination({
  state,
  resource: _resource,
  baseUrl,
  targetId,
  query = {},
  locale = "en",
}: PaginationProps) {
  const { page, totalPages, totalCount, limit, hasPrev, hasNext } = state;
  if (totalCount === 0) return null;

  const startEntry = (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, totalCount);

  // Generate visible page numbers (e.g. 1, 2, 3 ... with current in center)
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i);
  }

  const prevUrl = buildPaginationUrl(baseUrl, page - 1, query);
  const nextUrl = buildPaginationUrl(baseUrl, page + 1, query);
  const firstUrl = buildPaginationUrl(baseUrl, 1, query);
  const lastUrl = buildPaginationUrl(baseUrl, totalPages, query);

  return (
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-base-200">
      <div class="text-xs text-base-content/70">
        {locale === "fa" ? (
          <>
            نمایش{" "}
            <span class="font-semibold text-base-content font-mono">{formatLocalizedNumber(startEntry, locale)}</span> تا{" "}
            <span class="font-semibold text-base-content font-mono">{formatLocalizedNumber(endEntry, locale)}</span> از{" "}
            <span class="font-semibold text-base-content font-mono">{formatLocalizedNumber(totalCount, locale)}</span> مورد
          </>
        ) : (
          <>
            Showing{" "}
            <span class="font-semibold text-base-content font-mono">{startEntry}</span> to{" "}
            <span class="font-semibold text-base-content font-mono">{endEntry}</span> of{" "}
            <span class="font-semibold text-base-content font-mono">{totalCount}</span> entries
          </>
        )}
      </div>

      <div class="join shadow-sm border border-base-300">
        {/* First & Prev */}
        <button
          type="button"
          class={`join-item btn btn-sm ${!hasPrev ? "btn-disabled opacity-50" : ""}`}
          hx-get={hasPrev ? prevUrl : undefined}
          hx-target={`#${targetId}`}
          hx-swap="outerHTML"
          disabled={!hasPrev}
          aria-label="Previous Page"
        >
          {locale === "fa" ? "قبلی" : "Prev"}
        </button>

        {range[0] > 1 && (
          <>
            <button
              type="button"
              class={`join-item btn btn-sm ${page === 1 ? "btn-active font-bold" : ""}`}
              hx-get={firstUrl}
              hx-target={`#${targetId}`}
              hx-swap="outerHTML"
            >
              {formatLocalizedNumber(1, locale)}
            </button>
            {range[0] > 2 && <button type="button" class="join-item btn btn-sm btn-disabled">...</button>}
          </>
        )}

        {range.map((p) => (
          <button
            key={p}
            type="button"
            class={`join-item btn btn-sm ${page === p ? "btn-active btn-primary font-bold" : ""}`}
            hx-get={buildPaginationUrl(baseUrl, p, query)}
            hx-target={`#${targetId}`}
            hx-swap="outerHTML"
          >
            {formatLocalizedNumber(p, locale)}
          </button>
        ))}

        {range[range.length - 1] < totalPages && (
          <>
            {range[range.length - 1] < totalPages - 1 && <button type="button" class="join-item btn btn-sm btn-disabled">...</button>}
            <button
              type="button"
              class={`join-item btn btn-sm ${page === totalPages ? "btn-active font-bold" : ""}`}
              hx-get={lastUrl}
              hx-target={`#${targetId}`}
              hx-swap="outerHTML"
            >
              {formatLocalizedNumber(totalPages, locale)}
            </button>
          </>
        )}

        {/* Next */}
        <button
          type="button"
          class={`join-item btn btn-sm ${!hasNext ? "btn-disabled opacity-50" : ""}`}
          hx-get={hasNext ? nextUrl : undefined}
          hx-target={`#${targetId}`}
          hx-swap="outerHTML"
          disabled={!hasNext}
          aria-label="Next Page"
        >
          {locale === "fa" ? "بعدی" : "Next"}
        </button>
      </div>
    </div>
  );
}
