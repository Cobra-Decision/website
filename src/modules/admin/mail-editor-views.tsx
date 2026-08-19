import type { EmailTemplateRow } from "../mailer/database";
import { PREBUILT_EMAIL_TEMPLATES } from "../mailer/database";
import { MailPlaceholdersToolbar } from "./mail-placeholders-component";

export const MailEditorView = ({
  templates,
  currentTemplate,
}: {
  templates: EmailTemplateRow[];
  currentTemplate?: EmailTemplateRow | null;
}) => {
  const initialTitle = currentTemplate?.title ?? "";
  const initialSubject = currentTemplate?.subject ?? "";
  const initialFormat = currentTemplate?.format ?? "html";
  const initialDescription = currentTemplate?.description ?? "";
  const initialValue = currentTemplate?.value ?? "";
  const initialId = currentTemplate?.id ?? "";

  return (
    <div
      class="space-y-8"
      x-data={`{
        templateId: ${JSON.stringify(initialId)},
        title: ${JSON.stringify(initialTitle)},
        subject: ${JSON.stringify(initialSubject)},
        format: ${JSON.stringify(initialFormat)},
        description: ${JSON.stringify(initialDescription)},
        value: ${JSON.stringify(initialValue)},
        preview: true,
        previewMode: 'interpolated',
        samples: ${JSON.stringify(PREBUILT_EMAIL_TEMPLATES)},
        selectedSample: '',
        loadSample(sampleTitle) {
          const s = this.samples.find(x => x.title === sampleTitle);
          if (!s) return;
          this.title = s.title;
          this.subject = s.subject;
          this.format = s.format;
          this.description = s.description;
          this.value = s.value;
        },
        resetForm() {
          this.templateId = '';
          this.title = '';
          this.subject = '';
          this.format = 'html';
          this.description = '';
          this.value = '';
          this.selectedSample = '';
        },
        insertTag(placeholder) {
          const textarea = this.$refs.bodyTextarea;
          if (!textarea) {
            this.value = (this.value || '') + placeholder;
            return;
          }
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          this.value = (this.value || '').substring(0, start) + placeholder + (this.value || '').substring(end);
          this.$nextTick(() => {
            textarea.focus();
            textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
          });
        },
        get interpolatedPreview() {
          if (!this.value || !this.value.trim()) return '<span class="text-gray-400 italic">Template body is empty.</span>';
          let body = this.value
            .replace(/\\{\\{\\s*name\\s*\\}\\}/gi, 'Sara Ahmadi')
            .replace(/\\{\\{\\s*email\\s*\\}\\}/gi, 'sara@example.com')
            .replace(/\\{\\{\\s*first_name\\s*\\}\\}/gi, 'Sara')
            .replace(/\\{\\{\\s*last_name\\s*\\}\\}/gi, 'Ahmadi')
            .replace(/\\{\\{\\s*username\\s*\\}\\}/gi, 'sara_dev')
            .replace(/\\{\\{\\s*otp\\s*\\}\\}/gi, '849201')
            .replace(/\\{\\{\\s*meet_title\\s*\\}\\}/gi, 'Distributed Systems with Bun & SQLite')
            .replace(/\\{\\{\\s*meet_date\\s*\\}\\}/gi, '2026-08-25')
            .replace(/\\{\\{\\s*meet_time\\s*\\}\\}/gi, '18:00')
            .replace(/\\{\\{\\s*meet_duration\\s*\\}\\}/gi, '75')
            .replace(/\\{\\{\\s*presenter_name\\s*\\}\\}/gi, 'Babak Fathi')
            .replace(/\\{\\{\\s*tags\\s*\\}\\}/gi, 'Architecture, Backend, SQLite')
            .replace(/\\{\\{\\s*meet_link\\s*\\}\\}/gi, window.location.origin + '/meets/sample-123')
            .replace(/\\{\\{\\s*dashboard_url\\s*\\}\\}/gi, window.location.origin + '/dashboard/user')
            .replace(/\\{\\{\\s*date\\s*\\}\\}/gi, new Date().toLocaleDateString())
            .replace(/\\{\\{\\s*date_shamsi\\s*\\}\\}/gi, new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()))
            .replace(/\\{\\{\\s*meet_date_shamsi\\s*\\}\\}/gi, '۳ شهریور ۱۴۰۵')
            .replace(/\\{\\{\\s*unsubscribe_url\\s*\\}\\}/gi, '#');

          if (this.format === 'markdown') {
            const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let html = body
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
            return '<pre style="white-space:pre-wrap;font-family:monospace;background:#f8fafc;padding:12px;border-radius:6px;">' + body + '</pre>';
          }
          return body;
        }
      }`}
    >
      {/* Header */}
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Mail Editor</h1>
          <p class="text-sm text-base-content/60">
            Build, edit, and preview dynamic email templates (HTML, Markdown, Plain Text) with variable interpolation.
          </p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-sm btn-outline" x-on:click="resetForm()">
            + New Template
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saved Templates List Sidebar */}
        <div class="lg:col-span-1 space-y-4">
          <div class="card border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body p-4 space-y-3">
              <div class="flex items-center justify-between border-b border-base-200 pb-2">
                <h3 class="font-bold text-sm text-base-content">
                  Saved Templates ({templates.length})
                </h3>
              </div>
              <div class="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {templates.length === 0 ? (
                  <p class="text-xs text-base-content/50 italic py-4 text-center">
                    No templates saved yet.
                  </p>
                ) : (
                  templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      class="p-3 rounded-lg border border-base-300 bg-base-200/40 hover:bg-base-200 transition flex flex-col gap-1.5"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-semibold text-xs text-primary font-mono truncate">
                          {tpl.title}
                        </span>
                        <span class="badge badge-ghost badge-xs uppercase font-mono">
                          {tpl.format}
                        </span>
                      </div>
                      <p class="text-xs text-base-content/70 truncate">{tpl.subject || "No subject"}</p>
                      {tpl.description && (
                        <p class="text-2xs text-base-content/50 line-clamp-1">{tpl.description}</p>
                      )}
                      <div class="flex items-center justify-between pt-1 border-t border-base-300/40 mt-1">
                        <span class="text-2xs text-base-content/40">
                          {new Date(tpl.updated_at).toLocaleDateString()}
                        </span>
                        <div class="flex gap-1">
                          <button
                            type="button"
                            class="btn btn-xs btn-ghost text-primary"
                            x-on:click={`
                              templateId = ${JSON.stringify(tpl.id)};
                              title = ${JSON.stringify(tpl.title)};
                              subject = ${JSON.stringify(tpl.subject)};
                              format = ${JSON.stringify(tpl.format)};
                              description = ${JSON.stringify(tpl.description || "")};
                              value = ${JSON.stringify(tpl.value)};
                            `}
                          >
                            Edit
                          </button>
                          <form
                            hx-post={`/dashboard/admin/mail-editor/delete?id=${tpl.id}`}
                            hx-confirm="Are you sure you want to delete this email template?"
                            hx-target="main"
                            hx-select="main > *"
                          >
                            <button type="submit" class="btn btn-xs btn-ghost text-error">
                              ✕
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Builder & Live Editor Pane */}
        <div class="lg:col-span-2 space-y-4">
          <div class="card border border-base-300 bg-base-100 shadow-sm">
            <div class="card-body p-6 space-y-4">
              {/* Top bar: Prebuilt loader & format switch */}
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 pb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-base-content">Load Sample:</span>
                  <select
                    class="select select-bordered select-xs"
                    x-model="selectedSample"
                    x-on:change="loadSample(selectedSample)"
                  >
                    <option value="">Select prebuilt starter sample...</option>
                    <template x-for="s in samples" x-bind:key="s.title">
                      <option x-bind:value="s.title" x-text="s.title"></option>
                    </template>
                  </select>
                </div>

                {/* Format switcher */}
                <div class="join">
                  <button
                    type="button"
                    class="btn btn-xs join-item"
                    x-bind:class="format === 'html' ? 'btn-primary' : 'btn-ghost'"
                    x-on:click="format = 'html'"
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs join-item"
                    x-bind:class="format === 'markdown' ? 'btn-primary' : 'btn-ghost'"
                    x-on:click="format = 'markdown'"
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs join-item"
                    x-bind:class="format === 'text' ? 'btn-primary' : 'btn-ghost'"
                    x-on:click="format = 'text'"
                  >
                    Plain Text
                  </button>
                </div>
              </div>

              {/* Template Edit Form */}
              <form
                hx-post="/dashboard/admin/mail-editor/save"
                hx-target="main"
                hx-select="main > *"
                class="space-y-4"
              >
                <input type="hidden" name="id" x-bind:value="templateId" />
                <input type="hidden" name="format" x-bind:value="format" />

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text font-semibold text-xs">Template Slug / Identifier *</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. welcome_email, spring_meetup"
                      x-model="title"
                      class="input input-bordered input-sm font-mono text-xs w-full"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text font-semibold text-xs">Subject Line *</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      placeholder="Email subject with {{variables}} supported"
                      x-model="subject"
                      class="input input-bordered input-sm text-xs w-full"
                    />
                  </div>
                </div>

                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text font-semibold text-xs">Description (Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="description"
                    placeholder="Short summary of when this email is triggered"
                    x-model="description"
                    class="input input-bordered input-sm text-xs w-full"
                  />
                </div>

                {/* Variable insertion bar */}
                <div class="space-y-1.5 pt-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-base-content/70">Insert Variable Placeholders:</span>
                    <button
                      type="button"
                      class="btn btn-xs btn-ghost text-2xs"
                      x-on:click="preview = !preview"
                    >
                      <span x-text="preview ? 'Hide Live Preview' : 'Show Live Preview'"></span>
                    </button>
                  </div>
                  <MailPlaceholdersToolbar onInsertMethod="insertTag" />
                </div>

                {/* Body Textarea */}
                <div class="form-control">
                  <textarea
                    x-ref="bodyTextarea"
                    name="value"
                    required
                    x-model="value"
                    rows={12}
                    placeholder="Enter template body (HTML, Markdown, or Text)..."
                    class="textarea textarea-bordered font-mono text-xs w-full leading-relaxed"
                  ></textarea>
                </div>

                {/* Live Preview Panel */}
                <div x-show="preview" x-cloak class="space-y-2">
                  <div class="flex items-center justify-between border-b pb-1">
                    <span class="text-xs font-bold uppercase text-base-content/50">
                      Live Output Preview (Variables Interpolated)
                    </span>
                    <span class="badge badge-sm badge-ghost font-mono text-2xs" x-text="format"></span>
                  </div>
                  <div
                    class="rounded-xl border border-base-300 bg-white p-4 text-slate-800 shadow-inner overflow-x-auto min-h-[140px]"
                    x-html="interpolatedPreview"
                  ></div>
                </div>

                {/* Form Actions */}
                <div class="flex items-center justify-between pt-2 border-t border-base-200">
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost"
                    x-on:click="resetForm()"
                  >
                    Clear
                  </button>
                  <button class="btn btn-primary btn-sm gap-2" type="submit">
                    <span class="htmx-indicator loading loading-spinner loading-xs"></span>
                    <span x-text="templateId ? 'Update Template' : 'Save New Template'"></span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
