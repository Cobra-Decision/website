import type { EmailMessage, MailerStats } from "../mailer/types";
import type { Tag } from "../events/types";

export const MailerDashboardView = ({
  stats,
  buffer,
  tags,
  users,
}: {
  stats: MailerStats;
  buffer: EmailMessage[];
  tags: Tag[];
  users: { id: string; email: string; first_name: string | null; last_name: string | null }[];
}) => {
  return (
    <div class="space-y-8" x-data="{ format: 'html', targetMode: 'all', preview: false, body: '' }">
      {/* Header */}
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Mail Management</h1>
          <p class="text-sm text-base-content/60">
            Inspect circular email buffer, monitor delivery stats, and compose batch or stack emails.
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
                Send unified email to all users, specific tag followers, or domain matches.
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
                HTML Template
              </button>
              <button
                type="button"
                class="btn btn-sm join-item"
                x-bind:class="format === 'text' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'text'"
              >
                Plain Text Only
              </button>
            </div>
          </div>

          <form
            hx-post="/dashboard/admin/mailer/send"
            hx-target="#composer-result"
            hx-swap="innerHTML"
            class="space-y-4"
          >
            <input type="hidden" name="format" x-bind:value="format" />

            {/* Target Audience Select */}
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="form-control">
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

              {/* Tag selector */}
              <div class="form-control" x-show="targetMode === 'tags'" x-cloak>
                <label class="label"><span class="label-text font-semibold text-xs">Select Tags</span></label>
                <select class="select select-bordered select-sm w-full" name="tagIds" multiple size={3}>
                  {tags.map((t) => (
                    <option value={t.id} key={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {/* Domain Input */}
              <div class="form-control" x-show="targetMode === 'domain'" x-cloak>
                <label class="label"><span class="label-text font-semibold text-xs">Email Domain</span></label>
                <input
                  type="text"
                  name="domain"
                  placeholder="gmail.com or company.org"
                  class="input input-bordered input-sm w-full"
                />
              </div>

              {/* Selected Users */}
              <div class="form-control sm:col-span-2" x-show="targetMode === 'selected'" x-cloak>
                <label class="label"><span class="label-text font-semibold text-xs">Select Users</span></label>
                <select class="select select-bordered select-sm w-full h-32" name="userIds" multiple>
                  {users.map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.email} {[u.first_name, u.last_name].filter(Boolean).join(" ") ? `(${[u.first_name, u.last_name].filter(Boolean).join(" ")})` : ""}
                    </option>
                  ))}
                </select>
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

            {/* Email Body Editor */}
            <div class="form-control">
              <div class="flex items-center justify-between pb-1">
                <label class="label-text font-semibold text-xs">
                  <span x-text="format === 'html' ? 'Email HTML Body' : 'Email Plain Text Body'"></span>
                </label>
                <button
                  type="button"
                  x-show="format === 'html'"
                  x-on:click="preview = !preview"
                  class="btn btn-xs btn-ghost"
                >
                  <span x-text="preview ? 'Hide Live Preview' : 'Show Live Preview'"></span>
                </button>
              </div>

              <textarea
                name="body"
                required
                x-model="body"
                rows={7}
                placeholder={
                  "Enter email content here...\nFor HTML mode: <h2>Hello</h2><p>Your message here</p>"
                }
                class="textarea textarea-bordered font-mono text-sm w-full"
              ></textarea>

              {/* Live Preview Pane */}
              <div
                x-show="preview && format === 'html'"
                x-cloak
                class="mt-3 rounded-xl border border-base-300 bg-white p-4 text-black shadow-inner"
              >
                <div class="text-xs font-bold uppercase text-gray-400 border-b pb-1 mb-2">HTML Output Preview</div>
                <div x-html="body" class="prose max-w-none"></div>
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
