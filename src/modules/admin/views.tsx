import { Layout } from "../../ui/layout";
import { DashboardNavbar, type DashboardUser } from "../../ui/dashboard";
import { TagBadge } from "../../ui/tag-badge";
import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";

export type Row = Record<string, string | number | null>;
const managementLinks = [
  ["Users", "/dashboard/admin/users"],
  ["Meets", "/dashboard/admin/meets"],
  ["Tags", "/dashboard/admin/tags"],
  ["Roles", "/dashboard/admin/roles"],
  ["Endpoints", "/dashboard/admin/endpoints"],
  ["File Management", "/dashboard/admin/files"],
] as const;

const mailCenterLinks = [
  ["Mail Editor", "/dashboard/admin/mail-editor"],
  ["Mail Scheduler", "/dashboard/admin/mail-scheduler"],
  ["Mail Management", "/dashboard/admin/mail-management"],
] as const;

const databaseCenterLinks = [
  ["Database Management", "/dashboard/admin/database"],
] as const;

const reportLinks = [
  ["SQL report", "/dashboard/admin/report"],
] as const;

export function AdminLayout({
  children,
  allowed,
  title = "Admin",
  user,
  locale = "en",
}: {
  children: any;
  allowed: string[];
  title?: string;
  user?: DashboardUser;
  locale?: Locale;
}) {
  const allowedManagement = managementLinks.filter(([, href]) => allowed.includes(href));
  const allowedMailCenter = mailCenterLinks.filter(([, href]) => allowed.includes(href));
  const allowedDatabaseCenter = databaseCenterLinks.filter(([, href]) => allowed.includes(href));
  const allowedReports = reportLinks.filter(([, href]) => allowed.includes(href));

  return (
    <Layout title={`${title} | CobraDecision Admin`} locale={locale}>
      <div class="drawer lg:drawer-open min-h-screen bg-base-200">
        <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex flex-col">
          {/* Reusable Dashboard Top Navbar */}
          <DashboardNavbar
            drawerId="admin-drawer"
            brandHref="/dashboard/admin"
            user={user}
            currentView="admin"
            locale={locale}
          />
          <main class="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">{children}</main>
        </div>

        {/* Flat Admin Sidebar matching User Dashboard */}
        <aside class="drawer-side z-20">
          <label for="admin-drawer" class="drawer-overlay" aria-label="close sidebar" />
          <ul class="menu p-4 w-72 min-h-full bg-base-100 text-base-content border-e border-base-300 space-y-1">
            {allowedManagement.length > 0 && (
              <>
                <li class="menu-title text-xs font-bold uppercase tracking-wider text-base-content/50">
                  Management
                </li>
                {allowedManagement.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </>
            )}

            {allowedMailCenter.length > 0 && (
              <>
                <li class="menu-title mt-4 text-xs font-bold uppercase tracking-wider text-base-content/50">
                  Mail Center
                </li>
                {allowedMailCenter.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </>
            )}

            {allowedDatabaseCenter.length > 0 && (
              <>
                <li class="menu-title mt-4 text-xs font-bold uppercase tracking-wider text-base-content/50">
                  Database Center
                </li>
                {allowedDatabaseCenter.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </>
            )}

            {allowedReports.length > 0 && (
              <>
                <li class="menu-title mt-4 text-xs font-bold uppercase tracking-wider text-base-content/50">
                  Reports & Tools
                </li>
                {allowedReports.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </>
            )}
          </ul>
        </aside>
      </div>
    </Layout>
  );
}

function renderCellContent(column: string, rawVal: string | number | null) {
  if (rawVal === null || rawVal === undefined || rawVal === "") {
    return <span class="text-base-content/40">—</span>;
  }

  const str = String(rawVal);

  if (column === "status") {
    const badgeColor = str === "live" ? "badge-success" : str === "completed" ? "badge-ghost" : "badge-primary";
    return <span class={`badge ${badgeColor} badge-sm font-medium`}>{str}</span>;
  }

  if (column === "access_status") {
    const badgeColor = str === "private" ? "badge-warning badge-outline" : "badge-ghost";
    return <span class={`badge ${badgeColor} badge-sm font-medium`}>{str}</span>;
  }

  if (column.endsWith("_url") || str.startsWith("http://") || str.startsWith("https://") || str.startsWith("/uploads/")) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary hover:underline block max-w-[180px] truncate text-xs font-mono"
        title={str}
      >
        {str}
      </a>
    );
  }

  if (column === "description" || column === "topics" || str.length > 50) {
    return (
      <div
        class="max-w-xs max-h-12 overflow-hidden text-ellipsis line-clamp-2 text-xs leading-relaxed text-base-content/80"
        title={str}
      >
        {str}
      </div>
    );
  }

  return <span class="text-sm">{str}</span>;
}

export function CrudTable({
  resource,
  rows,
  columns,
  searchFields = columns,
  query = {},
  locale = "en",
}: {
  resource: string;
  rows: Row[];
  columns: string[];
  searchFields?: string[];
  query?: Record<string, string>;
  locale?: Locale;
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
            hx-post={`/dashboard/admin/${resource}/bulk-confirm`}
            hx-include={`#${resource}-bulk-form`}
            hx-target="#modal"
          >
            {t("admin.delete_selected", locale)}
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
          <table class="table table-zebra table-sm">
            <thead class="bg-base-200/50 text-xs font-semibold uppercase tracking-wider text-base-content/70">
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    onclick={`const checked = this.checked; document.querySelectorAll('#${resource}-bulk-form input[name=ids]').forEach(el => el.checked = checked)`}
                    aria-label="Select all"
                  />
                </th>
                {columns.map((column) => (
                  <th key={column} class="whitespace-nowrap">
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
                      <td key={column} class="max-h-16 align-middle">
                        {renderCellContent(column, row[column])}
                      </td>
                    ))}
                    <td class="text-right align-middle">
                      <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
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

export const Toast = ({
  type,
  title,
  description,
  locale = "en",
}: {
  type: string;
  title: string;
  description: string;
  locale?: Locale;
}) => {
  return (
    <div id="toast-container" hx-swap-oob="beforeend">
      <div class={`alert alert-${type} shadow-lg flex items-center justify-between gap-3`} data-toast={type}>
        <div class="text-sm">
          <span>{description || title}</span>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-circle"
          type="button"
          onclick="this.closest('.alert')?.remove()"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

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

export function AdminConfirmDeleteModal({
  resource,
  id,
  title,
  locale = "en",
}: {
  resource: string;
  id: string;
  title?: string;
  locale?: Locale;
}) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-base-content">{t("admin.confirm_delete_title", locale)}</h3>
        <p class="text-sm text-base-content/70 mt-2">
          {t("admin.confirm_delete_msg", locale)}
        </p>
        <div class="mt-2 rounded-lg bg-base-200/50 p-2 text-xs font-mono text-primary">
          <span class="font-semibold text-base-content/60 uppercase">{resource}: </span>
          {title || id}
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm" onclick="this.closest('dialog').remove()">
            {t("common.cancel", locale)}
          </button>
          <button
            type="button"
            class="btn btn-error btn-sm"
            hx-delete={`/dashboard/admin/${resource}/${id}`}
            hx-target={`#${resource}-table`}
            hx-swap="outerHTML"
          >
            {t("common.delete", locale)}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function AdminBulkConfirmDeleteModal({
  resource,
  items,
  locale = "en",
}: {
  resource: string;
  items: { id: string; label: string }[];
  locale?: Locale;
}) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-base-content">{t("admin.confirm_bulk_delete_title", locale)}</h3>
        <p class="text-sm text-base-content/70 mt-2">
          {t("admin.confirm_bulk_delete_msg", locale)}
        </p>
        <div class="mt-3 max-h-36 overflow-y-auto space-y-1 bg-base-200/50 p-2 rounded-lg text-xs font-mono">
          {items.map((item) => (
            <div key={item.id} class="truncate text-base-content/80">• {item.label}</div>
          ))}
        </div>

        <form
          hx-post={`/dashboard/admin/${resource}/bulk-delete`}
          hx-target={`#${resource}-table`}
          hx-swap="outerHTML"
          class="mt-4"
        >
          {items.map((item) => (
            <input type="hidden" name="ids" value={item.id} key={item.id} />
          ))}
          <div class="modal-action">
            <button type="button" class="btn btn-sm" onclick="this.closest('dialog').remove()">
              {t("common.cancel", locale)}
            </button>
            <button
              type="submit"
              class="btn btn-error btn-sm"
            >
              {t("common.delete", locale)} ({items.length})
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
