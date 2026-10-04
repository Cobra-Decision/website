import type { EmailMessage, MailerStats } from "../mailer/types";
import type { Tag } from "../events/types";
import { MailPlaceholdersToolbar } from "./mail-placeholders-component";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { Button, Input, Textarea, Select, Checkbox, FormField, Badge } from "../../ui/forms";
import { Table, TableRow, TableCell } from "../../ui/table";

export const MailerDashboardView = ({
  stats,
  buffer,
  tags,
  users,
  locale = "en",
}: {
  stats: MailerStats;
  buffer: EmailMessage[];
  tags: Tag[];
  users: { id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }[];
  locale?: Locale;
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
            .replace(/\\{\\{\\s*meet_title_encoded\\s*\\}\\}/gi, encodeURIComponent('Distributed Systems with Bun & SQLite'))
            .replace(/\\{\\{\\s*meet_date\\s*\\}\\}/gi, '2026-08-25')
            .replace(/\\{\\{\\s*meet_date_shamsi\\s*\\}\\}/gi, '۳ شهریور ۱۴۰۵')
            .replace(/\\{\\{\\s*meet_time\\s*\\}\\}/gi, '18:00')
            .replace(/\\{\\{\\s*meet_duration\\s*\\}\\}/gi, '75')
            .replace(/\\{\\{\\s*meet_start_utc\\s*\\}\\}/gi, '20260825T143000Z')
            .replace(/\\{\\{\\s*meet_end_utc\\s*\\}\\}/gi, '20260825T154500Z')
            .replace(/\\{\\{\\s*meet_start_iso\\s*\\}\\}/gi, '2026-08-25T14:30:00Z')
            .replace(/\\{\\{\\s*meet_end_iso\\s*\\}\\}/gi, '2026-08-25T15:45:00Z')
            .replace(/\\{\\{\\s*meet_link\\s*\\}\\}/gi, window.location.origin + '/meets/sample-123')
            .replace(/\\{\\{\\s*meet_link_encoded\\s*\\}\\}/gi, encodeURIComponent(window.location.origin + '/meets/sample-123'))
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
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
            {t("admin.mail.management_title", locale)}
          </h1>
          <p class="text-sm text-base-content/60">
            {t("admin.mail.management_subtitle", locale)}
          </p>
        </div>
        <Button
          hx-get="/dashboard/admin/mailer"
          hx-target="main"
          hx-select="main > *"
          variant="outline"
          size="sm"
          class="gap-2"
        >
          {t("admin.files.refresh", locale)}
        </Button>
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">{locale === "fa" ? "سرویس‌دهنده فعال" : "Active Provider"}</div>
          <div class="stat-value text-xl font-bold text-primary truncate">{stats.activeProvider}</div>
          <div class="stat-desc">{locale === "fa" ? "موتور پیکربندی‌شده" : "Configured engine"}</div>
        </div>

        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">{t("admin.mail.sent_count", locale)}</div>
          <div class="stat-value text-xl font-bold text-success">{formatLocalizedNumber(stats.sent, locale)}</div>
          <div class="stat-desc">{locale === "fa" ? "ارسال موفق کل" : "Total successful sends"}</div>
        </div>

        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">{t("admin.mail.failed_count", locale)}</div>
          <div class="stat-value text-xl font-bold text-error">{formatLocalizedNumber(stats.failed, locale)}</div>
          <div class="stat-desc">{locale === "fa" ? "خطاهای رخ داده" : "Encountered errors"}</div>
        </div>

        <div class="stat rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div class="stat-title text-xs">{locale === "fa" ? "ظرفیت بافر حلقه‌ای" : "Ring Buffer Capacity"}</div>
          <div class="stat-value text-xl font-bold text-base-content">
            {formatLocalizedNumber(stats.bufferSize, locale)} / {formatLocalizedNumber(stats.bufferCapacity, locale)}
          </div>
          <div class="stat-desc">{locale === "fa" ? "اسلات‌های بافر حافظه" : "Zero-leak circular slots"}</div>
        </div>
      </div>

      {/* Batch / Stack Email Composer */}
      <div class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 border-b border-base-200 pb-3">
            <div>
              <h2 class="text-lg font-bold text-base-content">{t("admin.mail.composer_title", locale)}</h2>
              <p class="text-xs text-base-content/60">
                {t("admin.mail.management_subtitle", locale)}
              </p>
            </div>
            {/* Format Style Selector */}
            <div class="join shrink-0">
              <Button
                size="sm"
                class="join-item"
                x-bind:class="format === 'html' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'html'"
              >
                HTML
              </Button>
              <Button
                size="sm"
                class="join-item"
                x-bind:class="format === 'markdown' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'markdown'"
              >
                Markdown
              </Button>
              <Button
                size="sm"
                class="join-item"
                x-bind:class="format === 'text' ? 'btn-primary' : 'btn-ghost'"
                x-on:click="format = 'text'"
              >
                Plain Text
              </Button>
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
              <FormField label={t("admin.mail.recipient_mode", locale)} class="sm:col-span-2">
                <Select
                  size="sm"
                  name="targetMode"
                  x-model="targetMode"
                >
                  <option value="all">{t("admin.mail.mode_all", locale)} ({formatLocalizedNumber(users.length, locale)})</option>
                  <option value="tags">{t("admin.mail.mode_tags", locale)}</option>
                  <option value="domain">{locale === "fa" ? "فیلتر بر اساس دامنه ایمیل (مثلاً gmail.com)" : "Filter by Email Domain (e.g. gmail.com)"}</option>
                  <option value="selected">{t("admin.mail.mode_users", locale)}</option>
                </Select>
              </FormField>

              {/* Tag selector with Search and Filter */}
              <div class="form-control sm:col-span-2 space-y-2" x-show="targetMode === 'tags'" x-cloak>
                <div class="flex items-center justify-between">
                  <label class="label-text font-semibold text-xs">
                    {t("admin.mail.mode_tags", locale)} (<span x-text="selectedTagIds.length"></span>)
                  </label>
                  <div class="flex gap-1">
                    <Button size="xs" variant="ghost" x-on:click="selectAllFilteredTags()">{t("admin.select_all", locale)}</Button>
                    <Button size="xs" variant="ghost" x-on:click="clearSelectedTags()">{t("admin.reset", locale)}</Button>
                  </div>
                </div>
                <Input
                  placeholder={locale === "fa" ? "جستجوی برچسب‌ها..." : "Search tags..."}
                  x-model="tagSearch"
                  size="xs"
                />
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-base-300 rounded-lg bg-base-200/40">
                  <template x-for="tag in filteredTags" x-bind:key="tag.id">
                    <label class="cursor-pointer label justify-start gap-2 py-1 px-2 rounded hover:bg-base-200 bg-base-100 border border-base-300/50">
                      <Checkbox
                        size="xs"
                        name="tagIds"
                        x-bind:value="tag.id"
                        x-model="selectedTagIds"
                      />
                      <span class="label-text text-xs truncate" x-text="tag.title"></span>
                    </label>
                  </template>
                </div>
              </div>

              {/* Domain Input */}
              <div class="form-control sm:col-span-2" x-show="targetMode === 'domain'" x-cloak>
                <FormField label={locale === "fa" ? "دامنه ایمیل" : "Email Domain"}>
                  <Input
                    name="domain"
                    placeholder="gmail.com or company.org"
                    size="sm"
                  />
                </FormField>
              </div>

              {/* Selected Users with Search and Filter */}
              <div class="form-control sm:col-span-2 space-y-2" x-show="targetMode === 'selected'" x-cloak>
                <div class="flex items-center justify-between">
                  <label class="label-text font-semibold text-xs">
                    {t("admin.mail.mode_users", locale)} (<span x-text="selectedUserIds.length"></span>)
                  </label>
                  <div class="flex gap-1">
                    <Button size="xs" variant="ghost" x-on:click="selectAllFilteredUsers()">{t("admin.select_all", locale)}</Button>
                    <Button size="xs" variant="ghost" x-on:click="clearSelectedUsers()">{t("admin.reset", locale)}</Button>
                  </div>
                </div>
                <Input
                  placeholder={locale === "fa" ? "جستجوی کاربران..." : "Search users by name or email..."}
                  x-model="userSearch"
                  size="xs"
                />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-base-300 rounded-lg bg-base-200/40">
                  <template x-for="u in filteredUsers" x-bind:key="u.id">
                    <label class="cursor-pointer label justify-start gap-2 py-1 px-2 rounded hover:bg-base-200 bg-base-100 border border-base-300/50">
                      <Checkbox
                        size="xs"
                        name="userIds"
                        x-bind:value="u.id"
                        x-model="selectedUserIds"
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
            <FormField label={t("admin.mail.email_subject", locale)} required>
              <Input
                name="subject"
                required
                placeholder="Important Announcement from CobraDecision"
                size="sm"
              />
            </FormField>

            {/* File Attachment Upload */}
            <FormField
              label={locale === "fa" ? "پیوست فایل (اختیاری)" : "Attach Files (Optional)"}
              optionalLabel="PDF, Images, Documents (max 25MB)"
            >
              <Input
                type="file"
                name="attachment"
                size="sm"
              />
            </FormField>

            {/* Email Body Editor & Live Tag Replacement */}
            <div class="form-control space-y-1">
              <div class="flex flex-wrap items-center justify-between pb-1 gap-2">
                <label class="label-text font-semibold text-xs">
                  <span x-text="format === 'html' ? 'Email HTML Body' : format === 'markdown' ? 'Email Markdown Body' : 'Email Plain Text Body'"></span>
                </label>
                <Button
                  size="xs"
                  variant="ghost"
                  class="text-2xs"
                  x-on:click="preview = !preview"
                >
                  <span x-text="preview ? 'Hide Live Preview' : 'Show Live Preview'"></span>
                </Button>
              </div>

              {/* Shared Variables Toolbar */}
              <MailPlaceholdersToolbar onInsertMethod="insertTag" />

              <Textarea
                x-ref="bodyTextarea"
                name="body"
                required
                x-model="body"
                rows={7}
                placeholder={
                  "Enter email content here...\n{{name}}, {{email}}, {{date}}, {{date_shamsi}} supported."
                }
                class="font-mono text-sm"
              />

              {/* Live Preview Pane with Tag Replacement */}
              <div
                x-show="preview"
                x-cloak
                class="mt-3 rounded-xl border border-base-300 bg-white p-4 text-black shadow-inner"
              >
                <div class="flex items-center justify-between border-b pb-1 mb-2">
                  <span class="text-xs font-bold uppercase text-gray-400">{t("admin.mail.live_preview", locale)}</span>
                  <Badge variant="ghost" size="xs" class="font-mono uppercase" x-text="format" />
                </div>
                <div x-html="interpolatedPreview" class="prose max-w-none"></div>
              </div>
            </div>

            <div id="composer-result"></div>

            <div class="flex justify-end">
              <Button variant="primary" size="sm" type="submit" htmxIndicator>
                <span>{t("admin.mail.send_now", locale)}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Ring Buffer History Viewer */}
      <div class="card border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div class="card-body p-6">
          <h2 class="text-lg font-bold text-base-content">
            {t("admin.mail.recent_dispatched", locale)} ({formatLocalizedNumber(buffer.length, locale)})
          </h2>
          <p class="text-xs text-base-content/60 mb-4">
            {locale === "fa" ? "ایمیل‌های اخیر ذخیره‌شده در بافر حلقه‌ای حافظه." : "Recent emails captured in the in-memory circular buffer."}
          </p>

          <Table
            columns={[
              { header: t("admin.status", locale), sortable: true, key: "status" },
              { header: locale === "fa" ? "گیرنده" : "Recipient", sortable: true, key: "to" },
              { header: t("admin.mail.email_subject", locale), sortable: true, key: "subject" },
              { header: t("admin.mail.format", locale), sortable: true, key: "format" },
              { header: locale === "fa" ? "سرویس‌دهنده" : "Provider", sortable: true, key: "provider" },
              { header: locale === "fa" ? "زمان ایجاد" : "Created At", sortable: true, key: "createdAt" },
              { header: locale === "fa" ? "ارسال / خطا" : "Sent / Error", sortable: true, key: "sentError" },
            ]}
            empty={buffer.length === 0}
            emptyMessage={t("admin.mail.no_logs", locale)}
          >
            {buffer.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell sortVal={msg.status}>
                  <Badge
                    variant={
                      msg.status === "sent"
                        ? "success"
                        : msg.status === "failed"
                        ? "error"
                        : "warning"
                    }
                    size="sm"
                    class={msg.status === "sent" || msg.status === "failed" ? "text-white" : ""}
                  >
                    {msg.status}
                  </Badge>
                </TableCell>
                <TableCell sortVal={msg.to} class="font-mono text-xs">
                  {msg.to}
                </TableCell>
                <TableCell sortVal={msg.subject} class="font-medium max-w-xs truncate">
                  {msg.subject}
                </TableCell>
                <TableCell sortVal={msg.format ?? "html"}>
                  <Badge variant="ghost" size="xs">{msg.format ?? "html"}</Badge>
                </TableCell>
                <TableCell sortVal={msg.provider} class="text-xs opacity-75">
                  {msg.provider}
                </TableCell>
                <TableCell sortVal={new Date(msg.createdAt).getTime()} class="text-xs opacity-75">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </TableCell>
                <TableCell sortVal={msg.sentAt ? new Date(msg.sentAt).getTime() : msg.error ?? ""} class="text-xs">
                  {msg.status === "sent" && msg.sentAt ? (
                    <span class="text-success">{new Date(msg.sentAt).toLocaleTimeString()}</span>
                  ) : msg.status === "failed" ? (
                    <span class="text-error truncate max-w-xs inline-block" title={msg.error}>
                      {msg.error}
                    </span>
                  ) : (
                    <span class="opacity-50">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      </div>
    </div>
  );
};
