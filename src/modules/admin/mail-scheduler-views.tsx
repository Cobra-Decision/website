import type { ScheduledEmailRow, EmailTemplateRow, EmailAutomationRuleRow } from "../mailer/database";
import type { Tag } from "../events/types";
import { MailPlaceholdersToolbar } from "./mail-placeholders-component";
import { formatUtcDateTime } from "../events/datetime";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { DatePicker } from "../../ui/date-picker";
import { Button, Input, Textarea, Select, Checkbox, Toggle, FormField } from "../../ui/forms";

export const AutomationRuleCard = ({
  rule,
  templates,
  locale = "en",
}: {
  rule: EmailAutomationRuleRow;
  templates: EmailTemplateRow[];
  locale?: Locale;
}) => {
  let config: any = {};
  try {
    config = JSON.parse(rule.schedule_config || "{}");
  } catch {}

  const isEnabled = Boolean(rule.is_enabled);

  return (
    <div
      id={`rule-card-${rule.id}`}
      class={`card border transition-all duration-200 shadow-sm relative focus-within:z-30 ${
        isEnabled
          ? "border-primary/40 bg-base-100 ring-1 ring-primary/20"
          : "border-base-300 bg-base-200/60 opacity-80"
      }`}
    >
      <div class="card-body p-5 flex flex-col justify-between h-full space-y-4">
        <div class="space-y-3">
          {/* Header Badges & Toggle */}
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="badge badge-outline badge-xs font-mono uppercase tracking-wider font-semibold">
                {rule.trigger_type}
              </span>
              <span
                class={`badge badge-xs font-semibold gap-1 ${
                  isEnabled
                    ? "badge-success text-success-content"
                    : "badge-ghost text-base-content/60"
                }`}
              >
                <span class={`inline-block w-1.5 h-1.5 rounded-full ${isEnabled ? "bg-success-content animate-pulse" : "bg-base-content/40"}`}></span>
                {isEnabled ? t("admin.mail.active", locale) : t("admin.mail.disabled", locale)}
              </span>
            </div>

            <form
              hx-post={`/dashboard/admin/mail-scheduler/rules/${rule.id}/toggle`}
              hx-target={`#rule-card-${rule.id}`}
              hx-swap="outerHTML"
              class="flex items-center shrink-0"
            >
              <Toggle
                size="sm"
                checked={isEnabled}
                onchange="this.form.requestSubmit()"
                aria-label={`Toggle status for ${rule.title}`}
              />
            </form>
          </div>

          {/* Title & Description */}
          <div>
            <h3 class="text-base font-bold text-base-content flex items-center gap-2">
              <span>{rule.title}</span>
            </h3>
            <p class="text-xs text-base-content/70 leading-relaxed mt-1">{rule.description}</p>
          </div>

          {/* Meta Info Box */}
          <div class="rounded-xl bg-base-200/60 p-3 text-xs space-y-1.5 border border-base-300/40">
            <div class="flex items-center justify-between text-base-content/70">
              <span>{t("admin.mail.template_title", locale)}:</span>
              <span class="font-mono font-bold text-primary truncate max-w-[150px]" title={rule.template_title || "Default"}>
                {rule.template_title || "Default"}
              </span>
            </div>
            {typeof config.days_ahead !== "undefined" && (
              <div class="flex items-center justify-between text-base-content/70">
                <span>{locale === "fa" ? "زمانبندی:" : "Timing:"}</span>
                <span class="font-semibold text-base-content/90">
                  {config.days_ahead === 0
                    ? (locale === "fa" ? "روز برگزاری رویداد" : "Day of event")
                    : (locale === "fa" ? `${formatLocalizedNumber(config.days_ahead, locale)} روز قبل` : `${config.days_ahead} day(s) before`)}
                  {config.send_time ? ` (${config.send_time})` : " (06:00)"}
                </span>
              </div>
            )}
            {rule.last_run_at && (
              <div class="flex items-center justify-between text-2xs text-base-content/50 pt-1 border-t border-base-300/40">
                <span>{locale === "fa" ? "آخرین اجرا:" : "Last run:"}</span>
                <span>{new Date(rule.last_run_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div class="pt-3 border-t border-base-200 flex items-center justify-between gap-2">
          <form
            hx-post={`/dashboard/admin/mail-scheduler/rules/${rule.id}/trigger`}
            hx-target={`#rule-card-${rule.id}`}
            hx-swap="outerHTML"
          >
            <Button
              type="submit"
              size="xs"
              variant="primary"
              outline
              title="Force run this automated trigger now"
            >
              {locale === "fa" ? "اجرا اکنون" : "Run Now"}
            </Button>
          </form>

          <details class="dropdown dropdown-end dropdown-top sm:dropdown-bottom relative z-50">
            <summary class="btn btn-xs btn-ghost">{locale === "fa" ? "پیکربندی" : "Configure"}</summary>
            <div class="dropdown-content z-50 menu p-4 shadow-2xl bg-base-100 border border-base-300 rounded-box w-72 space-y-3">
              <h4 class="font-bold text-xs text-base-content">{locale === "fa" ? `پیکربندی ${rule.title}` : `Configure ${rule.title}`}</h4>
              <form
                hx-post={`/dashboard/admin/mail-scheduler/rules/${rule.id}/update`}
                hx-target={`#rule-card-${rule.id}`}
                hx-swap="outerHTML"
                class="space-y-3"
              >
                <FormField label={t("admin.mail.template_title", locale)}>
                  <Select name="templateTitle" size="xs">
                    {templates.map((tpl) => (
                      <option
                        key={tpl.id}
                        value={tpl.title}
                        selected={tpl.title === rule.template_title}
                      >
                        {tpl.title}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {typeof config.days_ahead !== "undefined" && (
                  <>
                    <FormField label={locale === "fa" ? "روزهای قبل" : "Days Ahead"}>
                      <Input
                        type="number"
                        name="daysAhead"
                        min="0"
                        max="30"
                        value={config.days_ahead}
                        size="xs"
                      />
                    </FormField>

                    <FormField label={locale === "fa" ? "ساعت ارسال" : "Send Time (HH:MM)"}>
                      <Input
                        type="time"
                        name="sendTime"
                        value={config.send_time || "06:00"}
                        size="xs"
                      />
                    </FormField>
                  </>
                )}

                <Button type="submit" variant="primary" size="xs" block>{t("admin.save", locale)}</Button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export const MailSchedulerView = ({
  scheduledList,
  automationRules,
  templates,
  tags,
  users,
  meets = [],
  locale = "en",
  timeZone = "Asia/Tehran",
}: {
  scheduledList: ScheduledEmailRow[];
  automationRules: EmailAutomationRuleRow[];
  templates: EmailTemplateRow[];
  tags: Tag[];
  users: { id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }[];
  meets?: { id: string; title: string; scheduled_date: string; scheduled_time: string; status: string }[];
  locale?: Locale;
  timeZone?: string;
}) => {
  return (
    <div
      class="space-y-8"
      x-data={`{
        activeTab: 'rules',
        editorSubTab: 'compose',
        targetMode: 'all',
        format: 'html',
        selectedTemplateId: '',
        selectedMeetId: '',
        sendNow: false,
        title: '',
        subject: '',
        body: '',
        scheduleDate: '',
        scheduleTime: '12:00',
        tagSearch: '',
        userSearch: '',
        templates: ${JSON.stringify(templates.map((t) => ({ id: t.id, title: t.title, subject: t.subject, format: t.format, value: t.value })))},
        allTags: ${JSON.stringify(tags.map((t) => ({ id: t.id, title: t.title })))},
        allMeets: ${JSON.stringify(meets.map((m) => ({ id: m.id, title: m.title, date: m.scheduled_date, time: m.scheduled_time })))},
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
          if (t.title.includes('attendees_reminder') && this.selectedMeetId) {
            this.targetMode = 'meet_attendees';
          } else if (t.title.includes('tag_reminder') && this.selectedMeetId) {
            this.targetMode = 'tag_followers';
          }
        },
        onMeetChange() {
          if (this.selectedMeetId && this.targetMode !== 'meet_attendees' && this.targetMode !== 'tag_followers') {
            const m = this.allMeets.find(x => x.id === this.selectedMeetId);
            if (m && !this.title) {
              this.title = 'Event: ' + m.title;
            }
          }
        },
        get currentMeet() {
          return this.allMeets.find(x => x.id === this.selectedMeetId) || null;
        },
        get interpolatedPreview() {
          if (!this.body || !this.body.trim()) {
            return '<div class="p-6 text-center text-base-content/40 italic">Body is empty. Compose an email to see preview.</div>';
          }
          const m = this.currentMeet;
          const meetTitle = m ? m.title : 'Distributed Systems Architecture';
          const meetDate = m ? m.date : '2026-09-30';
          const meetTime = m ? m.time : '18:00';
          const meetLink = window.location.origin + '/meets/' + (m ? m.id : 'sample-meet');

          let text = this.body
            .replace(/\\{\\{\\s*name\\s*\\}\\}/gi, 'Sara Ahmadi')
            .replace(/\\{\\{\\s*email\\s*\\}\\}/gi, 'sara@example.com')
            .replace(/\\{\\{\\s*first_name\\s*\\}\\}/gi, 'Sara')
            .replace(/\\{\\{\\s*last_name\\s*\\}\\}/gi, 'Ahmadi')
            .replace(/\\{\\{\\s*username\\s*\\}\\}/gi, 'sara_dev')
            .replace(/\\{\\{\\s*dashboard_url\\s*\\}\\}/gi, window.location.origin + '/dashboard/user')
            .replace(/\\{\\{\\s*unsubscribe_url\\s*\\}\\}/gi, window.location.origin + '/dashboard/account')
            .replace(/\\{\\{\\s*date\\s*\\}\\}/gi, new Date().toLocaleDateString())
            .replace(/\\{\\{\\s*date_shamsi\\s*\\}\\}/gi, new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()))
            .replace(/\\{\\{\\s*meet_title\\s*\\}\\}/gi, meetTitle)
            .replace(/\\{\\{\\s*meet_title_encoded\\s*\\}\\}/gi, encodeURIComponent(meetTitle))
            .replace(/\\{\\{\\s*meet_date\\s*\\}\\}/gi, meetDate)
            .replace(/\\{\\{\\s*meet_date_shamsi\\s*\\}\\}/gi, '۸ مهر ۱۴۰۵')
            .replace(/\\{\\{\\s*meet_time\\s*\\}\\}/gi, meetTime)
            .replace(/\\{\\{\\s*meet_duration\\s*\\}\\}/gi, '60')
            .replace(/\\{\\{\\s*presenter_name\\s*\\}\\}/gi, 'Babak Fathi')
            .replace(/\\{\\{\\s*meet_link\\s*\\}\\}/gi, meetLink)
            .replace(/\\{\\{\\s*meet_link_encoded\\s*\\}\\}/gi, encodeURIComponent(meetLink))
            .replace(/\\{\\{\\s*tags\\s*\\}\\}/gi, 'Backend, TypeScript, Bun');

          if (this.format === 'markdown') {
            return '<div class="prose max-w-none text-xs p-4">' + text.replace(/\\n/g, '<br/>') + '</div>';
          }
          if (this.format === 'text') {
            return '<pre class="whitespace-pre-wrap font-mono text-xs p-4 bg-base-200/50 rounded">' + text + '</pre>';
          }
          return text;
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
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
            {t("admin.mail.scheduler_title", locale)}
          </h1>
          <p class="text-sm text-base-content/60">
            {t("admin.mail.scheduler_subtitle", locale)}
          </p>
        </div>
        <Button
          hx-get="/dashboard/admin/mail-scheduler"
          hx-target="main"
          hx-select="main > *"
          variant="outline"
          size="sm"
        >
          {t("admin.files.refresh", locale)}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div class="tabs tabs-boxed bg-base-200 p-1 w-full sm:w-fit overflow-x-auto flex-nowrap">
        <button
          type="button"
          class="tab tab-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-initial"
          x-bind:class="activeTab === 'rules' ? 'tab-active' : ''"
          x-on:click="activeTab = 'rules'"
        >
          {t("admin.mail.active_rules", locale)} ({formatLocalizedNumber(automationRules.length, locale)})
        </button>
        <button
          type="button"
          class="tab tab-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-initial"
          x-bind:class="activeTab === 'schedule' ? 'tab-active' : ''"
          x-on:click="activeTab = 'schedule'"
        >
          {t("admin.mail.send_now", locale)}
        </button>
        <button
          type="button"
          class="tab tab-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-initial"
          x-bind:class="activeTab === 'queue' ? 'tab-active' : ''"
          x-on:click="activeTab = 'queue'"
        >
          {t("admin.mail.scheduled_cron", locale)} ({formatLocalizedNumber(scheduledList.length, locale)})
        </button>
      </div>

      {/* 1. Automated Email Rules Section */}
      <div x-show="activeTab === 'rules'" class="space-y-4">
        <div class="card border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-base-200 pb-3">
              <div>
                <h2 class="text-lg font-bold text-base-content">{t("admin.mail.active_rules", locale)}</h2>
                <p class="text-xs text-base-content/60">
                  {t("admin.mail.scheduler_subtitle", locale)}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {automationRules.map((rule) => (
                <AutomationRuleCard key={rule.id} rule={rule} templates={templates} locale={locale} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Schedule Creation Card */}
      <div x-show="activeTab === 'schedule'" class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 border-b border-base-200 pb-3">
            <div>
              <h2 class="text-lg font-bold text-base-content">{t("admin.mail.send_now", locale)}</h2>
              <p class="text-xs text-base-content/60">
                {t("admin.mail.scheduler_subtitle", locale)}
              </p>
            </div>

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
            hx-post="/dashboard/admin/mail-scheduler/schedule"
            hx-target="main"
            hx-select="main > *"
            class="space-y-4"
          >
            <input type="hidden" name="format" x-bind:value="format" />

            {/* Template Selector & Title */}
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField label={t("admin.mail.select_template", locale)}>
                <Select
                  size="sm"
                  name="templateId"
                  x-model="selectedTemplateId"
                  x-on:change="loadTemplate(selectedTemplateId)"
                >
                  <option value="">{locale === "fa" ? "-- بدون قالب پیش‌فرض --" : "-- Custom Email / No Template --"}</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.format})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t("admin.mail.template_title", locale)} required>
                <Input
                  name="title"
                  required
                  placeholder="e.g. September Community Meetup"
                  x-model="title"
                  size="sm"
                  class="text-xs"
                />
              </FormField>
            </div>

            {/* Target Audience Mode & Meeting Context */}
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField label={locale === "fa" ? "جلسه / رویداد مرتبط (اختیاری)" : "Event / Meet Context (Optional)"}>
                <Select
                  size="sm"
                  name="meetId"
                  x-model="selectedMeetId"
                  x-on:change="onMeetChange()"
                >
                  <option value="">{locale === "fa" ? "-- بدون انتخاب جلسه --" : "-- No Specific Meet Selected --"}</option>
                  <template x-for="m in allMeets" x-bind:key="m.id">
                    <option x-bind:value="m.id" x-text="m.title + ' (' + m.date + ' ' + m.time + ')'"></option>
                  </template>
                </Select>
              </FormField>

              <FormField label={t("admin.mail.recipient_mode", locale)} required>
                <Select
                  size="sm"
                  name="targetMode"
                  x-model="targetMode"
                >
                  <option value="all">{t("admin.mail.mode_all", locale)} ({formatLocalizedNumber(users.length, locale)})</option>
                  <option value="meet_attendees" x-show="selectedMeetId" x-cloak>{locale === "fa" ? "شرکت‌کنندگان ثبت‌نام‌شده در جلسه انتخاب‌شده (RSVP)" : "Confirmed RSVP Attendees of Selected Meet"}</option>
                  <option value="tag_followers" x-show="selectedMeetId" x-cloak>{locale === "fa" ? "دنبال‌کنندگان تگ‌های جلسه انتخاب‌شده" : "Users Following Selected Meet's Tags"}</option>
                  <option value="tags">{t("admin.mail.mode_tags", locale)}</option>
                  <option value="domain">{locale === "fa" ? "فیلتر بر اساس دامنه ایمیل (مثلاً gmail.com)" : "Filter by Email Domain (e.g. gmail.com)"}</option>
                  <option value="selected">{t("admin.mail.mode_users", locale)}</option>
                </Select>
              </FormField>

              <div class="form-control sm:col-span-2 flex flex-col md:flex-row md:items-end justify-between gap-4 p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div class="flex items-center gap-3">
                  <Checkbox
                    size="sm"
                    name="sendNow"
                    value="true"
                    x-model="sendNow"
                    label={locale === "fa" ? "ارسال فوری (Run Now) بدون زمانبندی آینده" : "Send Immediately (Run Now without future schedule)"}
                    class="font-bold text-xs"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto" x-show="!sendNow" x-cloak>
                  <div class="w-full sm:w-48">
                    <DatePicker
                      name="scheduleDate"
                      label={locale === "fa" ? "تاریخ ارسال" : "Schedule Date"}
                      locale={locale}
                    />
                  </div>
                  <FormField label={locale === "fa" ? "ساعت ارسال" : "Schedule Time"}>
                    <Input
                      type="time"
                      name="scheduleTime"
                      x-model="scheduleTime"
                      size="sm"
                      class="text-xs"
                    />
                  </FormField>
                </div>
              </div>

              {/* Tag selector */}
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
                <FormField label={locale === "fa" ? "دامنه ایمیل" : "Email Domain Filter"}>
                  <Input
                    name="domain"
                    placeholder="e.g. gmail.com or company.org"
                    size="sm"
                    class="text-xs"
                  />
                </FormField>
              </div>

              {/* Selected Users */}
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
                  placeholder={locale === "fa" ? "جستجوی کاربران بر اساس نام یا ایمیل..." : "Search users by name or email..."}
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
                        <span class="text-base-content/60 text-2xs ms-1" x-text="'(' + u.name + ')'"></span>
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
                x-model="subject"
                size="sm"
                class="text-xs"
              />
            </FormField>

            {/* Body Textarea & Live Preview */}
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="label py-0"><span class="label-text font-semibold text-xs">{t("admin.mail.body_content", locale)} *</span></label>
                <div class="join">
                  <Button
                    size="xs"
                    class="join-item btn-2xs"
                    x-bind:class="editorSubTab === 'compose' ? 'btn-primary' : 'btn-ghost'"
                    x-on:click="editorSubTab = 'compose'"
                  >
                    {locale === "fa" ? "ویرایش متن" : "Compose"}
                  </Button>
                  <Button
                    size="xs"
                    class="join-item btn-2xs"
                    x-bind:class="editorSubTab === 'preview' ? 'btn-primary' : 'btn-ghost'"
                    x-on:click="editorSubTab = 'preview'"
                  >
                    {locale === "fa" ? "پیش‌نمایش زنده" : "Live Preview"}
                  </Button>
                </div>
              </div>

              <div x-show="editorSubTab === 'compose'" class="space-y-1">
                <MailPlaceholdersToolbar onInsertMethod="insertTag" />
                <Textarea
                  x-ref="bodyTextarea"
                  name="body"
                  required
                  x-model="body"
                  rows={7}
                  size="sm"
                  placeholder="Compose scheduled email body. {{name}}, {{email}}, {{date}}, {{date_shamsi}}, {{meet_title}}, {{meet_link}} supported."
                  class="font-mono text-xs leading-relaxed"
                />
              </div>

              <div x-show="editorSubTab === 'preview'" x-cloak class="rounded-xl border border-base-300 bg-base-200/30 overflow-hidden">
                <div class="bg-base-200 p-2.5 px-4 border-b border-base-300 flex items-center justify-between text-2xs">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-base-content">{locale === "fa" ? "موضوع:" : "Subject:"}</span>
                    <span class="font-semibold text-primary" x-text="subject || '(No subject)'"></span>
                  </div>
                  <span class="badge badge-xs badge-outline uppercase font-mono" x-text="format"></span>
                </div>
                <div class="p-4 bg-white text-slate-900 min-h-[160px]" x-html="interpolatedPreview"></div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <span class="text-xs text-base-content/60" x-show="sendNow" x-cloak>
                {locale === "fa" ? "⚡ ایمیل‌ها بلافاصله پس از کلیک به صف ارسال افزوده خواهند شد." : "⚡ Emails will be enqueued for immediate delivery upon clicking send."}
              </span>
              <span x-show="!sendNow"></span>
              <Button variant="primary" size="sm" type="submit" htmxIndicator>
                <span x-text={`sendNow ? '${locale === "fa" ? "ارسال فوری (Run Now)" : "Send Immediately (Run Now)"}' : '${t("admin.mail.send_now", locale)}'`}>
                  {t("admin.mail.send_now", locale)}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. Scheduled Tasks Queue Table */}
      <div x-show="activeTab === 'queue'" class="card border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div class="card-body p-6">
          <h2 class="text-lg font-bold text-base-content">
            {t("admin.mail.scheduled_cron", locale)} ({formatLocalizedNumber(scheduledList.length, locale)})
          </h2>
          <p class="text-xs text-base-content/60 mb-4">
            {t("admin.mail.scheduler_subtitle", locale)}
          </p>

          <div class="overflow-x-auto">
            <table class="table table-sm table-zebra w-full">
              <thead>
                <tr>
                  <th>{t("admin.platforms.timestamp", locale)}</th>
                  <th>{t("admin.mail.template_title", locale)}</th>
                  <th>{t("admin.mail.recipient_mode", locale)}</th>
                  <th>{t("admin.mail.format", locale)}</th>
                  <th>{locale === "fa" ? "زمانبندی شده برای" : "Scheduled For"}</th>
                  <th>{t("admin.mail.sent_count", locale)}</th>
                  <th>{t("admin.actions", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {scheduledList.length === 0 ? (
                  <tr>
                    <td colSpan={7} class="text-center py-6 text-base-content/50">
                      {t("admin.mail.no_logs", locale)}
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
                      <td class="text-xs" title={job.scheduled_for}>
                        {formatUtcDateTime(job.scheduled_for, locale, timeZone).full || new Date(job.scheduled_for).toLocaleString()}
                      </td>
                      <td class="text-xs font-bold text-center">
                        {formatLocalizedNumber(job.sent_count, locale)}
                      </td>
                      <td>
                        <div class="flex items-center gap-1">
                          {job.status === "pending" && (
                            <form
                              hx-post={`/dashboard/admin/mail-scheduler/cancel?id=${job.id}`}
                              hx-target="main"
                              hx-select="main > *"
                            >
                              <Button type="submit" size="xs" variant="warning" outline>
                                {t("admin.cancel", locale)}
                              </Button>
                            </form>
                          )}
                          <form
                            hx-post={`/dashboard/admin/mail-scheduler/repeat?id=${job.id}`}
                            hx-target="main"
                            hx-select="main > *"
                          >
                            <Button type="submit" size="xs" variant="info" outline title="Repeat this broadcast in queue">
                              {locale === "fa" ? "تکرار" : "Repeat"}
                            </Button>
                          </form>
                          <form
                            hx-post={`/dashboard/admin/mail-scheduler/delete?id=${job.id}`}
                            hx-confirm={locale === "fa" ? "آیا از حذف این ارسال زمانبندی شده مطمئن هستید؟" : "Are you sure you want to delete this scheduled job?"}
                            hx-target="main"
                            hx-select="main > *"
                          >
                            <Button type="submit" size="xs" variant="ghost" class="text-error">
                              {t("admin.delete", locale)}
                            </Button>
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
