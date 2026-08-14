import { Layout } from "../../ui/layout";
import { DashboardNavbar, type DashboardUser } from "../../ui/dashboard";
import { TagBadge } from "../../ui/tag-badge";

export type Row = Record<string, string | number | null>;
const managementLinks = [
  ["Users", "/dashboard/admin/users"],
  ["Meets", "/dashboard/admin/meets"],
  ["Tags", "/dashboard/admin/tags"],
  ["Roles", "/dashboard/admin/roles"],
  ["Endpoints", "/dashboard/admin/endpoints"],
  ["File Management", "/dashboard/admin/files"],
] as const;

const reportLinks = [
  ["SQL report", "/dashboard/admin/report"],
] as const;

export function AdminLayout({
  children,
  allowed,
  title = "Admin",
  user,
}: {
  children: any;
  allowed: string[];
  title?: string;
  user?: DashboardUser;
}) {
  return (
    <Layout title={`${title} | CobraDecision Admin`}>
      <div class="drawer lg:drawer-open min-h-screen bg-base-200">
        <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex flex-col">
          {/* Reusable Dashboard Top Navbar */}
          <DashboardNavbar
            drawerId="admin-drawer"
            brandHref="/dashboard/admin"
            user={user}
            currentView="admin"
          />
          <main class="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">{children}</main>
        </div>

        {/* Flat Admin Sidebar matching User Dashboard */}
        <aside class="drawer-side z-20">
          <label for="admin-drawer" class="drawer-overlay" aria-label="close sidebar" />
          <ul class="menu p-4 w-72 min-h-full bg-base-100 text-base-content border-r border-base-300 space-y-1">
            <li class="menu-title text-xs font-bold uppercase tracking-wider text-base-content/50">
              Management
            </li>
            {managementLinks
              .filter(([, href]) => allowed.includes(href))
              .map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}

            <li class="menu-title mt-6 text-xs font-bold uppercase tracking-wider text-base-content/50">
              Reports & Tools
            </li>
            {reportLinks
              .filter(([, href]) => allowed.includes(href))
              .map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
          </ul>
        </aside>
      </div>
    </Layout>
  );
}

export function CrudTable({
  resource,
  rows,
  columns,
  searchFields = columns,
  query = {},
}: {
  resource: string;
  rows: Row[];
  columns: string[];
  searchFields?: string[];
  query?: Record<string, string>;
}) {
  const searchField = searchFields.includes(query.search_field ?? "") ? query.search_field! : searchFields[0]!;
  const sortUrl = (column: string) =>
    `/dashboard/admin/${resource}?q=${encodeURIComponent(query.q ?? "")}&search_field=${encodeURIComponent(searchField)}&sort=${encodeURIComponent(column)}&direction=${query.sort === column && query.direction === "asc" ? "desc" : "asc"}`;

  return (
    <div id={`${resource}-table`} class="space-y-6">
      {/* Header section */}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content capitalize sm:text-3xl">
            {resource}
          </h1>
          <p class="text-sm text-base-content/60">
            Manage, filter, and inspect {resource} records.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="btn btn-primary btn-sm"
            hx-get={`/dashboard/admin/${resource}/new`}
            hx-target="#modal"
          >
            + Add New
          </button>
          <button
            class="btn btn-outline btn-error btn-sm"
            hx-post={`/dashboard/admin/${resource}/bulk-delete`}
            hx-include={`#${resource}-bulk-form`}
            hx-target={`#${resource}-table`}
            hx-swap="outerHTML"
          >
            Delete Selected
          </button>
        </div>
      </div>

      {/* Interactive Search & Filter Card */}
      <form
        class="card border border-base-300 bg-base-100 p-4 shadow-sm"
        hx-get={`/dashboard/admin/${resource}`}
        hx-target={`#${resource}-table`}
        hx-swap="outerHTML"
      >
        <div class="grid gap-3 sm:grid-cols-[180px_1fr_auto_auto] sm:items-end">
          <label class="form-control">
            <span class="label-text font-medium text-xs">Search Field</span>
            <select class="select select-bordered select-sm w-full" name="search_field">
              {searchFields.map((field) => (
                <option value={field} selected={searchField === field} key={field}>
                  {field.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label class="form-control">
            <span class="label-text font-medium text-xs">Search Query</span>
            <input
              class="input input-bordered input-sm w-full"
              name="q"
              value={query.q ?? ""}
              placeholder={`Search in ${resource}...`}
            />
          </label>

          <button class="btn btn-primary btn-sm">Search</button>
          <a class="btn btn-ghost btn-sm" href={`/dashboard/admin/${resource}`}>
            Reset
          </a>
        </div>
      </form>

      {/* Table Card */}
      <form id={`${resource}-bulk-form`}>
        <div class="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <table class="table table-zebra">
            <thead class="bg-base-200/50 text-xs font-semibold uppercase tracking-wider text-base-content/70">
              <tr>
                <th class="w-10"></th>
                {columns.map((column) => (
                  <th key={column}>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs -ml-2 font-semibold uppercase tracking-wider"
                      hx-get={sortUrl(column)}
                      hx-target={`#${resource}-table`}
                      hx-swap="outerHTML"
                    >
                      {column.replaceAll("_", " ")}
                      {query.sort === column ? (query.direction === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr id={`${resource}-${row.id}`} key={String(row.id)} class="hover">
                    <td>
                      <input
                        type="checkbox"
                        name="ids"
                        value={String(row.id)}
                        class="checkbox checkbox-sm"
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={column} class="text-sm">
                        {String(row[column] ?? "—")}
                      </td>
                    ))}
                    <td class="text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          class="btn btn-xs btn-outline"
                          hx-get={`/dashboard/admin/${resource}/${row.id}/edit`}
                          hx-target="#modal"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-error btn-outline"
                          hx-get={`/dashboard/admin/${resource}/${row.id}/confirm`}
                          hx-target="#modal"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} class="py-12 text-center text-sm text-base-content/60">
                    No matching {resource} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
      <div id="modal"></div>
    </div>
  );
}

export const Toast = ({ type, title, description }: { type: string; title: string; description: string }) => (
  <div id="toast-container" hx-swap-oob="beforeend">
    <div class={`alert alert-${type} shadow-lg`} data-toast={type}>
      <span>
        <strong>{title}</strong> {description}
      </span>
      <button
        class="btn btn-ghost btn-xs"
        type="button"
        onclick="this.parentElement.remove()"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  </div>
);

export function MeetRelations({
  meetId,
  tags,
  users,
  selectedTags,
  attendees,
}: {
  meetId: string;
  tags: { id: string; title: string; description: string | null }[];
  users: { id: string; email: string }[];
  selectedTags: { id: string; title: string; description: string | null }[];
  attendees: { id: string; email: string }[];
}) {
  return (
    <section id={`meet-relations-${meetId}`} class="mt-6 grid gap-4 border-t border-base-200 pt-5 md:grid-cols-2">
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body p-4 space-y-3">
          <h4 class="card-title text-sm font-bold text-base-content">Associated Tags</h4>
          <div class="flex gap-2">
            <select id={`meet-tag-${meetId}`} name="tag_id" class="select select-bordered select-sm min-w-0 flex-1">
              <option value="">Choose tag</option>
              {tags
                .filter((tag) => !selectedTags.some((item) => item.id === tag.id))
                .map((tag) => (
                  <option value={tag.id} key={tag.id}>
                    {tag.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              hx-post={`/dashboard/admin/meets/${meetId}/tags`}
              hx-include={`#meet-tag-${meetId}`}
              hx-target={`#meet-relations-${meetId}`}
              hx-swap="outerHTML"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                title={tag.title}
                description={tag.description}
                onRemoveHref={`/dashboard/admin/meets/${meetId}/tags/${tag.id}`}
                removeTarget={`#meet-relations-${meetId}`}
                removeAriaLabel={`Remove ${tag.title}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body p-4 space-y-3">
          <h4 class="card-title text-sm font-bold text-base-content">Registered Attendees</h4>
          <div class="flex gap-2">
            <select id={`meet-attendee-${meetId}`} name="user_id" class="select select-bordered select-sm min-w-0 flex-1">
              <option value="">Choose attendee</option>
              {users
                .filter((user) => !attendees.some((item) => item.id === user.id))
                .map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.email}
                  </option>
                ))}
            </select>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              hx-post={`/dashboard/admin/meets/${meetId}/attendees`}
              hx-include={`#meet-attendee-${meetId}`}
              hx-target={`#meet-relations-${meetId}`}
              hx-swap="outerHTML"
            >
              Add
            </button>
          </div>
          <div class="space-y-1.5 max-h-48 overflow-y-auto">
            {attendees.map((user) => (
              <div class="flex items-center justify-between rounded-lg bg-base-200/60 px-3 py-1.5 text-xs" key={user.id}>
                <span>{user.email}</span>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  hx-delete={`/dashboard/admin/meets/${meetId}/attendees/${user.id}`}
                  hx-target={`#meet-relations-${meetId}`}
                  hx-swap="outerHTML"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
