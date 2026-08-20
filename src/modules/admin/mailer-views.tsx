import type { EmailMessage, MailerStats } from "../mailer/types";
import type { Tag } from "../events/types";
import { MailPlaceholdersToolbar } from "./mail-placeholders-component";

export const MailerDashboardView = ({
  stats,
  buffer,
  tags,
  users,
}: {
  stats: MailerStats;
  buffer: EmailMessage[];
  tags: Tag[];
  users: { id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }[];
}) => {
  return (
    <div
      class="space-y-8"
      x-data={`{
        format: 'html',
        targetMode: 'all',
        preview: false,
        body: '',
        tagSearch: '',
        userSearch: '',
        allTags: ${JSON.stringify(tags.map((t) => ({ id: t.id, title: t.title })))},
        allUsers: ${JSON.stringify(
          users.map((u) => ({
            id: u.id,
            email: u.email,
            name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || u.email,
          }))
        )},
        selectedTagIds: [],
        selectedUserIds: [],
        get filteredTags() {
          if (!this.tagSearch.trim()) return this.allTags;
          const q = this.tagSearch.toLowerCase();
          return this.allTags.filter(t => t.title.toLowerCase().includes(q));
        },
        get filteredUsers() {
          if (!this.userSearch.trim()) return this.allUsers;
          const q = this.userSearch.toLowerCase();
          return this.allUsers.filter(u => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
        },
        selectAllFilteredUsers() {
          const ids = this.filteredUsers.map(u => u.id);
          this.selectedUserIds = Array.from(new Set([...this.selectedUserIds, ...ids]));
        },
        clearSelectedUsers() {
          this.selectedUserIds = [];
        },
        selectAllFilteredTags() {
          const ids = this.filteredTags.map(t => t.id);
          this.selectedTagIds = Array.from(new Set([...this.selectedTagIds, ...ids]));
        },
        clearSelectedTags() {
          this.selectedTagIds = [];
        },
        insertTag(placeholder) {
          const textarea = this.$refs.bodyTextarea;
          if (!textarea) {
            this.body = (this.body || '') + placeholder;
            return;
          }
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          this.body = (this.body || '').substring(0, start) + placeholder + (this.body || '').substring(end);
          this.$nextTick(() => {
            textarea.focus();
            textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
          });
        },
        get interpolatedPreview() {
          if (!this.body) return '<span class="text-gray-400 italic">Empty preview</span>';
          let rendered = this.body
            .replace(/\\{\\{\\s*name\\s*\\}\\}/gi, 'Sara Ahmadi')
            .replace(/\\{\\{\\s*email\\s*\\}\\}/gi, 'sara@example.com')
            .replace(/\\{\\{\\s*first_name\\s*\\}\\}/gi, 'Sara')
            .replace(/\\{\\{\\s*last_name\\s*\\}\\}/gi, 'Ahmadi')
            .replace(/\\{\\{\\s*username\\s*\\}\\}/gi, 'sara_dev')
            .replace(/\\{\\{\\s*date\\s*\\}\\}/gi, new Date().toLocaleDateString())
            .replace(/\\{\\{\\s*date_shamsi\\s*\\}\\}/gi, new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()))
            .replace(/\\{\\{\\s*meet_title\\s*\\}\\}/gi, 'Distributed Systems with Bun & SQLite')
            .replace(/\\{\\{\\s*meet_date\\s*\\}\\}/gi, '2026-08-25')
            .replace(/\\{\\{\\s*meet_date_shamsi\\s*\\}\\}/gi, '۳ شهریور ۱۴۰۵')
            .replace(/\\{\\{\\s*meet_time\\s*\\}\\}/gi, '18:00')
            .replace(/\\{\\{\\s*meet_link\\s*\\}\\}/gi, window.location.origin + '/meets/sample-123')
            .replace(/\\{\\{\\s*dashboard_url\\s*\\}\\}/gi, window.location.origin + '/dashboard/user')
            .replace(/\\{\\{\\s*unsubscribe_url\\s*\\}\\}/gi, '#');

          if (this.format === 'markdown') {
            let html = rendered
              .replace(/^### (.*$)/gim, '<h3 style="font-size:18px;font-weight:bold;margin:12px 0;">$1</h3>')
              .replace(/^## (.*$)/gim, '<h2 style="font-size:20px;font-weight:bold;margin:16px 0;border-bottom:1px solid #eee;padding-bottom:4px;">$1</h2>')
              .replace(/^# (.*$)/gim, '<h1 style="font-size:24px;font-weight:bold;margin:20px 0;border-bottom:1px solid #eee;padding-bottom:4px;">$1</h1>')
              .replace(/\\*\\*(.*?)\\*\\*/gim, '<strong>$1</strong>')
              .replace(/\\*(.*?)\\*/gim, '<em>$1</em>')
              .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/gim, '<a href="$2" style="color:#2563eb;text-decoration:none;">$1</a>')
              .replace(/^\\s*-\\s+(.*$)/gim, '<li>$1</li>')
              .replace(/\\n/g, '<br/>');
            return '<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;padding:12px;">' + html + '</div>';
          }
          if (this.format === 'text') {
            return '<pre style="white-space:pre-wrap;font-family:monospace;background:#f8fafc;padding:12px;border-radius:6px;">' + rendered + '</pre>';
          }
          return rendered;
        }
      }`}
    >
      {/* Header */}
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Mail Management</h1>
          <p class="text-sm text-base-content/60">
            Inspect circular email buffer, monitor delivery stats, and compose batch or stack emails with attachments.
          </p>
        </div>
        <button
          hx-get="/dashboard/admin/mailer"
          hx-target="main"
          hx-select="main > *"
          class="btn btn-sm btn-outline gap-2"
        >
          ↻ Refresh Buffer
        </button>
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">Active Provider</div>
          <div class="stat-value text-xl font-bold text-primary truncate">{stats.activeProvider}</div>
          <div class="stat-desc">Configured engine</div>
        </div>

        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">Sent Emails</div>
          <div class="stat-value text-xl font-bold text-success">{stats.sent}</div>
          <div class="stat-desc">Total successful sends</div>
        </div>

        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">Failed Emails</div>
          <div class="stat-value text-xl font-bold text-error">{stats.failed}</div>
          <div class="stat-desc">Encountered errors</div>
        </div>

        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">Ring Buffer Capacity</div>
          <div class="stat-value text-xl font-bold text-base-content">
            {stats.bufferSize} / {stats.bufferCapacity}
          </div>
          <div class="stat-desc">Zero-leak circular slots</div>
        </div>
      </div>

      {/* Batch / Stack Email Composer */}
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-base-200 pb-3">
            <div>
              <h2 class="text-lg font-bold text-base-content">Compose Batch / Stack Email</h2>
              <p class="text-xs text-base-content/60">
                Send unified email to all users, specific tag followers, or domain matches with attachments.
              </p>
            </div>
            {/* Format Style Selector */}
            <div class="join">
              <button
                type="button"
                class="btn btn-sm join-item"
                x-bind:class="format === 'html' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'html'"
              >
                HTML
              </button>
              <button
                type="button"
                class="btn btn-sm join-item"
                x-bind:class="format === 'markdown' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'markdown'"
              >
                Markdown
              </button>
              <button
                type="button"
                class="btn btn-sm join-item"
                x-bind:class="format === 'text' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'text'"
              >
                Plain Text
              </button>
            </div>
          </div>

          <form
            hx-post="/dashboard/admin/mailer/send"
            hx-target="#composer-result"
            hx-swap="innerHTML"
            hx-encoding="multipart/form-data"
            class="space-y-4"
          >
            <input type="hidden" name="format" x-bind:value="format" />

            {/* Target Audience Select */}
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="form-control sm:col-span-2">
                <label class="label"><span class="label-text font-semibold text-xs">Target Audience</span></label>
                <select
                  class="select select-bordered select-sm w-full"
                  name="targetMode"
                  x-model="targetMode"
                >
                  <option value="all">All Active Users ({users.length} total)</option>
                  <option value="tags">Followers of Specific Tags</option>
                  <option value="domain">Filter by Email Domain (e.g. gmail.com)</option>
                  <option value="selected">Select Specific Users</option>
                </select>
              </div>

              {/* Tag selector with Search and Filter */}
              <div class="form-control sm:col-span-2 space-y-2" x-show="targetMode === 'tags'" x-cloak>
                <div class="flex items-center justify-between">
                  <label class="label-text font-semibold text-xs">
                    Select Tags (<span x-text="selectedTagIds.length"></span> selected)
                  </label>
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
                        name="tagIds"
                        x-bind:value="tag.id"
                        x-model="selectedTagIds"
                        class="checkbox checkbox-primary checkbox-xs"
                      />
                      <span class="label-text text-xs truncate" x-text="tag.title"></span>
                    </label>
                  </template>
                </div>
              </div>

              {/* Domain Input */}
              <div class="form-control sm:col-span-2" x-show="targetMode === 'domain'" x-cloak>
                <label class="label"><span class="label-text font-semibold text-xs">Email Domain</span></label>
                <input
                  type="text"
                  name="domain"
                  placeholder="gmail.com or company.org"
                  class="input input-bordered input-sm w-full"
                />
              </div>

              {/* Selected Users with Search and Filter */}
              <div class="form-control sm:col-span-2 space-y-2" x-show="targetMode === 'selected'" x-cloak>
                <div class="flex items-center justify-between">
                  <label class="label-text font-semibold text-xs">
                    Select Users (<span x-text="selectedUserIds.length"></span> selected)
                  </label>
                  <div class="flex gap-1">
                    <button type="button" class="btn btn-xs btn-ghost" x-on:click="selectAllFilteredUsers()">Select Filtered</button>
                    <button type="button" class="btn btn-xs btn-ghost" x-on:click="clearSelectedUsers()">Clear</button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  x-model="userSearch"
                  class="input input-bordered input-xs w-full"
                />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-base-300 rounded-lg bg-base-200/40">
                  <template x-for="u in filteredUsers" x-bind:key="u.id">
                    <label class="cursor-pointer label justify-start gap-2 py-1 px-2 rounded hover:bg-base-200 bg-base-100 border border-base-300/50">
                      <input
                        type="checkbox"
                        name="userIds"
                        x-bind:value="u.id"
                        x-model="selectedUserIds"
                        class="checkbox checkbox-primary checkbox-xs"
                      />
                      <span class="label-text text-xs truncate">
                        <strong x-text="u.email"></strong>
                        <span class="text-base-content/60 text-2xs ml-1" x-text="'(' + u.name + ')'"></span>
                      </span>
                    </label>
                  </template>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div class="form-control">
              <label class="label"><span class="label-text font-semibold text-xs">Subject Line</span></label>
              <input
                type="text"
                name="subject"
                required
                placeholder="Important Announcement from CobraDecision"
                class="input input-bordered input-sm w-full"
              />
            </div>

            {/* File Attachment Upload */}
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold text-xs">Attach Files (Optional)</span>
                <span class="label-text-alt text-base-content/60 text-2xs">PDF, Images, Documents (max 25MB)</span>
              </label>
              <input
                type="file"
                name="attachment"
                class="file-input file-input-bordered file-input-sm w-full"
              />
            </div>

            {/* Email Body Editor & Live Tag Replacement */}
            <div class="form-control space-y-1">
              <div class="flex flex-wrap items-center justify-between pb-1 gap-2">
                <label class="label-text font-semibold text-xs">
                  <span x-text="format === 'html' ? 'Email HTML Body' : format === 'markdown' ? 'Email Markdown Body' : 'Email Plain Text Body'"></span>
                </label>
                <button
                  type="button"
                  x-on:click="preview = !preview"
                  class="btn btn-xs btn-ghost text-2xs"
                >
                  <span x-text="preview ? 'Hide Live Preview' : 'Show Live Preview'"></span>
                </button>
              </div>

              {/* Shared Variables Toolbar */}
              <MailPlaceholdersToolbar onInsertMethod="insertTag" />

              <textarea
                x-ref="bodyTextarea"
                name="body"
                required
                x-model="body"
                rows={7}
                placeholder={
                  "Enter email content here...\n{{name}}, {{email}}, {{date}}, {{date_shamsi}} supported."
                }
                class="textarea textarea-bordered font-mono text-sm w-full"
              ></textarea>

              {/* Live Preview Pane with Tag Replacement */}
              <div
                x-show="preview"
                x-cloak
                class="mt-3 rounded-xl border border-base-300 bg-white p-4 text-black shadow-inner"
              >
                <div class="flex items-center justify-between border-b pb-1 mb-2">
                  <span class="text-xs font-bold uppercase text-gray-400">Live Output Preview (Variables Interpolated)</span>
                  <span class="badge badge-xs badge-ghost font-mono uppercase" x-text="format"></span>
                </div>
                <div x-html="interpolatedPreview" class="prose max-w-none"></div>
              </div>
            </div>

            <div id="composer-result"></div>

            <div class="flex justify-end">
              <button class="btn btn-primary btn-sm gap-2" type="submit">
                <span class="htmx-indicator loading loading-spinner loading-xs"></span>
                <span>Send Batch Emails</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Ring Buffer History Viewer */}
      <div class="card border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div class="card-body p-6">
          <h2 class="text-lg font-bold text-base-content">Recent Ring Buffer History ({buffer.length} items)</h2>
          <p class="text-xs text-base-content/60 mb-4">
            Recent emails captured in the in-memory circular buffer.
          </p>

          <div class="overflow-x-auto">
            <table class="table table-sm table-zebra w-full">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Format</th>
                  <th>Provider</th>
                  <th>Created At</th>
                  <th>Sent / Error</th>
                </tr>
              </thead>
              <tbody>
                {buffer.length === 0 ? (
                  <tr>
                    <td colSpan={7} class="text-center py-6 text-base-content/50">
                      Ring buffer is currently empty.
                    </td>
                  </tr>
                ) : (
                  buffer.map((msg) => (
                    <tr key={msg.id}>
                      <td>
                        <span
                          class={`badge badge-sm ${
                            msg.status === "sent"
                              ? "badge-success text-white"
                              : msg.status === "failed"
                              ? "badge-error text-white"
                              : "badge-warning"
                          }`}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td class="font-mono text-xs">{msg.to}</td>
                      <td class="font-medium max-w-xs truncate">{msg.subject}</td>
                      <td>
                        <span class="badge badge-ghost badge-xs">{msg.format ?? "html"}</span>
                      </td>
                      <td class="text-xs opacity-75">{msg.provider}</td>
                      <td class="text-xs opacity-75">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </td>
                      <td class="text-xs">
                        {msg.status === "sent" && msg.sentAt ? (
                          <span class="text-success">{new Date(msg.sentAt).toLocaleTimeString()}</span>
                        ) : msg.status === "failed" ? (
                          <span class="text-error truncate max-w-xs inline-block" title={msg.error}>
                            {msg.error}
                          </span>
                        ) : (
                          <span class="opacity-50">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
