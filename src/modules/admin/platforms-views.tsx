import type { Database } from "bun:sqlite";
import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";
import { formatUtcDateTime } from "../events/datetime";

export interface PlatformFunnelStats {
  totalVisits: number;
  totalAttendees: number;
  overallConversionRate: number;
  uniqueMeetsCount: number;
  topPlatform: { name: string; visits: number } | null;
  platforms: {
    id: string | null;
    slug: string | null;
    name: string;
    visits: number;
    sharePercent: number;
  }[];
  recentVisits: {
    id: string;
    meet_id: string;
    meet_title: string;
    platform_name: string | null;
    created_at: string;
  }[];
  totalVisitsCount: number;
  page: number;
  totalPages: number;
}

export function getPlatformFunnelStats(
  db: Database,
  options: { page?: number; limit?: number; platform?: string; q?: string } = {}
): PlatformFunnelStats {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, Math.min(100, options.limit ?? 20));
  const offset = (page - 1) * limit;

  // 1. Total Visits
  const totalVisitsRow = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meet_visits").get();
  const totalVisits = totalVisitsRow?.count ?? 0;

  // 2. Total Attendees RSVPed
  const totalAttendeesRow = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meet_attendees").get();
  const totalAttendees = totalAttendeesRow?.count ?? 0;

  // 3. Unique Meets Tracked
  const uniqueMeetsRow = db.query<{ count: number }, []>(
    "SELECT COUNT(DISTINCT meet_id) as count FROM meet_visits"
  ).get();
  const uniqueMeetsCount = uniqueMeetsRow?.count ?? 0;

  // 4. Overall conversion rate
  const overallConversionRate = totalVisits > 0 ? (totalAttendees / totalVisits) * 100 : 0;

  // 5. Platforms performance breakdown
  const platformsQuery = `
    SELECT
      p.id,
      p.slug,
      COALESCE(p.name, 'Direct / Organic') AS name,
      COUNT(v.id) AS visits
    FROM meet_visits v
    LEFT JOIN platforms p ON p.id = v.platform_id
    GROUP BY p.id
    ORDER BY visits DESC
  `;
  const platformRows = db.query<{ id: string | null; slug: string | null; name: string; visits: number }, []>(
    platformsQuery
  ).all();

  const platforms = platformRows.map((p) => ({
    ...p,
    sharePercent: totalVisits > 0 ? (p.visits / totalVisits) * 100 : 0,
  }));

  const topPlatform = platforms.length > 0 && platforms[0].visits > 0
    ? { name: platforms[0].name, visits: platforms[0].visits }
    : null;

  // 6. Paginated & filtered recent visits log
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.platform) {
    if (options.platform === "direct") {
      conditions.push("v.platform_id IS NULL");
    } else {
      conditions.push("p.slug = ?");
      params.push(options.platform);
    }
  }

  if (options.q && options.q.trim()) {
    conditions.push("m.title LIKE ?");
    params.push(`%${options.q.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db.query<{ count: number }, any[]>(`
    SELECT COUNT(*) as count
    FROM meet_visits v
    LEFT JOIN meets m ON m.id = v.meet_id
    LEFT JOIN platforms p ON p.id = v.platform_id
    ${whereClause}
  `).get(...params);
  const totalVisitsFiltered = countRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalVisitsFiltered / limit));

  const visitsQuery = `
    SELECT
      v.id,
      v.meet_id,
      COALESCE(m.title, 'Unknown Meet') AS meet_title,
      COALESCE(p.name, 'Direct / Organic') AS platform_name,
      v.created_at
    FROM meet_visits v
    LEFT JOIN meets m ON m.id = v.meet_id
    LEFT JOIN platforms p ON p.id = v.platform_id
    ${whereClause}
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const recentVisits = db.query<{
    id: string;
    meet_id: string;
    meet_title: string;
    platform_name: string | null;
    created_at: string;
  }, any[]>(visitsQuery).all(...params, limit, offset);

  return {
    totalVisits,
    totalAttendees,
    overallConversionRate,
    uniqueMeetsCount,
    topPlatform,
    platforms,
    recentVisits,
    totalVisitsCount: totalVisitsFiltered,
    page,
    totalPages,
  };
}

export function PlatformsDataView({
  stats,
  query = {},
  locale = "en",
  timeZone = "Asia/Tehran",
}: {
  stats: PlatformFunnelStats;
  query?: { platform?: string; q?: string; page?: string };
  locale?: Locale;
  timeZone?: string;
}) {
  return (
    <div id="platforms-data-view" class="space-y-8">
      {/* Header section */}
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
            Platforms Data & Funnel Center
          </h1>
          <p class="text-sm text-base-content/60">
            Real-time traffic acquisition channels, meet conversion funnels, and visit event logs.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="card border border-base-300 bg-base-100 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60">Total Visits</span>
          <div class="mt-2 text-3xl font-extrabold text-primary">{stats.totalVisits.toLocaleString()}</div>
          <span class="mt-1 text-xs text-base-content/50">Across {stats.uniqueMeetsCount} active meets</span>
        </div>

        <div class="card border border-base-300 bg-base-100 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60">Total RSVPs</span>
          <div class="mt-2 text-3xl font-extrabold text-secondary">{stats.totalAttendees.toLocaleString()}</div>
          <span class="mt-1 text-xs text-base-content/50">Confirmed attendee signups</span>
        </div>

        <div class="card border border-base-300 bg-base-100 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60">Funnel Conversion</span>
          <div class="mt-2 text-3xl font-extrabold text-success">
            {stats.overallConversionRate.toFixed(1)}%
          </div>
          <span class="mt-1 text-xs text-base-content/50">Visits to RSVP conversion</span>
        </div>

        <div class="card border border-base-300 bg-base-100 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60">Top Channel</span>
          <div class="mt-2 text-2xl font-bold text-accent truncate">
            {stats.topPlatform?.name ?? "Direct / Organic"}
          </div>
          <span class="mt-1 text-xs text-base-content/50">
            {stats.topPlatform?.visits.toLocaleString() ?? 0} referrals
          </span>
        </div>
      </div>

      {/* Funnel Drop-off & Platform Share */}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Step-by-Step Funnel Visualizer */}
        <div class="card border border-base-300 bg-base-100 p-6 shadow-sm lg:col-span-1 space-y-6">
          <div>
            <h2 class="text-lg font-bold text-base-content">Acquisition Funnel</h2>
            <p class="text-xs text-base-content/60">Global attendee conversion stages</p>
          </div>

          <div class="space-y-4">
            {/* Step 1 */}
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold">
                <span class="flex items-center gap-1.5">
                  <span class="badge badge-primary badge-xs">1</span> Meet Page Visits
                </span>
                <span>{stats.totalVisits.toLocaleString()} (100%)</span>
              </div>
              <progress class="progress progress-primary w-full h-3" value="100" max="100" />
            </div>

            {/* Drop off arrow */}
            <div class="flex items-center justify-center text-xs font-medium text-base-content/40">
              ↓ {Math.min(100, Math.max(0, 100 - stats.overallConversionRate)).toFixed(1)}% drop-off
            </div>

            {/* Step 2 */}
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold">
                <span class="flex items-center gap-1.5">
                  <span class="badge badge-success badge-xs">2</span> Confirmed RSVPs
                </span>
                <span>
                  {stats.totalAttendees.toLocaleString()} ({Math.min(100, stats.overallConversionRate).toFixed(1)}%)
                </span>
              </div>
              <progress
                class="progress progress-success w-full h-3"
                value={Math.min(100, stats.overallConversionRate).toFixed(1)}
                max="100"
              />
            </div>
          </div>

          <div class="rounded-xl bg-base-200/50 p-3 text-xs text-base-content/70">
            <span class="font-bold">Efficiency Tip:</span> Optimize referral landing pages with high drop-off to boost RSVP rates.
          </div>
        </div>

        {/* Platform Share Table */}
        <div class="card border border-base-300 bg-base-100 p-6 shadow-sm lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-base-content">Platform Attribution Matrix</h2>
              <p class="text-xs text-base-content/60">Traffic volume and percentage share by channel</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead class="bg-base-200/50 text-xs uppercase tracking-wider text-base-content/70">
                <tr>
                  <th>Platform / Channel</th>
                  <th class="text-right">Visits</th>
                  <th class="text-right">Traffic Share</th>
                  <th class="w-1/3">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {stats.platforms.length > 0 ? (
                  stats.platforms.map((p) => (
                    <tr key={p.slug ?? "direct"} class="hover">
                      <td class="font-medium flex items-center gap-2">
                        <span class={`badge badge-sm ${p.slug ? "badge-info badge-outline" : "badge-ghost"}`}>
                          {p.slug ?? "direct"}
                        </span>
                        {p.name}
                      </td>
                      <td class="text-right font-mono font-semibold">{p.visits.toLocaleString()}</td>
                      <td class="text-right font-mono text-xs">{p.sharePercent.toFixed(1)}%</td>
                      <td>
                        <progress
                          class="progress progress-accent w-full h-2"
                          value={p.sharePercent.toFixed(1)}
                          max="100"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} class="text-center py-6 text-sm text-base-content/40">
                      No platform traffic recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Raw Visits Event Explorer */}
      <div class="card border border-base-300 bg-base-100 p-6 shadow-sm space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-bold text-base-content">Raw Meet Visits Log</h2>
            <p class="text-xs text-base-content/60">
              Filterable visit stream recorded with 5-minute deduping ({stats.totalVisitsCount} records)
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form
          class="grid gap-3 sm:grid-cols-[200px_1fr_auto_auto] sm:items-end"
          hx-get="/dashboard/admin/platforms-data"
          hx-target="#platforms-data-view"
          hx-swap="outerHTML"
        >
          <label class="form-control">
            <span class="label-text text-xs font-semibold">Filter Channel</span>
            <select class="select select-bordered select-sm w-full" name="platform">
              <option value="" selected={!query.platform}>All Channels</option>
              <option value="direct" selected={query.platform === "direct"}>Direct / Organic</option>
              {stats.platforms.filter((p) => p.slug).map((p) => (
                <option value={p.slug!} selected={query.platform === p.slug} key={p.slug!}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </label>

          <label class="form-control">
            <span class="label-text text-xs font-semibold">Search Meet Title</span>
            <input
              class="input input-bordered input-sm w-full"
              name="q"
              value={query.q ?? ""}
              placeholder="Search by meeting title..."
            />
          </label>

          <button class="btn btn-primary btn-sm">Filter</button>
          <a class="btn btn-ghost btn-sm" href="/dashboard/admin/platforms-data">Reset</a>
        </form>

        {/* Visits Table */}
        <form id="visits-bulk-form">
          <div class="overflow-x-auto rounded-xl border border-base-300">
            <table class="table table-zebra table-sm">
              <thead class="bg-base-200/50 text-xs uppercase tracking-wider text-base-content/70">
                <tr>
                  <th class="w-10">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      onclick="const checked = this.checked; document.querySelectorAll('#visits-bulk-form input[name=ids]').forEach(el => el.checked = checked)"
                      aria-label="Select all"
                    />
                  </th>
                  <th>Meeting</th>
                  <th>Channel</th>
                  <th>Timestamp (UTC)</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentVisits.length > 0 ? (
                  stats.recentVisits.map((v) => (
                    <tr id={`visit-${v.id}`} key={v.id} class="hover">
                      <td>
                        <input type="checkbox" name="ids" value={v.id} class="checkbox checkbox-xs" />
                      </td>
                      <td class="font-medium">
                        <a href={`/meets/${v.meet_id}`} target="_blank" class="link link-hover text-primary">
                          {v.meet_title}
                        </a>
                      </td>
                      <td>
                        <span class="badge badge-sm badge-ghost">{v.platform_name}</span>
                      </td>
                      <td class="font-mono text-xs text-base-content/70" title={v.created_at}>
                        {formatUtcDateTime(v.created_at, locale, timeZone).full || v.created_at}
                      </td>
                      <td class="text-right">
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs text-error"
                          hx-post={`/dashboard/admin/platforms-data/delete-visit?id=${v.id}`}
                          hx-target={`#visit-${v.id}`}
                          hx-swap="outerHTML"
                          hx-confirm="Are you sure you want to delete this visit record?"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} class="text-center py-6 text-sm text-base-content/40">
                      No visits found matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </form>

        {/* Pagination & Bulk Actions */}
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <button
            class="btn btn-outline btn-error btn-xs"
            hx-post="/dashboard/admin/platforms-data/bulk-delete-visits"
            hx-include="#visits-bulk-form"
            hx-target="#platforms-data-view"
            hx-swap="outerHTML"
            hx-confirm="Delete selected visit logs?"
          >
            Delete Selected
          </button>

          {stats.totalPages > 1 && (
            <div class="join">
              <a
                class={`join-item btn btn-xs ${stats.page <= 1 ? "btn-disabled" : ""}`}
                href={`/dashboard/admin/platforms-data?page=${stats.page - 1}&platform=${encodeURIComponent(query.platform ?? "")}&q=${encodeURIComponent(query.q ?? "")}`}
              >
                « Prev
              </a>
              <button class="join-item btn btn-xs btn-active">
                Page {stats.page} of {stats.totalPages}
              </button>
              <a
                class={`join-item btn btn-xs ${stats.page >= stats.totalPages ? "btn-disabled" : ""}`}
                href={`/dashboard/admin/platforms-data?page=${stats.page + 1}&platform=${encodeURIComponent(query.platform ?? "")}&q=${encodeURIComponent(query.q ?? "")}`}
              >
                Next »
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
