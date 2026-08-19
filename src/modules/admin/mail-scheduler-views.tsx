import type { ScheduledEmailRow, EmailTemplateRow } from "../mailer/database";
import type { Tag } from "../events/types";
import { MailPlaceholdersToolbar } from "./mail-placeholders-component";

export const MailSchedulerView = ({
  scheduledList,
  templates,
  tags,
  users,
}: {
  scheduledList: ScheduledEmailRow[];
  templates: EmailTemplateRow[];
  tags: Tag[];
  users: { id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }[];
}) => {
  return (
    <div
      class="space-y-8"
      x-data={`{
        targetMode: 'all',
        format: 'html',
        selectedTemplateId: '',
        title: '',
        subject: '',
        body: '',
        scheduledFor: '',
        tagSearch: '',
        userSearch: '',
        templates: ${JSON.stringify(templates.map((t) => ({ id: t.id, title: t.title, subject: t.subject, format: t.format, value: t.value })))},
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
        loadTemplate(tplId) {
          const t = this.templates.find(x => x.id === tplId);
          if (!t) return;
          this.title = 'Broadcast: ' + t.title;
          this.subject = t.subject;
          this.format = t.format;
          this.body = t.value;
        },
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
        }
      }`}
    >
      {/* Header */}
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Mail Scheduler</h1>
          <p class="text-sm text-base-content/60">
            Schedule future automated batch emails to targeted audiences (All Users, Tag Followers, Domains, Specific Users).
          </p>
        </div>
        <button
          hx-get="/dashboard/admin/mail-scheduler"
          hx-target="main"
          hx-select="main > *"
          class="btn btn-sm btn-outline gap-2"
        >
          ↻ Refresh Queue
        </button>
      </div>

      {/* Schedule Creation Card */}
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-base-200 pb-3">
            <div>
              <h2 class="text-lg font-bold text-base-content">Create Scheduled Email</h2>
              <p class="text-xs text-base-content/60">
                Pick a template or craft a custom message and set delivery date and time.
              </p>
            </div>

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
            hx-post="/dashboard/admin/mail-scheduler/schedule"
            hx-target="main"
            hx-select="main > *"
            class="space-y-4"
          >
            <input type="hidden" name="format" x-bind:value="format" />

            {/* Template Selector & Title */}
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="form-control">
                <label class="label py-1"><span class="label-text font-semibold text-xs">Load Saved Template (Optional)</span></label>
                <select
                  class="select select-bordered select-sm w-full"
                  name="templateId"
                  x-model="selectedTemplateId"
                  x-on:change="loadTemplate(selectedTemplateId)"
                >
                  <option value="">-- Custom Email / No Template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.format})
                    </option>
                  ))}
                </select>
              </div>

              <div class="form-control">
                <label class="label py-1"><span class="label-text font-semibold text-xs">Campaign Title *</span></label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. September Community Meetup"
                  x-model="title"
                  class="input input-bordered input-sm w-full text-xs"
                />
              </div>
            </div>

            {/* Target Audience Mode */}
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="form-control">
                <label class="label py-1"><span class="label-text font-semibold text-xs">Target Audience *</span></label>
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

              <div class="form-control">
                <label class="label py-1"><span class="label-text font-semibold text-xs">Schedule Date & Time *</span></label>
                <input
                  type="datetime-local"
                  name="scheduledFor"
                  required
                  x-model="scheduledFor"
                  class="input input-bordered input-sm w-full text-xs"
                />
              </div>

              {/* Tag selector */}
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
                  placeholder="🔍 Search tags..."
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
                <label class="label py-1"><span class="label-text font-semibold text-xs">Email Domain Filter</span></label>
                <input
                  type="text"
                  name="domain"
                  placeholder="e.g. gmail.com or company.org"
                  class="input input-bordered input-sm w-full text-xs"
                />
              </div>

              {/* Selected Users */}
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
                  placeholder="🔍 Search users by name or email..."
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
              <label class="label py-1"><span class="label-text font-semibold text-xs">Subject Line *</span></label>
              <input
                type="text"
                name="subject"
                required
                placeholder="Important Announcement from CobraDecision"
                x-model="subject"
                class="input input-bordered input-sm w-full text-xs"
              />
            </div>

            {/* Body Textarea */}
            <div class="form-control space-y-1">
              <label class="label py-1"><span class="label-text font-semibold text-xs">Email Message Body *</span></label>
              <MailPlaceholdersToolbar onInsertMethod="insertTag" />
              <textarea
                x-ref="bodyTextarea"
                name="body"
                required
                x-model="body"
                rows={6}
                placeholder="Compose scheduled email body. {{name}}, {{email}}, {{date}}, {{date_shamsi}} supported."
                class="textarea textarea-bordered font-mono text-xs w-full leading-relaxed"
              ></textarea>
            </div>

            <div class="flex justify-end">
              <button class="btn btn-primary btn-sm gap-2" type="submit">
                <span class="htmx-indicator loading loading-spinner loading-xs"></span>
                <span>Schedule Broadcast</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Scheduled Tasks Queue Table */}
      <div class="card border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div class="card-body p-6">
          <h2 class="text-lg font-bold text-base-content">
            Scheduled Queue ({scheduledList.length} jobs)
          </h2>
          <p class="text-xs text-base-content/60 mb-4">
            Review status of scheduled email jobs. The background scheduler evaluates and triggers tasks when time is reached.
          </p>

          <div class="overflow-x-auto">
            <table class="table table-sm table-zebra w-full">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Audience</th>
                  <th>Format</th>
                  <th>Scheduled For</th>
                  <th>Sent Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledList.length === 0 ? (
                  <tr>
                    <td colSpan={7} class="text-center py-6 text-base-content/50">
                      No scheduled email broadcasts in queue.
                    </td>
                  </tr>
                ) : (
                  scheduledList.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <span
                          class={`badge badge-sm ${
                            job.status === "sent"
                              ? "badge-success text-white"
                              : job.status === "processing"
                              ? "badge-info text-white"
                              : job.status === "failed"
                              ? "badge-error text-white"
                              : job.status === "cancelled"
                              ? "badge-ghost"
                              : "badge-warning"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td class="font-medium">
                        <div>{job.title}</div>
                        <div class="text-2xs text-base-content/60 truncate max-w-xs">{job.subject}</div>
                      </td>
                      <td>
                        <span class="badge badge-outline badge-xs uppercase font-mono">
                          {job.target_mode}
                        </span>
                      </td>
                      <td>
                        <span class="badge badge-ghost badge-xs uppercase font-mono">{job.format}</span>
                      </td>
                      <td class="text-xs">
                        {new Date(job.scheduled_for).toLocaleString()}
                      </td>
                      <td class="text-xs font-bold text-center">
                        {job.sent_count}
                      </td>
                      <td>
                        <div class="flex items-center gap-1">
                          {job.status === "pending" && (
                            <form
                              hx-post={`/dashboard/admin/mail-scheduler/cancel?id=${job.id}`}
                              hx-target="main"
                              hx-select="main > *"
                            >
                              <button type="submit" class="btn btn-xs btn-outline btn-warning">
                                Cancel
                              </button>
                            </form>
                          )}
                          <form
                            hx-post={`/dashboard/admin/mail-scheduler/repeat?id=${job.id}`}
                            hx-target="main"
                            hx-select="main > *"
                          >
                            <button type="submit" class="btn btn-xs btn-outline btn-info" title="Repeat this broadcast in queue">
                              🔁 Repeat
                            </button>
                          </form>
                          <form
                            hx-post={`/dashboard/admin/mail-scheduler/delete?id=${job.id}`}
                            hx-confirm="Are you sure you want to delete this scheduled job?"
                            hx-target="main"
                            hx-select="main > *"
                          >
                            <button type="submit" class="btn btn-xs btn-ghost text-error">
                              ✕
                            </button>
                          </form>
                        </div>
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
