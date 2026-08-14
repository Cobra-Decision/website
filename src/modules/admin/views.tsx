import { Layout } from "../../ui/layout";

export type Row = Record<string, string | number | null>;
const links = [
  ["Users", "/dashboard/admin/users"],
  ["Meets", "/dashboard/admin/meets"],
  ["Tags", "/dashboard/admin/tags"],
  ["Roles", "/dashboard/admin/roles"],
  ["Endpoints", "/dashboard/admin/endpoints"],
  ["SQL report", "/dashboard/admin/report"],
] as const;

export function AdminLayout({ children, allowed, title = "Admin", user }: { children: any; allowed: string[]; title?: string; user?: { name: string; email: string; role: string } }) {
  return (
    <Layout title={title}>
      <div class="drawer lg:drawer-open bg-base-200 min-h-screen">
        <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content">
          <nav class="navbar min-h-16 bg-base-100 border-b px-4 shadow-sm sm:px-8">
            <label for="admin-drawer" class="btn btn-square btn-ghost lg:hidden">☰</label>
            <a href="/dashboard/admin" class="flex-1 text-xl font-bold">CobraDecision</a>
            <div class="flex items-center gap-2">
              {user && (
                <div class="dropdown dropdown-end">
                  <button class="btn btn-ghost btn-sm gap-2" tabindex={0}>
                    <div class="avatar placeholder">
                      <div class="w-8 rounded-full bg-primary text-primary-content">
                        <span>{user.name[0]?.toUpperCase()}</span>
                      </div>
                    </div>
                    <span class="hidden text-left sm:block">
                      <span class="block text-xs font-semibold">{user.name}</span>
                      <span class="block text-xs opacity-60">{user.role}</span>
                    </span>
                  </button>
                  <div class="card dropdown-content z-20 mt-3 w-64 border border-base-300 bg-base-100 shadow-xl" tabindex={0}>
                    <div class="card-body gap-2 p-4">
                      <p class="font-semibold">{user.name}</p>
                      <p class="text-sm opacity-60">{user.email}</p>
                      <a class="btn btn-outline btn-sm" href="/dashboard/profile">Edit profile</a>
                      <form hx-post="/auth/logout" class="mt-2">
                        <button class="btn btn-error btn-outline btn-sm w-full" type="submit">Sign out</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
          <main class="p-4 md:p-8 max-w-7xl mx-auto">{children}</main>
        </div>
        <aside class="drawer-side">
          <label for="admin-drawer" class="drawer-overlay" />
          <ul class="menu p-4 w-72 min-h-full bg-base-100">
            <li class="menu-title">Base info</li>
            {links.slice(0, 5).filter(([, href]) => allowed.includes(href)).map(([label, href]) => <li><a href={href}>{label}</a></li>)}
            <li class="menu-title mt-4">Reports</li>
            {links.slice(5).filter(([, href]) => allowed.includes(href)).map(([label, href]) => <li><a href={href}>{label}</a></li>)}
          </ul>
        </aside>
      </div>
    </Layout>
  );
}

export function CrudTable({ resource, rows, columns, searchFields = columns, query = {} }: { resource: string; rows: Row[]; columns: string[]; searchFields?: string[]; query?: Record<string, string> }) {
  const searchField = searchFields.includes(query.search_field ?? "") ? query.search_field! : searchFields[0]!;
  const sortUrl = (column: string) => `/dashboard/admin/${resource}?q=${encodeURIComponent(query.q ?? "")}&search_field=${encodeURIComponent(searchField)}&sort=${encodeURIComponent(column)}&direction=${query.sort === column && query.direction === "asc" ? "desc" : "asc"}`;
  return (
    <div id={`${resource}-table`}>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-bold capitalize">{resource}</h1>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" hx-get={`/dashboard/admin/${resource}/new`} hx-target="#modal">Add new</button>
          <button class="btn btn-error btn-sm" hx-post={`/dashboard/admin/${resource}/bulk-delete`} hx-include={`#${resource}-bulk-form`} hx-target={`#${resource}-table`} hx-swap="outerHTML">Delete selected</button>
        </div>
      </div>
      <form class="card mb-4 flex-row flex-wrap items-end gap-3 bg-base-100 p-4 shadow-sm" hx-get={`/dashboard/admin/${resource}`} hx-target={`#${resource}-table`} hx-swap="outerHTML">
        <label class="form-control">
          <span class="label-text">Search field</span>
          <select class="select select-bordered select-sm" name="search_field">
            {searchFields.map((field) => <option value={field} selected={searchField === field}>{field.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label class="form-control min-w-56 flex-1">
          <span class="label-text">Search value</span>
          <input class="input input-bordered input-sm w-full" name="q" value={query.q ?? ""} placeholder={`Search ${resource}`} />
        </label>
        <button class="btn btn-primary btn-sm">Search</button>
        <a class="btn btn-ghost btn-sm" href={`/dashboard/admin/${resource}`}>Reset</a>
      </form>
      <form id={`${resource}-bulk-form`}>
        <div class="overflow-x-auto rounded-box bg-base-100 shadow">
          <table class="table">
            <thead>
              <tr>
                <th></th>
                {columns.map((column) => (
                  <th>
                    <button type="button" class="btn btn-ghost btn-xs -ml-2" hx-get={sortUrl(column)} hx-target={`#${resource}-table`} hx-swap="outerHTML">
                      {column.replaceAll("_", " ")}{query.sort === column ? query.direction === "asc" ? " ↑" : " ↓" : ""}
                    </button>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr id={`${resource}-${row.id}`}>
                    <td><input type="checkbox" name="ids" value={String(row.id)} class="checkbox" /></td>
                    {columns.map((column) => <td>{String(row[column] ?? "—")}</td>)}
                    <td>
                      <div class="flex gap-2">
                        <button type="button" class="btn btn-xs" hx-get={`/dashboard/admin/${resource}/${row.id}/edit`} hx-target="#modal">Edit</button>
                        <button type="button" class="btn btn-xs btn-error" hx-get={`/dashboard/admin/${resource}/${row.id}/confirm`} hx-target="#modal">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} class="py-12 text-center opacity-60">No matching {resource}.</td>
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
      <span><strong>{title}</strong> {description}</span>
      <button class="btn btn-ghost btn-xs" type="button" onclick="this.parentElement.remove()" aria-label="Dismiss notification">×</button>
    </div>
  </div>
);

export function MeetRelations({ meetId, tags, users, selectedTags, attendees }: { meetId: string; tags: { id: string; title: string; description: string | null }[]; users: { id: string; email: string }[]; selectedTags: { id: string; title: string; description: string | null }[]; attendees: { id: string; email: string }[] }) {
  return (
    <section id={`meet-relations-${meetId}`} class="mt-6 grid gap-4 border-t pt-5 md:grid-cols-2">
      <div class="card bg-base-200">
        <div class="card-body p-4">
          <h4 class="card-title text-base">Tags</h4>
          <div class="flex gap-2">
            <select id={`meet-tag-${meetId}`} name="tag_id" class="select select-bordered select-sm min-w-0 flex-1">
              <option value="">Choose tag</option>
              {tags.filter((tag) => !selectedTags.some((item) => item.id === tag.id)).map((tag) => <option value={tag.id}>{tag.title}</option>)}
            </select>
            <button type="button" class="btn btn-primary btn-sm" hx-post={`/dashboard/admin/meets/${meetId}/tags`} hx-include={`#meet-tag-${meetId}`} hx-target={`#meet-relations-${meetId}`} hx-swap="outerHTML">Add</button>
          </div>
          <div class="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span class="tooltip badge badge-outline gap-1" data-tip={tag.description ?? tag.title}>
                {tag.title}
                <button type="button" aria-label={`Remove ${tag.title}`} hx-delete={`/dashboard/admin/meets/${meetId}/tags/${tag.id}`} hx-target={`#meet-relations-${meetId}`} hx-swap="outerHTML">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div class="card bg-base-200">
        <div class="card-body p-4">
          <h4 class="card-title text-base">Attendees</h4>
          <div class="flex gap-2">
            <select id={`meet-attendee-${meetId}`} name="user_id" class="select select-bordered select-sm min-w-0 flex-1">
              <option value="">Choose attendee</option>
              {users.filter((user) => !attendees.some((item) => item.id === user.id)).map((user) => <option value={user.id}>{user.email}</option>)}
            </select>
            <button type="button" class="btn btn-primary btn-sm" hx-post={`/dashboard/admin/meets/${meetId}/attendees`} hx-include={`#meet-attendee-${meetId}`} hx-target={`#meet-relations-${meetId}`} hx-swap="outerHTML">Add</button>
          </div>
          <div class="space-y-2">
            {attendees.map((user) => (
              <div class="flex items-center justify-between rounded-lg bg-base-100 px-3 py-2 text-sm">
                <span>{user.email}</span>
                <button type="button" class="btn btn-ghost btn-xs text-error" hx-delete={`/dashboard/admin/meets/${meetId}/attendees/${user.id}`} hx-target={`#meet-relations-${meetId}`} hx-swap="outerHTML">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
