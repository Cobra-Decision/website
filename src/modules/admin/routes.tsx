import { Hono, type Context, type Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { Database } from "bun:sqlite";
import { clearPermissionCache, createPermissionChecker, getFirstAllowedAdminPath, getRoleAllowedEndpoints } from "../auth/middleware";
import { AdminLayout, CrudTable, MeetRelations, type Row, Toast, AdminConfirmDeleteModal, AdminBulkConfirmDeleteModal } from "./views";
import { FormMessage } from "../../ui/form-message";
import { getErrorMessage, refreshLandingCache, refreshErrorCache } from "../../lib/cache";
import { validateReportSql } from "./report";
import { SchemaTable } from "./report-views";
import { generateId } from "../../lib/id";
import { handleImageUpload, handlePresentationUpload, handleVideoUpload } from "./upload";
import { createFileAdminRoutes } from "./files/routes";
import { MeetingLinkGenerator } from "../../ui/dashboard";
import { MarkdownEditor } from "../../ui/markdown-editor";
import { getLocale, getTimezone, toEnglishDigits } from "../../lib/i18n/context";
import { toUtcIso } from "../events/datetime";
import { mailService } from "../mailer/service";
import { MailerDashboardView } from "./mailer-views";
import { MailEditorView } from "./mail-editor-views";
import { MailSchedulerView, AutomationRuleCard } from "./mail-scheduler-views";
import type { EmailTemplateRow, ScheduledEmailRow, EmailAutomationRuleRow } from "../mailer/database";
import { getAllTags, normalizeTopics, parseTopics } from "../events/queries";
import { logger } from "../../lib/logger";
import { createDatabaseAdminRoutes } from "./database-routes";
import { ImageCropEditor } from "../../ui/image-crop-editor";
import { PlatformsDataView, getPlatformFunnelStats } from "./platforms-views";

type AdminEnv = {
  Variables: {
    auth: { sub: string; role_id: string };
  };
};

const guard = (db: Database, jwtSecret: string) => async (c: Context<AdminEnv>, next: Next) => {
  const token = getCookie(c, "session");
  if (!token) return c.redirect("/auth");
  try {
    const claims = (await verify(token, jwtSecret, "HS256")) as { sub: string; role_id: string };
    const path = c.req.path;
    const can = createPermissionChecker(db);
    if (!can(claims.role_id, path)) {
      return c.html(<p class="alert alert-error">Forbidden</p>, 403);
    }
    c.set("auth", claims);
    return next();
  } catch {
    return c.redirect("/auth");
  }
};

export function createAdminRoutes(db: Database, jwtSecret = process.env.JWT_SECRET ?? "development-secret") {
  const app = new Hono<AdminEnv>();
  const page = (c: Context<AdminEnv>, title: string, body: any) => {
    const auth = c.get("auth");
    const locale = getLocale(c);
    const allowed = Array.from(getRoleAllowedEndpoints(db, auth.role_id));
    const user =
      db
        .query<{ name: string; email: string; role: string }, [string]>(
          "SELECT COALESCE(NULLIF(TRIM(first_name||' '||last_name),''),COALESCE(username,email)) name,email,r.title role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?"
        )
        .get(auth.sub) ?? undefined;
    return c.html(<AdminLayout allowed={allowed} title={title} user={user} locale={locale} currentPath={c.req.path}>{body}</AdminLayout>);
  };

  app.get("/", async (c) => {
    const token = getCookie(c, "session");
    if (!token) return c.redirect("/auth");
    try {
      const claims = (await verify(token, jwtSecret, "HS256")) as unknown as { role_id: string };
      const target = getFirstAllowedAdminPath(db, claims.role_id);
      return c.redirect(target);
    } catch {
      return c.redirect("/auth");
    }
  });

  app.use("*", async (c, next) => guard(db, jwtSecret)(c, next));

  // File Management Subroutes
  const fileRoutes = createFileAdminRoutes(db, page);
  app.route("/files", fileRoutes);

  // Database Center & Management Subroutes
  const databaseRoutes = createDatabaseAdminRoutes(db, page);
  app.route("/", databaseRoutes);

  const config = {
    users: {
      table: "users",
      columns: ["id", "email", "username", "phone", "first_name", "last_name", "role_title", "created_at", "updated_at"],
      searchFields: ["id", "email", "username", "phone", "first_name", "last_name", "role_title"],
      fields: ["email", "username", "phone", "first_name", "last_name", "password", "role_id"],
    },
    meets: {
      table: "meets",
      columns: ["id", "title", "status", "access_status", "description", "topics", "scheduled_date", "scheduled_time", "duration_minutes", "meet_url", "video_url", "file_url", "image_url", "presenter_id", "created_at", "updated_at"],
      searchFields: ["id", "title", "status", "access_status", "description", "topics", "scheduled_date", "presenter_id"],
      fields: ["title", "description", "topics", "scheduled_date", "scheduled_time", "duration_minutes", "meet_url", "video_url", "file_url", "image_url", "status", "access_status", "presenter_id"],
    },
    tags: {
      table: "tags",
      columns: ["id", "title", "description", "created_at", "updated_at"],
      searchFields: ["id", "title", "description"],
      fields: ["title", "description"],
    },
    roles: {
      table: "roles",
      columns: ["id", "title", "description", "created_at", "updated_at"],
      searchFields: ["id", "title", "description"],
      fields: ["title", "description"],
    },
    endpoints: {
      table: "endpoints",
      columns: ["id", "title", "description", "created_at", "updated_at"],
      searchFields: ["id", "title", "description"],
      fields: ["title", "description"],
    },
  } as const;

  const rowsFor = (resource: keyof typeof config, query: Record<string, string> = {}) => {
    const direction = query.direction === "asc" ? "ASC" : "DESC";
    const sort = query.sort && config[resource].columns.includes(query.sort as never) ? query.sort : "id";
    const q = query.q?.trim();
    const searchField = config[resource].searchFields.includes(query.search_field as never) ? query.search_field : config[resource].searchFields[0];
    if (resource === "users") {
      const allowed = ["id", "email", "username", "phone", "first_name", "last_name", "role_title", "created_at", "updated_at"];
      const userSort = allowed.includes(sort) ? sort : "id";
      const field = searchField === "role_title" ? "r.title" : `u.${searchField}`;
      const sql = `SELECT u.id,u.email,u.username,u.phone,u.first_name,u.last_name,r.title role_title,u.created_at,u.updated_at FROM users u JOIN roles r ON r.id=u.role_id WHERE u.deleted_at IS NULL AND r.deleted_at IS NULL${q ? ` AND CAST(${field} AS TEXT) LIKE ?` : ""} ORDER BY ${userSort === "role_title" ? "r.title" : `u.${userSort}`} ${direction}`;
      return (q ? db.query(sql).all(`%${q}%`) : db.query(sql).all()) as Row[];
    }
    const sql = `SELECT ${config[resource].columns.join(", ")} FROM ${config[resource].table} WHERE deleted_at IS NULL${q ? ` AND CAST(${searchField} AS TEXT) LIKE ?` : ""} ORDER BY ${sort} ${direction}`;
    return (q ? db.query(sql).all(`%${q}%`) : db.query(sql).all()) as Row[];
  };

  const tableResponse = (resource: keyof typeof config, toastTitle?: string, fallback = "") => {
    refreshLandingCache(db);
    clearPermissionCache();
    return (
      <>
        <CrudTable resource={resource} columns={[...config[resource].columns]} searchFields={[...config[resource].searchFields]} rows={rowsFor(resource)} />
        {toastTitle && toast(toastTitle, fallback)}
      </>
    );
  };

  const form = (resource: keyof typeof config, id?: string, values: Row = {}, error?: string) => {
    const roles = db.query<{ id: string; title: string }, []>("SELECT id,title FROM roles WHERE deleted_at IS NULL ORDER BY title").all();
    const users = db.query<{ id: string; email: string }, []>("SELECT id,email FROM users WHERE deleted_at IS NULL ORDER BY email").all();
    const allTags = resource === "meets" ? db.query<{ id: string; title: string }, []>("SELECT id,title FROM tags WHERE deleted_at IS NULL ORDER BY title").all() : [];
    const currentMeetTagIds = resource === "meets" && id ? db.query<{ tag_id: string }, [string]>("SELECT tag_id FROM meet_tags WHERE meet_id=?").all(id).map((r) => r.tag_id) : [];
    const endpoints = resource === "roles" ? db.query<{ id: string; title: string }, []>("SELECT id,title FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all() : [];
    const mappings =
      resource === "roles" && id
        ? db
            .query<{ endpoint_id: string; title: string }, [string]>(
              "SELECT re.endpoint_id,e.title FROM role_endpoints re JOIN endpoints e ON e.id=re.endpoint_id WHERE re.role_id=? AND re.deleted_at IS NULL AND e.deleted_at IS NULL"
            )
            .all(id)
        : [];
    const inputType = (field: string) =>
      field === "password"
        ? "password"
        : field.includes("date")
        ? "date"
        : field.includes("time")
        ? "time"
        : field === "duration_minutes"
        ? "number"
        : "text";

    const fieldInput = (field: string) =>
      field === "description" && resource === "meets" ? (
        <div class="sm:col-span-2">
          <MarkdownEditor name="description" value={String(values[field] ?? "")} />
        </div>
      ) : field === "topics" && resource === "meets" ? (
        <input
          class="input input-bordered w-full"
          name={field}
          type="text"
          value={Array.isArray(values[field]) ? (values[field] as string[]).join(", ") : parseTopics(values[field] as string).join(", ")}
          placeholder="Career, DevOps, Open discussion"
        />
      ) : field === "status" && resource === "meets" ? (
        <select class="select select-bordered w-full" name={field} value={String(values[field] ?? "upcoming")}>
          <option value="upcoming" selected={String(values[field] ?? "upcoming") === "upcoming"}>
            Upcoming
          </option>
          <option value="live" selected={String(values[field]) === "live"}>
            Live / Presenting
          </option>
          <option value="completed" selected={String(values[field]) === "completed"}>
            Presented / Completed
          </option>
        </select>
      ) : field === "access_status" && resource === "meets" ? (
        <select class="select select-bordered w-full" name={field} value={String(values[field] ?? "public")}>
          <option value="public" selected={String(values[field] ?? "public") === "public"}>
            Public (Open URL)
          </option>
          <option value="private" selected={String(values[field]) === "private"}>
            Private (Attendees Only)
          </option>
        </select>
      ) : field === "role_id" ? (
        <select class="select select-bordered w-full" name={field} required value={String(values[field] ?? "")}>
          <option value="">Choose role</option>
          {roles.map((role) => (
            <option value={role.id} selected={String(values[field]) === role.id}>
              {role.title}
            </option>
          ))}
        </select>
      ) : field === "presenter_id" ? (
        <select class="select select-bordered w-full" name={field} value={String(values[field] ?? "")}>
          <option value="">Free discussion</option>
          {users.map((user) => (
            <option value={user.id} selected={String(values[field]) === user.id}>
              {user.email}
            </option>
          ))}
        </select>
      ) : (
        <input
          class="input input-bordered w-full"
          name={field}
          type={inputType(field)}
          value={field === "password" ? "" : String(values[field] ?? "")}
          placeholder={field === "image_url" ? "URL (https://...) or path (/uploads/...)" : field === "video_url" ? "YouTube link or /uploads/... video path" : field === "file_url" ? "URL or OS file path" : ""}
          required={field === "title" || field === "email" || field === "scheduled_date" || field === "scheduled_time" || (!id && field === "password")}
        />
      );

    return (
      <dialog id="record-modal" class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg">{id ? "Edit" : "Add"} {resource}</h3>
          <form
            hx-post={`/dashboard/admin/${resource}${id ? `/${id}` : ""}`}
            hx-target={`#${resource}-table`}
            hx-swap="outerHTML"
            hx-encoding="multipart/form-data"
            class="grid gap-3 mt-4 sm:grid-cols-2"
          >
            {error && (
              <div class="sm:col-span-2">
                <FormMessage message={error} />
              </div>
            )}
            {config[resource].fields.map((field) => (
              <label class={`form-control ${field === "description" && resource === "meets" ? "sm:col-span-2" : ""}`} key={field}>
                <span class="label-text capitalize font-medium">{field.replaceAll("_", " ")}</span>
                {fieldInput(field)}
              </label>
            ))}

            {resource === "meets" && (
              <>
                <label class="form-control sm:col-span-2">
                  <span class="label-text font-medium">Or Upload Presentation / Reading Material (PDF, PPT, DOC, ZIP - max 25MB)</span>
                  <input class="file-input file-input-bordered w-full" name="presentation_file" type="file" />
                  {values.file_url && (
                    <span class="mt-1 text-xs text-primary">
                      Current file attached: <a href={String(values.file_url)} target="_blank" class="underline">{String(values.file_url)}</a>
                    </span>
                  )}
                </label>

                <label class="form-control sm:col-span-2">
                  <span class="label-text font-medium">Or Upload Video Recording (MP4, WebM, MOV - max 100MB)</span>
                  <input class="file-input file-input-bordered w-full" name="video_file" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" />
                  {values.video_url && (
                    <span class="mt-1 text-xs text-primary">
                      Current video attached: <a href={String(values.video_url)} target="_blank" class="underline">{String(values.video_url)}</a>
                    </span>
                  )}
                </label>

                <ImageCropEditor />

                <div
                  class="form-control sm:col-span-2 space-y-2"
                  x-data={`{
                    tagSearch: '',
                    allTags: ${JSON.stringify(allTags.map((t) => ({ id: t.id, title: t.title })))},
                    selectedTagIds: ${JSON.stringify(currentMeetTagIds)},
                    get filteredTags() {
                      if (!this.tagSearch.trim()) return this.allTags;
                      const q = this.tagSearch.toLowerCase();
                      return this.allTags.filter(t => t.title.toLowerCase().includes(q));
                    },
                    selectAllFilteredTags() {
                      const ids = this.filteredTags.map(t => t.id);
                      this.selectedTagIds = Array.from(new Set([...this.selectedTagIds, ...ids]));
                    },
                    clearSelectedTags() {
                      this.selectedTagIds = [];
                    }
                  }`}
                >
                  <div class="flex items-center justify-between">
                    <span class="label-text font-medium">
                      Tags (<span x-text="selectedTagIds.length"></span> selected)
                    </span>
                    <div class="flex gap-1">
                      <button type="button" class="btn btn-xs btn-ghost" x-on:click="selectAllFilteredTags()">Select All</button>
                      <button type="button" class="btn btn-xs btn-ghost" x-on:click="clearSelectedTags()">Clear</button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Search tags..."
                    x-model="tagSearch"
                    class="input input-bordered input-xs w-full"
                  />
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-base-300 rounded-lg bg-base-200/40">
                    <template x-for="tag in filteredTags" x-bind:key="tag.id">
                      <label class="cursor-pointer label justify-start gap-2 py-1 px-2 rounded hover:bg-base-200 bg-base-100 border border-base-300/50">
                        <input
                          type="checkbox"
                          name="tag_ids"
                          x-bind:value="tag.id"
                          x-model="selectedTagIds"
                          class="checkbox checkbox-primary checkbox-xs"
                        />
                        <span class="label-text text-xs truncate" x-text="tag.title"></span>
                      </label>
                    </template>
                  </div>
                </div>

                {!id && (
                  <label class="form-control sm:col-span-2">
                    <span class="label-text font-medium">Initial Attendee (optional)</span>
                    <select class="select select-bordered w-full" name="initial_user_id">
                      <option value="">Select initial attendee...</option>
                      {users.map((user) => (
                        <option value={user.id} key={user.id}>{user.email}</option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}

            {resource === "meets" && values.image_url && (
              <img class="max-h-40 rounded-box border object-cover sm:col-span-2" src={String(values.image_url)} alt="Meet image preview" />
            )}

            <div class="modal-action sm:col-span-2">
              <button type="button" class="btn" onclick="this.closest('dialog').remove()">
                Cancel
              </button>
              <button class="btn btn-primary">Save</button>
            </div>
          </form>

          {/* Admin Attributed Link Generator for Meets */}
          {resource === "meets" && id && (
            <div class="mt-6 border-t border-base-200 pt-5">
              <MeetingLinkGenerator meetId={id} />
            </div>
          )}

          {resource === "meets" && id && relationPanel(id)}

          {resource === "roles" && id && roleEndpointsSection(id, endpoints, mappings)}
        </div>
      </dialog>
    );
  };

  const toast = (title: string, fallback: string, type: "info" | "error" | "success" | "warning" = "success") => {
    refreshErrorCache(db);
    const message = getErrorMessage(title) ?? { type, title, description: fallback };
    return <Toast type={message.type} title={message.title} description={message.description} />;
  };

  const relationPanel = (meetId: string) => (
    <MeetRelations
      meetId={meetId}
      tags={db.query("SELECT id,title,description FROM tags WHERE deleted_at IS NULL ORDER BY title").all() as { id: string; title: string; description: string | null }[]}
      users={db.query("SELECT id,email FROM users WHERE deleted_at IS NULL ORDER BY email").all() as { id: string; email: string }[]}
      selectedTags={db.query("SELECT t.id,t.title,t.description FROM tags t JOIN meet_tags mt ON mt.tag_id=t.id WHERE mt.meet_id=? AND t.deleted_at IS NULL ORDER BY t.title").all(meetId) as { id: string; title: string; description: string | null }[]}
      attendees={db.query("SELECT u.id,u.email FROM users u JOIN meet_attendees ma ON ma.user_id=u.id WHERE ma.meet_id=? AND u.deleted_at IS NULL ORDER BY u.email").all(meetId) as { id: string; email: string }[]}
    />
  );

  const getRoleEndpointsData = (roleId: string) => {
    const endpoints = db.query<{ id: string; title: string }, []>("SELECT id,title FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all();
    const mappings = db
      .query<{ endpoint_id: string; title: string }, [string]>(
        "SELECT re.endpoint_id,e.title FROM role_endpoints re JOIN endpoints e ON e.id=re.endpoint_id WHERE re.role_id=? AND re.deleted_at IS NULL AND e.deleted_at IS NULL ORDER BY e.title"
      )
      .all(roleId);
    return { endpoints, mappings };
  };

  const roleEndpointsResponse = (roleId: string, toastTitle?: string, toastFallback?: string, toastType: "info" | "error" | "success" | "warning" = "success") => {
    const { endpoints, mappings } = getRoleEndpointsData(roleId);
    return (
      <>
        {roleEndpointsSection(roleId, endpoints, mappings)}
        {toastTitle && toastFallback && toast(toastTitle, toastFallback, toastType)}
      </>
    );
  };

  const roleEndpointsSection = (
    roleId: string,
    endpoints: { id: string; title: string }[],
    mappings: { endpoint_id: string; title: string }[]
  ) => {
    const unassigned = endpoints.filter((e) => !mappings.some((m) => m.endpoint_id === e.id));
    return (
      <div
        id={`role-endpoints-section-${roleId}`}
        class="border-t pt-4 space-y-4"
        x-data={`{
          epSearch: (window.__roleEpSearch && window.__roleEpSearch['${roleId}']) || '',
          assignedSearch: (window.__roleAssignedSearch && window.__roleAssignedSearch['${roleId}']) || '',
          selectedNewEp: '',
          selectedToDelete: [],
          allEndpoints: ${JSON.stringify(unassigned)},
          init() {
            window.__roleEpSearch = window.__roleEpSearch || {};
            window.__roleAssignedSearch = window.__roleAssignedSearch || {};
            this.$watch('epSearch', (val) => { window.__roleEpSearch['${roleId}'] = val; });
            this.$watch('assignedSearch', (val) => { window.__roleAssignedSearch['${roleId}'] = val; });
          },
          get filteredAvailable() {
            if (!this.epSearch.trim()) return this.allEndpoints;
            const q = this.epSearch.toLowerCase();
            return this.allEndpoints.filter(e => e.title.toLowerCase().includes(q));
          },
          toggleSelectAllAssigned() {
            const table = document.getElementById('role-endpoints-table-${roleId}');
            if (!table) return;
            const checkboxes = Array.from(table.querySelectorAll('tbody input[type=checkbox]'));
            const visibleCheckboxes = checkboxes.filter(cb => {
              const tr = cb.closest('tr');
              return tr && tr.style.display !== 'none';
            });
            const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => this.selectedToDelete.includes(cb.value));
            if (allChecked) {
              const visibleVals = visibleCheckboxes.map(cb => cb.value);
              this.selectedToDelete = this.selectedToDelete.filter(id => !visibleVals.includes(id));
            } else {
              const visibleVals = visibleCheckboxes.map(cb => cb.value);
              this.selectedToDelete = Array.from(new Set([...this.selectedToDelete, ...visibleVals]));
            }
          },
          isAllAssignedSelected() {
            const table = document.getElementById('role-endpoints-table-${roleId}');
            if (!table) return false;
            const checkboxes = Array.from(table.querySelectorAll('tbody input[type=checkbox]'));
            const visibleCheckboxes = checkboxes.filter(cb => {
              const tr = cb.closest('tr');
              return tr && tr.style.display !== 'none';
            });
            return visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => this.selectedToDelete.includes(cb.value));
          },
          deleteSelected() {
            if (!this.selectedToDelete || !this.selectedToDelete.length) return;
            htmx.ajax('DELETE', '/dashboard/admin/roles/${roleId}/endpoints/bulk-delete', {
              target: '#role-endpoints-section-${roleId}',
              swap: 'outerHTML',
              values: { endpoint_ids: this.selectedToDelete }
            });
          }
        }`}
      >
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold text-base">Endpoint Access Permissions</h4>
            <p class="text-xs text-base-content/70">Assign and remove granular route permissions for this role.</p>
          </div>
          <span class="badge badge-sm badge-outline">{mappings.length} assigned</span>
        </div>

        {/* Searchable Add Endpoint Section */}
        <div class="bg-base-200/50 p-3 rounded-box border border-base-300 space-y-2">
          <span class="text-xs font-semibold text-base-content/80">Add Endpoint Access</span>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="sm:col-span-1">
              <input
                type="text"
                placeholder="Filter endpoints..."
                class="input input-bordered input-sm w-full"
                x-model="epSearch"
              />
            </div>
            <div class="sm:col-span-2 flex gap-2">
              <select
                id={`role-endpoint-${roleId}`}
                class="select select-bordered select-sm w-full font-mono text-xs"
                name="endpoint_id"
                x-model="selectedNewEp"
              >
                <option value="">Select an available endpoint...</option>
                <template x-for="ep in filteredAvailable" x-bind:key="ep.id">
                  <option x-bind:value="ep.id" x-text="ep.title"></option>
                </template>
              </select>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                hx-post={`/dashboard/admin/roles/${roleId}/endpoints`}
                hx-include={`#role-endpoint-${roleId}`}
                hx-target={`#role-endpoints-section-${roleId}`}
                hx-swap="outerHTML"
                x-bind:disabled="!selectedNewEp"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Table of Assigned Endpoints */}
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="w-full max-w-xs">
              <input
                type="text"
                placeholder="Search assigned endpoints..."
                class="input input-bordered input-xs w-full"
                x-model="assignedSearch"
              />
            </div>
            <button
              type="button"
              class="btn btn-error btn-xs"
              x-show="selectedToDelete.length > 0"
              x-cloak
              x-on:click="deleteSelected()"
            >
              Remove Selected (<span x-text="selectedToDelete.length"></span>)
            </button>
          </div>

          <div class="overflow-x-auto border border-base-300 rounded-box max-h-64 overflow-y-auto">
            <table id={`role-endpoints-table-${roleId}`} class="table table-xs table-zebra table-pin-rows w-full">
              <thead>
                <tr class="bg-base-200">
                  <th class="w-8 text-center">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      x-on:click="toggleSelectAllAssigned()"
                      x-bind:checked="isAllAssignedSelected()"
                    />
                  </th>
                  <th>Endpoint Route</th>
                  <th class="w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr
                    class="hover"
                    key={mapping.endpoint_id}
                    x-show={`!assignedSearch.trim() || ${JSON.stringify(mapping.title.toLowerCase())}.includes(assignedSearch.toLowerCase())`}
                  >
                    <td class="text-center">
                      <input
                        type="checkbox"
                        value={mapping.endpoint_id}
                        x-model="selectedToDelete"
                        class="checkbox checkbox-xs"
                      />
                    </td>
                    <td class="font-mono text-xs">{mapping.title}</td>
                    <td class="text-right">
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs text-error"
                        hx-delete={`/dashboard/admin/roles/${roleId}/endpoints/${mapping.endpoint_id}`}
                        hx-target={`#role-endpoints-section-${roleId}`}
                        hx-swap="outerHTML"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={3} class="text-center py-4 text-xs text-base-content/60">
                      No assigned endpoints for this role.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const valuesFrom = (body: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value.map((v) => (typeof v === "string" ? v : v instanceof File ? v.name : null)).filter(Boolean).join(",")
          : typeof value === "string"
          ? value
          : value instanceof File
          ? value.name
          : null,
      ])
    ) as Row;

  const formFailure = (resource: keyof typeof config, message: string, values: Row, id?: string) => (
    <>
      {form(resource, id, values, message)}
      {toast("admin.error", message, "error")}
    </>
  );

  const failForm = (c: Context, resource: keyof typeof config, message: string, values: Row, id?: string, status: 400 | 403 = 400) => {
    c.header("HX-Retarget", "#modal");
    c.header("HX-Reswap", "innerHTML");
    return c.html(formFailure(resource, message, values, id), status);
  };

  const validate = (resource: keyof typeof config, values: Row, editing = false) => {
    if (resource === "users") {
      if (!String(values.email ?? "").includes("@")) return "A valid email is required.";
      if (!editing && !String(values.password ?? "")) return "Password is required.";
      if (!db.query("SELECT 1 FROM roles WHERE id=? AND deleted_at IS NULL").get(String(values.role_id))) return "Choose a valid role.";
    }
    if (resource === "meets" && (!String(values.title ?? "").trim() || !values.scheduled_date || !values.scheduled_time)) return "Scheduled date and time are required.";
    if (["tags", "roles", "endpoints"].includes(resource) && !String(values.title ?? "").trim()) return "Title is required.";
    return null;
  };

  const isSuperAdmin = (c: Context) =>
    (c.get("auth") as { role_id: string }).role_id === db.query<{ id: string }, []>("SELECT id FROM roles WHERE title='Super Admin' AND deleted_at IS NULL").get()?.id;

  for (const resource of Object.keys(config) as (keyof typeof config)[]) {
    const { table, columns, fields } = config[resource];
    app.get(`/${resource}`, (c) => {
      const locale = getLocale(c);
      const tz = getTimezone(c);
      const tableComponent = (
        <CrudTable
          resource={resource}
          columns={[...columns]}
          searchFields={[...config[resource].searchFields]}
          rows={rowsFor(resource, c.req.query())}
          query={c.req.query()}
          locale={locale}
          timeZone={tz}
        />
      );
      return c.req.header("HX-Request") ? c.html(tableComponent) : page(c, resource, tableComponent);
    });

    app.get(`/${resource}/new`, (c) => c.html(form(resource)));

    app.get(`/${resource}/:id/edit`, (c) => {
      const editable = resource === "users" ? fields.filter((field) => field !== "password") : fields;
      const row = db.query(`SELECT ${editable.join(", ")} FROM ${table} WHERE id=? AND deleted_at IS NULL`).get(c.req.param("id")) as Row | null;
      return row ? c.html(form(resource, c.req.param("id"), row)) : c.notFound();
    });

    app.get(`/${resource}/:id/confirm`, (c) => {
      const locale = getLocale(c);
      const id = c.req.param("id");
      const titleCol = resource === "users" ? "email" : "title";
      const row = db.query(`SELECT ${titleCol} as title FROM ${table} WHERE id=? AND deleted_at IS NULL`).get(id) as { title?: string } | null;
      return c.html(
        <AdminConfirmDeleteModal
          resource={resource}
          id={id}
          title={row?.title}
          locale={locale}
        />
      );
    });

    app.post(`/${resource}/bulk-confirm`, async (c) => {
      const locale = getLocale(c);
      const body = await c.req.parseBody({ all: true });
      const rawIds = body["ids"] || body["ids[]"];
      const ids = (Array.isArray(rawIds) ? rawIds : rawIds ? [rawIds] : []).map(String).filter(Boolean);
      if (!ids.length) {
        return c.html(
          toast("admin.nothing_selected", "Select at least one record.", "warning"),
          400
        );
      }
      const titleCol = resource === "users" ? "email" : "title";
      const placeholders = ids.map(() => "?").join(",");
      const rows = db.query(`SELECT id, ${titleCol} as label FROM ${table} WHERE id IN (${placeholders}) AND deleted_at IS NULL`).all(...ids) as { id: string; label: string }[];
      return c.html(
        <AdminBulkConfirmDeleteModal
          resource={resource}
          items={rows.length ? rows : ids.map((id) => ({ id, label: id }))}
          locale={locale}
        />
      );
    });

    app.post(`/${resource}`, async (c) => {
      const body = await c.req.parseBody({ all: true });
      const submitted = valuesFrom(body);

      // Normalize numeric & date/time inputs to English digits
      for (const key of Object.keys(submitted)) {
        if (typeof submitted[key] === "string" && (key.includes("date") || key.includes("time") || key.includes("phone") || key === "duration_minutes")) {
          submitted[key] = toEnglishDigits(submitted[key]);
        }
      }

      const error = validate(resource, submitted);
      if (error) return failForm(c, resource, error, submitted);

      if (resource === "meets") {
        if (body.image_file instanceof File && body.image_file.size > 0) {
          const uploadResult = await handleImageUpload(body.image_file);
          if (uploadResult.error) return failForm(c, resource, uploadResult.error, submitted);
          if (uploadResult.url) submitted.image_url = uploadResult.url;
        }
        if (body.presentation_file instanceof File && body.presentation_file.size > 0) {
          const uploadDoc = await handlePresentationUpload(body.presentation_file);
          if (uploadDoc.error) return failForm(c, resource, uploadDoc.error, submitted);
          if (uploadDoc.url) submitted.file_url = uploadDoc.url;
        }
        if (body.video_file instanceof File && body.video_file.size > 0) {
          const uploadVid = await handleVideoUpload(body.video_file);
          if (uploadVid.error) return failForm(c, resource, uploadVid.error, submitted);
          if (uploadVid.url) submitted.video_url = uploadVid.url;
        }
      }

      try {
        const id = generateId();
        if (resource === "users") {
          const password = String(body.password);
          const editable = config.users.fields.filter((field) => field !== "password");
          const values = editable.map((field) => String(submitted[field] ?? "").trim() || null);
          db.run(`INSERT INTO users (id,${editable.join(",")},password_hash) VALUES (?,${editable.map(() => "?").join(",")},?)`, [id, ...values, await Bun.password.hash(password)]);
        } else if (resource === "meets") {
          const scheduledAtUtc = submitted.scheduled_date && submitted.scheduled_time ? toUtcIso(String(submitted.scheduled_date), String(submitted.scheduled_time)) : null;
          const normalizedTopics = normalizeTopics(submitted.topics ? String(submitted.topics) : null);
          const meetFields = [...fields, "scheduled_at_utc"];
          const values = fields.map((field) => {
            const val = submitted[field];
            if (field === "topics") return JSON.stringify(normalizedTopics);
            if (field === "status") return String(val ?? "upcoming") || "upcoming";
            if (field === "access_status") return String(val ?? "public") || "public";
            if (field === "duration_minutes") return Number(toEnglishDigits(val ?? 60)) || 60;
            if (field === "description") return String(val ?? "");
            return String(val ?? "").trim() || null;
          });

          const rawTagIds = body.tag_ids || body["tag_ids[]"];
          const tagIds = (Array.isArray(rawTagIds) ? rawTagIds : rawTagIds ? [rawTagIds] : []).map(String).map((t) => t.trim()).filter(Boolean);
          const initialTagId = String(body.initial_tag_id ?? "").trim();
          if (initialTagId && !tagIds.includes(initialTagId)) {
            tagIds.push(initialTagId);
          }
          const initialUserId = String(body.initial_user_id ?? "").trim();

          db.transaction(() => {
            db.run(`INSERT INTO meets (id,${meetFields.join(",")}) VALUES (?,${meetFields.map(() => "?").join(",")})`, [id, ...values, scheduledAtUtc]);
            for (const tagId of tagIds) {
              if (validRelation("tags", tagId)) {
                db.run("INSERT OR IGNORE INTO meet_tags (meet_id,tag_id) VALUES (?,?)", [id, tagId]);
              }
            }
            if (initialUserId && validRelation("users", initialUserId)) {
              db.run("INSERT OR IGNORE INTO meet_attendees (meet_id,user_id) VALUES (?,?)", [id, initialUserId]);
            }
          })();

          refreshLandingCache(db);

          const adminAuth = c.get("auth") as { sub: string; role_id: string } | undefined;
          logger.meet("MEET_CREATED", {
            actor: { userId: adminAuth?.sub, role: adminAuth?.role_id, ip: c.req.header("x-forwarded-for") ?? "local" },
            data: { meetId: id, title: submitted.title, scheduledDate: submitted.scheduled_date, scheduledTime: submitted.scheduled_time, presenterId: submitted.presenter_id },
          });
        } else {
          const values = fields.map((field) => {
            const val = submitted[field];
            if (field === "description") return String(val ?? "");
            return String(val ?? "").trim() || null;
          });
          db.run(`INSERT INTO ${table} (id,${fields.join(",")}) VALUES (?,${fields.map(() => "?").join(",")})`, [id, ...values]);
        }
        return c.html(tableResponse(resource, "admin.created", "Created"));
      } catch {
        return failForm(c, resource, resource === "users" ? "That email, username, or phone is already used." : "A record with that title already exists.", submitted);
      }
    });

    app.post(`/${resource}/bulk-delete`, async (c) => {
      const body = await c.req.parseBody({ all: true });
      const rawIds = body["ids"] || body["ids[]"];
      const ids = (Array.isArray(rawIds) ? rawIds : rawIds ? [rawIds] : []).map(String).filter(Boolean);
      if (!ids.length) return c.html(<><CrudTable resource={resource} columns={[...columns]} searchFields={[...config[resource].searchFields]} rows={rowsFor(resource)} />{toast("admin.nothing_selected", "Select at least one record.", "warning")}</>, 400);
      for (const id of ids) {
        if (!(resource === "roles" && db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(id))) {
          db.run(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]);
          if (resource === "meets") {
            refreshLandingCache(db);
            const adminAuth = c.get("auth") as { sub: string; role_id: string } | undefined;
            logger.meet("MEET_DELETED", {
              actor: { userId: adminAuth?.sub, role: adminAuth?.role_id, ip: c.req.header("x-forwarded-for") ?? "local" },
              data: { meetId: id, bulk: true },
            });
          }
        }
      }
      return c.html(tableResponse(resource, "admin.deleted", "Deleted"));
    });

    app.post(`/${resource}/:id`, async (c) => {
      const body = await c.req.parseBody({ all: true });
      const submitted = valuesFrom(body);
      const id = c.req.param("id");

      // Normalize numeric & date/time inputs to English digits
      for (const key of Object.keys(submitted)) {
        if (typeof submitted[key] === "string" && (key.includes("date") || key.includes("time") || key.includes("phone") || key === "duration_minutes")) {
          submitted[key] = toEnglishDigits(submitted[key]);
        }
      }

      if (resource === "roles" && db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(id)) return failForm(c, resource, "The Super Admin role is protected.", submitted, id, 403);
      const error = validate(resource, submitted, true);
      if (error) return failForm(c, resource, error, submitted, id);

      if (resource === "meets") {
        const existingMeet = db.query<{ image_url: string | null; file_url: string | null; video_url: string | null }, [string]>("SELECT image_url, file_url, video_url FROM meets WHERE id=?").get(id);
        if (body.image_file instanceof File && body.image_file.size > 0) {
          const uploadResult = await handleImageUpload(body.image_file);
          if (uploadResult.error) return failForm(c, resource, uploadResult.error, submitted, id);
          if (uploadResult.url) submitted.image_url = uploadResult.url;
        } else if (submitted.image_url === undefined || submitted.image_url === null) {
          submitted.image_url = existingMeet?.image_url ?? null;
        }

        if (body.presentation_file instanceof File && body.presentation_file.size > 0) {
          const uploadDoc = await handlePresentationUpload(body.presentation_file);
          if (uploadDoc.error) return failForm(c, resource, uploadDoc.error, submitted, id);
          if (uploadDoc.url) submitted.file_url = uploadDoc.url;
        } else if (submitted.file_url === undefined || submitted.file_url === null) {
          submitted.file_url = existingMeet?.file_url ?? null;
        }

        if (body.video_file instanceof File && body.video_file.size > 0) {
          const uploadVid = await handleVideoUpload(body.video_file);
          if (uploadVid.error) return failForm(c, resource, uploadVid.error, submitted, id);
          if (uploadVid.url) submitted.video_url = uploadVid.url;
        } else if (submitted.video_url === undefined || submitted.video_url === null) {
          submitted.video_url = existingMeet?.video_url ?? null;
        }
      }

      try {
        if (resource === "users") {
          const editable = config.users.fields.filter((field) => field !== "password");
          const values = editable.map((field) => String(submitted[field] ?? "").trim() || null);
          const password = String(body.password ?? "");
          db.run(`UPDATE users SET ${editable.map((field) => `${field}=?`).join(",")}${password ? ",password_hash=?" : ""},updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, ...(password ? [await Bun.password.hash(password)] : []), id]);
        } else if (resource === "meets") {
          const scheduledAtUtc = submitted.scheduled_date && submitted.scheduled_time ? toUtcIso(String(submitted.scheduled_date), String(submitted.scheduled_time)) : null;
          const normalizedTopics = normalizeTopics(submitted.topics ? String(submitted.topics) : null);
          const meetFields = [...fields, "scheduled_at_utc"];
          const values = fields.map((field) => {
            const val = submitted[field];
            if (field === "topics") return JSON.stringify(normalizedTopics);
            if (field === "status") return String(val ?? "upcoming") || "upcoming";
            if (field === "access_status") return String(val ?? "public") || "public";
            if (field === "duration_minutes") return Number(toEnglishDigits(val ?? 60)) || 60;
            if (field === "description") return String(val ?? "");
            return String(val ?? "").trim() || null;
          });

          // Sync tags when editing meet
          const rawTagIds = body.tag_ids || body["tag_ids[]"];
          const tagIds = (Array.isArray(rawTagIds) ? rawTagIds : rawTagIds ? [rawTagIds] : []).map(String).map((t) => t.trim()).filter(Boolean);

          db.transaction(() => {
            db.run(`UPDATE meets SET ${meetFields.map((field) => `${field}=?`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, scheduledAtUtc, id]);
            db.run("DELETE FROM meet_tags WHERE meet_id=?", [id]);
            for (const tagId of tagIds) {
              if (validRelation("tags", tagId)) {
                db.run("INSERT OR IGNORE INTO meet_tags (meet_id,tag_id) VALUES (?,?)", [id, tagId]);
              }
            }
          })();

          refreshLandingCache(db);

          const adminAuth = c.get("auth") as { sub: string; role_id: string } | undefined;
          logger.meet("MEET_UPDATED", {
            actor: { userId: adminAuth?.sub, role: adminAuth?.role_id, ip: c.req.header("x-forwarded-for") ?? "local" },
            data: { meetId: id, title: submitted.title, status: submitted.status, accessStatus: submitted.access_status },
          });
        } else {
          const values = fields.map((field) => {
            const val = submitted[field];
            if (field === "description") return String(val ?? "");
            return String(val ?? "").trim() || null;
          });
          db.run(`UPDATE ${table} SET ${fields.map((field) => `${field}=?`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...values, id]);
        }
        return c.html(tableResponse(resource, "admin.created", "Updated"));
      } catch {
        return failForm(c, resource, resource === "users" ? "That email, username, or phone is already used." : "A record with that title already exists.", submitted, id);
      }
    });

    app.delete(`/${resource}/:id`, (c) => {
      const id = c.req.param("id");
      if (resource === "roles" && db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(id)) return c.html(toast("admin.super_admin_protected", "Protected"), 403);
      db.run(`UPDATE ${table} SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [id]);
      if (resource === "meets") {
        refreshLandingCache(db);
        const adminAuth = c.get("auth") as { sub: string; role_id: string } | undefined;
        logger.meet("MEET_DELETED", {
          actor: { userId: adminAuth?.sub, role: adminAuth?.role_id, ip: c.req.header("x-forwarded-for") ?? "local" },
          data: { meetId: id },
        });
      }
      return c.html(tableResponse(resource, "admin.deleted", "Deleted"));
    });
  }

  const validRelation = (table: "tags" | "users", id: string) => !!db.query(`SELECT 1 FROM ${table} WHERE id=? AND deleted_at IS NULL`).get(id);

  app.post("/meets/:id/tags", async (c) => {
    const meetId = c.req.param("id");
    const tagId = String((await c.req.parseBody()).tag_id);
    if (!validRelation("tags", tagId)) return c.html(<>{relationPanel(meetId)}{toast("admin.invalid_relation", "Choose a valid tag.", "error")}</>, 400);
    db.run("INSERT OR IGNORE INTO meet_tags (meet_id,tag_id) VALUES (?,?)", [meetId, tagId]);
    refreshLandingCache(db);
    return c.html(<>{relationPanel(meetId)}{toast("admin.created", "Tag added.")}</>);
  });

  app.delete("/meets/:id/tags/:tagId", (c) => {
    const meetId = c.req.param("id");
    db.run("DELETE FROM meet_tags WHERE meet_id=? AND tag_id=?", [meetId, c.req.param("tagId")]);
    refreshLandingCache(db);
    return c.html(<>{relationPanel(meetId)}{toast("admin.deleted", "Tag removed.")}</>);
  });

  app.post("/meets/:id/attendees", async (c) => {
    const meetId = c.req.param("id");
    const userId = String((await c.req.parseBody()).user_id);
    if (!validRelation("users", userId)) return c.html(<>{relationPanel(meetId)}{toast("admin.invalid_relation", "Choose a valid attendee.", "error")}</>, 400);
    db.run("INSERT OR IGNORE INTO meet_attendees (meet_id,user_id) VALUES (?,?)", [meetId, userId]);
    refreshLandingCache(db);
    return c.html(<>{relationPanel(meetId)}{toast("admin.created", "Attendee added.")}</>);
  });

  app.delete("/meets/:id/attendees/:userId", (c) => {
    const meetId = c.req.param("id");
    db.run("DELETE FROM meet_attendees WHERE meet_id=? AND user_id=?", [meetId, c.req.param("userId")]);
    refreshLandingCache(db);
    return c.html(<>{relationPanel(meetId)}{toast("admin.deleted", "Attendee removed.")}</>);
  });

  app.post("/roles/:id/endpoints", async (c) => {
    const roleId = c.req.param("id");
    const body = await c.req.parseBody({ all: true });
    const rawIds = body["endpoint_ids"] ?? body["endpoint_ids[]"] ?? body["endpoint_id"] ?? body["endpoint_id[]"];
    const endpointIds = (Array.isArray(rawIds) ? rawIds : rawIds ? [rawIds] : []).filter(Boolean).map(String);
    const role = db.query("SELECT title,description FROM roles WHERE id=? AND deleted_at IS NULL").get(roleId) as Row | null;
    if (!role) return c.notFound();
    if (db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(roleId)) {
      return c.html(<>{roleEndpointsResponse(roleId)}{toast("admin.error", "The Super Admin role is managed by the system.", "error")}</>, 403);
    }
    const validEndpoints = endpointIds.filter((epId) => db.query("SELECT 1 FROM endpoints WHERE id=? AND deleted_at IS NULL").get(epId));
    if (validEndpoints.length === 0) {
      return c.html(<>{roleEndpointsResponse(roleId)}{toast("admin.invalid_relation", "Choose a valid endpoint.", "error")}</>, 400);
    }

    for (const endpointId of validEndpoints) {
      db.run("INSERT OR IGNORE INTO role_endpoints (id,role_id,endpoint_id,description) VALUES (?,?,?,?)", [generateId(), roleId, endpointId, "Assigned by admin"]);
    }
    clearPermissionCache(roleId);
    return c.html(roleEndpointsResponse(roleId, "admin.created", `${validEndpoints.length > 1 ? "Endpoints" : "Endpoint"} assigned.`));
  });

  app.delete("/roles/:id/endpoints/bulk-delete", async (c) => {
    const roleId = c.req.param("id");
    let rawIds: any = null;
    try {
      const body = await c.req.parseBody({ all: true });
      rawIds = body["endpoint_ids"] ?? body["endpoint_ids[]"] ?? body["endpoint_id"];
    } catch {}
    if (!rawIds) {
      const queries = c.req.queries("endpoint_ids") ?? c.req.queries("endpoint_ids[]") ?? c.req.queries("endpoint_id");
      if (queries && queries.length) {
        rawIds = queries;
      } else {
        rawIds = c.req.query("endpoint_ids") ?? c.req.query("endpoint_ids[]") ?? c.req.query("endpoint_id");
      }
    }
    const endpointIds = (Array.isArray(rawIds) ? rawIds : rawIds ? [rawIds] : []).filter(Boolean).map(String);
    const role = db.query("SELECT title,description FROM roles WHERE id=? AND deleted_at IS NULL").get(roleId) as Row | null;
    if (!role) return c.notFound();
    if (db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(roleId)) {
      return c.html(<>{roleEndpointsResponse(roleId)}{toast("admin.error", "The Super Admin role is managed by the system.", "error")}</>, 403);
    }
    if (endpointIds.length === 0) {
      return c.html(<>{roleEndpointsResponse(roleId)}{toast("admin.nothing_selected", "Select at least one endpoint to remove.", "warning")}</>, 400);
    }

    const placeholders = endpointIds.map(() => "?").join(",");
    db.run(`DELETE FROM role_endpoints WHERE role_id=? AND endpoint_id IN (${placeholders})`, [roleId, ...endpointIds]);
    clearPermissionCache(roleId);
    return c.html(roleEndpointsResponse(roleId, "admin.deleted", `${endpointIds.length} endpoint${endpointIds.length > 1 ? "s" : ""} removed.`));
  });

  app.delete("/roles/:id/endpoints/:endpointId", (c) => {
    const roleId = c.req.param("id");
    const role = db.query("SELECT title,description FROM roles WHERE id=? AND deleted_at IS NULL").get(roleId) as Row | null;
    if (!role) return c.notFound();
    if (db.query("SELECT 1 FROM roles WHERE id=? AND title='Super Admin'").get(roleId)) {
      return c.html(<>{roleEndpointsResponse(roleId)}{toast("admin.error", "The Super Admin role is managed by the system.", "error")}</>, 403);
    }
    db.run("DELETE FROM role_endpoints WHERE role_id=? AND endpoint_id=?", [roleId, c.req.param("endpointId")]);
    clearPermissionCache(roleId);
    return c.html(roleEndpointsResponse(roleId, "admin.deleted", "Endpoint removed."));
  });

  app.get("/roles/:id/endpoints/new", (c) =>
    c.html(
      <form class="flex gap-2" hx-post={`/dashboard/admin/roles/${c.req.param("id")}/endpoints`} hx-target="this">
        <select name="endpoint_id" class="select select-bordered">
          {db.query<{ id: string; title: string }, []>("SELECT id,title FROM endpoints WHERE deleted_at IS NULL ORDER BY title").all().map((endpoint) => (
            <option value={endpoint.id} key={endpoint.id}>{endpoint.title}</option>
          ))}
        </select>
        <button class="btn btn-primary">Assign endpoint</button>
      </form>
    )
  );

  app.get("/report", (c) => {
    if (!isSuperAdmin(c)) return c.html(<p class="alert alert-error">Forbidden</p>, 403);
    const schema = <SchemaTable database={db} query={c.req.query()} />;
    if (c.req.header("HX-Request")) return c.html(schema);
    return page(
      c,
      "SQL report",
      <div class="space-y-6">
        <div class="card border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-base-content">Read-only SQL Report</h1>
              <p class="text-xs text-base-content/60 mt-0.5">
                Run ad-hoc analytical SELECT and WITH queries across all system tables.
              </p>
            </div>

            {/* Quick Template Queries */}
            <div class="flex flex-wrap gap-2" x-data="{}">
              <span class="text-xs font-semibold text-base-content/60 self-center">Templates:</span>
              <button
                type="button"
                class="btn btn-outline btn-xs font-mono"
                x-on:click="document.getElementById('sql-input').value = 'SELECT m.id, m.title, m.status, count(ma.user_id) as attendee_count FROM meets m LEFT JOIN meet_attendees ma ON ma.meet_id = m.id GROUP BY m.id ORDER BY attendee_count DESC;'"
              >
                Meets & Attendee Counts
              </button>
              <button
                type="button"
                class="btn btn-outline btn-xs font-mono"
                x-on:click="document.getElementById('sql-input').value = 'SELECT mv.id, mv.meet_id, m.title as meet_title, p.name as platform_name, mv.created_at FROM meet_visits mv JOIN meets m ON m.id = mv.meet_id LEFT JOIN platforms p ON p.id = mv.platform_id ORDER BY mv.created_at DESC LIMIT 50;'"
              >
                Traffic by Platform
              </button>
              <button
                type="button"
                class="btn btn-outline btn-xs font-mono"
                x-on:click="document.getElementById('sql-input').value = 'SELECT u.id, u.email, u.username, r.title as role_name, u.created_at FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC;'"
              >
                User & Roles
              </button>
            </div>

            <form hx-post="/dashboard/admin/report" hx-target="#report-result" class="space-y-4">
              <textarea
                id="sql-input"
                class="textarea textarea-bordered w-full font-mono text-xs leading-relaxed focus:border-primary"
                name="sql"
                rows={4}
                placeholder="SELECT * FROM meet_visits JOIN platforms ON platform_id = platforms.id;"
                required
              ></textarea>
              <div class="flex justify-end gap-2">
                <button type="reset" class="btn btn-ghost btn-sm">Clear</button>
                <button class="btn btn-primary btn-sm">Run Query</button>
              </div>
            </form>
          </div>
        </div>

        <div id="report-result"></div>

        <div class="card border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body p-6">
            <h2 class="text-xl font-bold tracking-tight text-base-content mb-4">Database Schema</h2>
            {schema}
          </div>
        </div>
      </div>
    );
  });

  app.post("/report", async (c) => {
    if (!isSuperAdmin(c)) return c.html(toast("admin.forbidden", "Forbidden", "error"), 403);
    const valid = validateReportSql(String((await c.req.parseBody()).sql ?? ""));
    if (!/^(select|with)\b/i.test(valid)) return c.html(<>{<div id="report-result"></div>}{toast("admin.report_error", valid, "error")}</>, 400);
    try {
      const rows = db.query(`SELECT * FROM (${valid}) LIMIT 200`).all() as Row[];
      const columns = Object.keys(rows[0] ?? {});
      return c.html(
        <div id="report-result" class="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <table class="table table-zebra table-sm">
            <thead class="bg-base-200/50 text-xs font-semibold uppercase tracking-wider text-base-content/70">
              <tr>
                {columns.map((column) => (
                  <th key={column} class="font-mono text-xs">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={String(row.id ?? idx)} class="hover">
                  {columns.map((column) => (
                    <td key={column} class="text-xs font-mono">{String(row[column] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p class="mt-3 text-xs text-base-content/60">{rows.length} row(s) returned (maximum 200).</p>
        </div>
      );
    } catch {
      return c.html(<>{<div id="report-result"></div>}{toast("admin.report_error", "Query could not be run.", "error")}</>, 400);
    }
  });

  // Mail Management Dashboard Routes
  const renderMailerPage = (c: Context<AdminEnv>) => {
    const stats = mailService.getStats();
    const buffer = mailService.getBuffer();
    const tags = getAllTags(db);
    const users = db
      .query<{ id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }, []>(
        "SELECT id, email, first_name, last_name, username FROM users WHERE deleted_at IS NULL ORDER BY email ASC"
      )
      .all();

    return page(c, "Mail Management", <MailerDashboardView stats={stats} buffer={buffer} tags={tags} users={users} />);
  };

  app.get("/mailer", async (c) => renderMailerPage(c));
  app.get("/mail-management", async (c) => renderMailerPage(c));

  // Mail Editor Dashboard Routes
  app.get("/mail-editor", async (c) => {
    const locale = getLocale(c);
    const tz = getTimezone(c);
    const templates = db
      .query<EmailTemplateRow, []>(
        "SELECT id, title, subject, format, value, description, created_at, updated_at, deleted_at FROM emails_schema WHERE deleted_at IS NULL ORDER BY updated_at DESC"
      )
      .all();
    return page(c, "Mail Editor", <MailEditorView templates={templates} locale={locale} timeZone={tz} />);
  });

  // Warehouse Center - Platforms Data & Funnel Routes
  app.get("/platforms-data", async (c) => {
    const pageNum = parseInt(c.req.query("page") ?? "1", 10);
    const platform = c.req.query("platform") || undefined;
    const q = c.req.query("q") || undefined;
    const stats = getPlatformFunnelStats(db, { page: pageNum, platform, q });
    const locale = getLocale(c);
    const tz = getTimezone(c);

    const isHtmx = Boolean(c.req.header("hx-request"));
    if (isHtmx) {
      return c.html(<PlatformsDataView stats={stats} query={{ page: String(pageNum), platform, q }} locale={locale} timeZone={tz} />);
    }

    return page(
      c,
      "Platforms Data",
      <PlatformsDataView stats={stats} query={{ page: String(pageNum), platform, q }} locale={locale} timeZone={tz} />
    );
  });

  app.post("/platforms-data/delete-visit", async (c) => {
    const id = c.req.query("id");
    if (id) {
      db.run("DELETE FROM meet_visits WHERE id = ?", [id]);
    }
    return c.body(null, 200);
  });

  app.post("/platforms-data/bulk-delete-visits", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const rawIds = body["ids"] || body["ids[]"];
    const ids = (Array.isArray(rawIds) ? rawIds : rawIds ? [rawIds] : []).map(String).filter(Boolean);

    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      db.run(`DELETE FROM meet_visits WHERE id IN (${placeholders})`, ids);
    }

    const stats = getPlatformFunnelStats(db);
    const locale = getLocale(c);
    return c.html(
      <>
        <PlatformsDataView stats={stats} locale={locale} />
        {toast("admin.deleted", `${ids.length} visit record(s) deleted.`)}
      </>
    );
  });

  app.post("/mail-editor/save", async (c) => {
    const body = await c.req.parseBody();
    const id = String(body.id ?? "").trim();
    const title = String(body.title ?? "").trim().toLowerCase();
    const subject = String(body.subject ?? "").trim();
    const format = (String(body.format ?? "html") as "html" | "markdown" | "text");
    const description = String(body.description ?? "").trim();
    const value = String(body.value ?? "");

    if (!title || !value) {
      const templates = db.query<EmailTemplateRow, []>("SELECT id, title, subject, format, value, description, created_at, updated_at, deleted_at FROM emails_schema WHERE deleted_at IS NULL ORDER BY updated_at DESC").all();
      return page(c, "Mail Editor", <><MailEditorView templates={templates} />{toast("admin.error", "Template title and body are required.", "error")}</>);
    }

    try {
      if (id) {
        db.run(
          "UPDATE emails_schema SET title=?, subject=?, format=?, description=?, value=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
          [title, subject, format, description, value, id]
        );
      } else {
        const existing = db.query<{ id: string }, [string]>("SELECT id FROM emails_schema WHERE title=? AND deleted_at IS NULL").get(title);
        if (existing) {
          db.run(
            "UPDATE emails_schema SET subject=?, format=?, description=?, value=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            [subject, format, description, value, existing.id]
          );
        } else {
          db.run(
            "INSERT INTO emails_schema (id, title, subject, format, description, value) VALUES (?, ?, ?, ?, ?, ?)",
            [generateId(), title, subject, format, description, value]
          );
        }
      }
      const templates = db.query<EmailTemplateRow, []>("SELECT id, title, subject, format, value, description, created_at, updated_at, deleted_at FROM emails_schema WHERE deleted_at IS NULL ORDER BY updated_at DESC").all();
      return page(c, "Mail Editor", <><MailEditorView templates={templates} />{toast("admin.created", "Email template saved.")}</>);
    } catch {
      const templates = db.query<EmailTemplateRow, []>("SELECT id, title, subject, format, value, description, created_at, updated_at, deleted_at FROM emails_schema WHERE deleted_at IS NULL ORDER BY updated_at DESC").all();
      return page(c, "Mail Editor", <><MailEditorView templates={templates} />{toast("admin.error", "Could not save template with this identifier.", "error")}</>);
    }
  });

  app.post("/mail-editor/delete", async (c) => {
    const id = c.req.query("id");
    if (id) {
      db.run("UPDATE emails_schema SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
    }
    const templates = db.query<EmailTemplateRow, []>("SELECT id, title, subject, format, value, description, created_at, updated_at, deleted_at FROM emails_schema WHERE deleted_at IS NULL ORDER BY updated_at DESC").all();
    return page(c, "Mail Editor", <><MailEditorView templates={templates} />{toast("admin.deleted", "Template deleted.")}</>);
  });

  // Mail Scheduler Dashboard Routes
  const getMailSchedulerState = () => ({
    scheduledList: db.query<ScheduledEmailRow, []>("SELECT * FROM scheduled_emails WHERE deleted_at IS NULL ORDER BY scheduled_for DESC").all(),
    automationRules: db.query<EmailAutomationRuleRow, []>("SELECT * FROM email_automation_rules WHERE deleted_at IS NULL ORDER BY created_at ASC").all(),
    templates: db.query<EmailTemplateRow, []>("SELECT * FROM emails_schema WHERE deleted_at IS NULL ORDER BY title ASC").all(),
    tags: getAllTags(db),
    users: db.query<{ id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }, []>("SELECT id, email, first_name, last_name, username FROM users WHERE deleted_at IS NULL ORDER BY email ASC").all(),
  });

  const renderMailScheduler = (c: Context, toastElement?: ReturnType<typeof toast>) => {
    const data = getMailSchedulerState();
    const locale = getLocale(c);
    const tz = getTimezone(c);
    return page(
      c,
      "Mail Automation & Scheduler",
      <>
        <MailSchedulerView {...data} locale={locale} timeZone={tz} />
        {toastElement}
      </>
    );
  };

  app.get("/mail-scheduler", async (c) => renderMailScheduler(c));

  app.post("/mail-scheduler/rules/:id/toggle", async (c) => {
    const id = c.req.param("id");
    const rule = db.query<EmailAutomationRuleRow, [string]>("SELECT * FROM email_automation_rules WHERE id = ? AND deleted_at IS NULL").get(id);
    if (rule) {
      const nextState = rule.is_enabled ? 0 : 1;
      db.run("UPDATE email_automation_rules SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [nextState, id]);
    }
    const updatedRule = db.query<EmailAutomationRuleRow, [string]>("SELECT * FROM email_automation_rules WHERE id = ? AND deleted_at IS NULL").get(id);
    const isHtmx = c.req.header("hx-request") === "true";
    if (isHtmx && updatedRule) {
      const templates = db.query<EmailTemplateRow, []>("SELECT * FROM emails_schema WHERE deleted_at IS NULL ORDER BY title ASC").all();
      return c.html(
        <>
          <AutomationRuleCard rule={updatedRule} templates={templates} />
          {toast("admin.created", updatedRule.is_enabled ? "Trigger enabled." : "Trigger disabled.")}
        </>
      );
    }
    return renderMailScheduler(c, toast("admin.created", "Rule status updated."));
  });

  app.post("/mail-scheduler/rules/:id/update", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const templateTitle = String(body.templateTitle ?? "").trim() || null;
    const rule = db.query<EmailAutomationRuleRow, [string]>("SELECT * FROM email_automation_rules WHERE id = ? AND deleted_at IS NULL").get(id);

    if (rule) {
      let config: any = {};
      try {
        config = JSON.parse(rule.schedule_config || "{}");
      } catch {}

      if (typeof body.daysAhead !== "undefined") {
        config.days_ahead = Number(body.daysAhead) || 0;
      }

      db.run(
        "UPDATE email_automation_rules SET template_title = ?, schedule_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [templateTitle, JSON.stringify(config), id]
      );
    }
    const updatedRule = db.query<EmailAutomationRuleRow, [string]>("SELECT * FROM email_automation_rules WHERE id = ? AND deleted_at IS NULL").get(id);
    const isHtmx = c.req.header("hx-request") === "true";
    if (isHtmx && updatedRule) {
      const templates = db.query<EmailTemplateRow, []>("SELECT * FROM emails_schema WHERE deleted_at IS NULL ORDER BY title ASC").all();
      return c.html(
        <>
          <AutomationRuleCard rule={updatedRule} templates={templates} />
          {toast("admin.created", "Trigger configuration saved.")}
        </>
      );
    }
    return renderMailScheduler(c, toast("admin.created", "Trigger configuration saved."));
  });

  app.post("/mail-scheduler/rules/:id/trigger", async (c) => {
    const id = c.req.param("id");
    const rule = db.query<EmailAutomationRuleRow, [string]>("SELECT * FROM email_automation_rules WHERE id = ? AND deleted_at IS NULL").get(id);

    if (rule) {
      let config: any = {};
      try {
        config = JSON.parse(rule.schedule_config || "{}");
      } catch {}

      const templateTitle = rule.template_title || undefined;

      if (rule.rule_key === "tag_reminder") {
        const daysAhead = typeof config.days_ahead === "number" ? config.days_ahead : 1;
        await mailService.sendFavoriteTagMeetReminders(db, daysAhead, undefined, templateTitle);
      } else if (rule.rule_key === "rsvp_reminder") {
        const daysAhead = typeof config.days_ahead === "number" ? config.days_ahead : 0;
        const target = new Date();
        target.setDate(target.getDate() + daysAhead);
        const targetDateStr = target.toISOString().slice(0, 10);
        const meets = db.query<{ id: string }, [string]>("SELECT id FROM meets WHERE scheduled_date = ? AND status = 'upcoming' AND deleted_at IS NULL").all(targetDateStr);
        for (const { id: meetId } of meets) {
          await mailService.sendMeetAttendeesReminder(db, meetId, undefined, templateTitle);
        }
      } else if (rule.rule_key === "welcome_email") {
        const auth = c.get("auth");
        const adminUser = auth?.sub
          ? db
              .query<{ email: string; first_name: string | null; username: string | null }, [string]>(
                "SELECT email, first_name, username FROM users WHERE id = ? AND deleted_at IS NULL"
              )
              .get(auth.sub)
          : null;
        if (adminUser?.email) {
          await mailService.sendWelcomeEmail(
            { email: adminUser.email, firstName: adminUser.first_name || "Admin", username: adminUser.username || "admin" },
            undefined,
            db
          );
        }
      }
      db.run("UPDATE email_automation_rules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    }
    const updatedRule = db.query<EmailAutomationRuleRow, [string]>("SELECT * FROM email_automation_rules WHERE id = ? AND deleted_at IS NULL").get(id);
    const isHtmx = c.req.header("hx-request") === "true";
    if (isHtmx && updatedRule) {
      const templates = db.query<EmailTemplateRow, []>("SELECT * FROM emails_schema WHERE deleted_at IS NULL ORDER BY title ASC").all();
      return c.html(
        <>
          <AutomationRuleCard rule={updatedRule} templates={templates} />
          {toast("admin.created", "Trigger executed successfully.")}
        </>
      );
    }
    return renderMailScheduler(c, toast("admin.created", "Trigger executed successfully."));
  });

  app.post("/mail-scheduler/schedule", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const title = String(body.title ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const emailBody = String(body.body ?? "").trim();
    const format = String(body.format ?? "html") as "html" | "markdown" | "text";
    const targetMode = String(body.targetMode ?? "all") as "all" | "tags" | "domain" | "selected";
    const templateId = String(body.templateId ?? "").trim() || null;
    const scheduledFor = String(body.scheduledFor ?? "").trim();

    if (!title || !subject || !emailBody || !scheduledFor) {
      return renderMailScheduler(c, toast("admin.error", "Title, subject, body, and schedule time are required.", "error"));
    }

    let payloadObj: any = {};
    if (targetMode === "tags") {
      let tagIds: string[] = [];
      if (Array.isArray(body.tagIds)) tagIds = body.tagIds.map(String);
      else if (typeof body.tagIds === "string" && body.tagIds.trim()) tagIds = [body.tagIds.trim()];
      payloadObj.tagIds = tagIds;
    } else if (targetMode === "selected") {
      let userIds: string[] = [];
      if (Array.isArray(body.userIds)) userIds = body.userIds.map(String);
      else if (typeof body.userIds === "string" && body.userIds.trim()) userIds = [body.userIds.trim()];
      payloadObj.userIds = userIds;
    } else if (targetMode === "domain") {
      payloadObj.domain = String(body.domain ?? "").trim();
    }

    db.run(
      `INSERT INTO scheduled_emails (id, template_id, title, subject, format, body, target_mode, target_payload, scheduled_for, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [generateId(), templateId, title, subject, format, emailBody, targetMode, JSON.stringify(payloadObj), new Date(scheduledFor).toISOString()]
    );

    return renderMailScheduler(c, toast("admin.created", "Broadcast scheduled successfully."));
  });

  app.post("/mail-scheduler/cancel", async (c) => {
    const id = c.req.query("id");
    if (id) {
      db.run("UPDATE scheduled_emails SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'", [id]);
    }
    return renderMailScheduler(c, toast("admin.created", "Scheduled broadcast cancelled."));
  });

  app.post("/mail-scheduler/repeat", async (c) => {
    const id = c.req.query("id");
    if (id) {
      const job = db.query<ScheduledEmailRow, [string]>("SELECT * FROM scheduled_emails WHERE id=? AND deleted_at IS NULL").get(id);
      if (job) {
        db.run(
          `INSERT INTO scheduled_emails (id, template_id, title, subject, format, body, target_mode, target_payload, scheduled_for, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [generateId(), job.template_id, `${job.title} (Repeated)`, job.subject, job.format, job.body, job.target_mode, job.target_payload, new Date().toISOString()]
        );
      }
    }
    return renderMailScheduler(c, toast("admin.created", "Broadcast repeated and added to queue."));
  });

  app.post("/mail-scheduler/delete", async (c) => {
    const id = c.req.query("id");
    if (id) {
      db.run("UPDATE scheduled_emails SET deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
    }
    return renderMailScheduler(c, toast("admin.deleted", "Scheduled broadcast deleted."));
  });

  app.post("/mailer/send", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const targetMode = String(body.targetMode ?? "all") as "all" | "tags" | "domain" | "selected";
    const subject = String(body.subject ?? "").trim();
    const emailBody = String(body.body ?? "").trim();
    const format = String(body.format ?? "html") as "html" | "text";

    if (!subject || !emailBody) {
      return c.html(<div class="alert alert-error text-xs">Subject and email body are required.</div>, 400);
    }

    let tagIds: string[] = [];
    if (Array.isArray(body.tagIds)) tagIds = body.tagIds.map(String);
    else if (typeof body.tagIds === "string" && body.tagIds.trim()) tagIds = [body.tagIds.trim()];

    let userIds: string[] = [];
    if (Array.isArray(body.userIds)) userIds = body.userIds.map(String);
    else if (typeof body.userIds === "string" && body.userIds.trim()) userIds = [body.userIds.trim()];

    const domain = String(body.domain ?? "").trim();

    const attachments: import("../mailer/types").EmailAttachment[] = [];
    if (body.attachment instanceof File && body.attachment.size > 0) {
      const buffer = Buffer.from(await body.attachment.arrayBuffer());
      attachments.push({
        filename: body.attachment.name,
        content: buffer,
        contentType: body.attachment.type || "application/octet-stream",
      });
    }

    try {
      const count = await mailService.sendBatchEmails(
        db,
        {
          mode: targetMode,
          tagIds,
          domain,
          userIds,
        },
        subject,
        emailBody,
        format,
        attachments
      );

      return c.html(
        <div class="alert alert-success text-xs">
          <span>Enqueued {count} batch email(s) via {mailService.getProvider().name}.</span>
        </div>
      );
    } catch (err: any) {
      return c.html(
        <div class="alert alert-error text-xs">
          <span>Failed to send batch emails: {err?.message || String(err)}</span>
        </div>,
        500
      );
    }
  });

  app.onError((_, c) => c.html(<Toast type="error" title="admin.error" description="The action could not be completed." />, 400));
  return app;
}
