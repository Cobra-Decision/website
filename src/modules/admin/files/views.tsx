import type { Locale } from "../../../lib/i18n/translations";
import { t } from "../../../lib/i18n/context";

export type FileItem = {
  name: string;
  size: number;
  sizeFormatted: string;
  isImage: boolean;
  modifiedAt: string;
  url: string;
};

export function FileGrid({
  files,
  query = {},
  locale = "en",
}: {
  files: FileItem[];
  query?: { q?: string; sort?: string; direction?: string };
  locale?: Locale;
}) {
  const q = (query.q ?? "").trim().toLowerCase();
  const sort = query.sort ?? "modifiedAt";
  const direction = query.direction === "asc" ? "asc" : "desc";

  const filtered = files.filter((f) => !q || f.name.toLowerCase().includes(q));

  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sort === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sort === "size") {
      comparison = a.size - b.size;
    } else {
      comparison = a.modifiedAt.localeCompare(b.modifiedAt);
    }
    return direction === "asc" ? comparison : -comparison;
  });

  const sortUrl = (column: string) =>
    `/dashboard/admin/files?q=${encodeURIComponent(query.q ?? "")}&sort=${encodeURIComponent(column)}&direction=${query.sort === column && query.direction === "asc" ? "desc" : "asc"}`;

  return (
    <div id="files-table" class="space-y-6" x-data="{ selectedFiles: [] }">
      {/* Page Header */}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content capitalize sm:text-3xl">
            {t("admin.files.title", locale)}
          </h1>
          <p class="text-sm text-base-content/60">
            {t("admin.files.subtitle", locale)}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="btn btn-primary btn-sm"
            hx-get="/dashboard/admin/files/upload-modal"
            hx-target="#file-modal"
          >
            {t("admin.files.upload_btn", locale)}
          </button>
          <button
            class="btn btn-outline btn-error btn-sm"
            hx-post="/dashboard/admin/files/bulk-confirm"
            hx-include="#files-bulk-form"
            hx-target="#file-modal"
          >
            {t("admin.delete_selected", locale)}
          </button>
          <button
            class="btn btn-outline btn-sm"
            hx-get="/dashboard/admin/files"
            hx-target="#files-table"
            hx-swap="outerHTML"
          >
            {t("admin.files.refresh", locale)}
          </button>
        </div>
      </div>

      {/* Search and Filter Card */}
      <form
        class="card border border-base-300 bg-base-100 p-4 shadow-sm"
        hx-get="/dashboard/admin/files"
        hx-target="#files-table"
        hx-swap="outerHTML"
      >
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label class="form-control">
            <span class="label-text font-medium text-xs">{t("admin.search", locale)}</span>
            <input
              class="input input-bordered input-sm w-full font-mono text-sm"
              name="q"
              value={query.q ?? ""}
              placeholder={t("admin.files.search_placeholder", locale)}
            />
          </label>

          <button class="btn btn-primary btn-sm" type="submit">
            {t("admin.search", locale)}
          </button>
          <a class="btn btn-ghost btn-sm" href="/dashboard/admin/files">
            {t("admin.reset", locale)}
          </a>
        </div>
      </form>

      {/* Files Table matching CrudTable styling with Checkbox selection */}
      <form id="files-bulk-form">
        <div class="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <table class="table table-zebra table-sm">
            <thead class="bg-base-200/50 text-xs font-semibold uppercase tracking-wider text-base-content/70">
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    onclick="const checked = this.checked; document.querySelectorAll('#files-bulk-form input[name=filenames]').forEach(el => el.checked = checked)"
                    aria-label="Select all files"
                  />
                </th>
                <th class="w-16">{t("common.preview", locale)}</th>
                <th>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs -ml-2 font-semibold uppercase tracking-wider"
                    hx-get={sortUrl("name")}
                    hx-target="#files-table"
                    hx-swap="outerHTML"
                  >
                    Filename{query.sort === "name" ? (query.direction === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs -ml-2 font-semibold uppercase tracking-wider"
                    hx-get={sortUrl("size")}
                    hx-target="#files-table"
                    hx-swap="outerHTML"
                  >
                    Size{query.sort === "size" ? (query.direction === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs -ml-2 font-semibold uppercase tracking-wider"
                    hx-get={sortUrl("modifiedAt")}
                    hx-target="#files-table"
                    hx-swap="outerHTML"
                  >
                    Last Modified{(!query.sort || query.sort === "modifiedAt") ? (query.direction === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
                <th class="text-right">{t("admin.actions", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length > 0 ? (
                sorted.map((file) => (
                  <tr key={file.name} class="hover">
                    <td>
                      <input
                        type="checkbox"
                        name="filenames"
                        value={file.name}
                        class="checkbox checkbox-sm"
                      />
                    </td>
                    <td>
                      {file.isImage ? (
                        <button
                          type="button"
                          class="avatar block cursor-pointer transition hover:scale-105"
                          hx-get={`/dashboard/admin/files/preview-modal?name=${encodeURIComponent(file.name)}`}
                          hx-target="#file-modal"
                        >
                          <div class="w-10 h-10 rounded-lg border border-base-300 overflow-hidden bg-base-200">
                            <img src={file.url} alt={file.name} class="h-full w-full object-cover" />
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          class="w-10 h-10 rounded-lg bg-base-200 border border-base-300 flex items-center justify-center text-xs font-mono font-bold text-base-content/60 uppercase hover:bg-base-300 transition"
                          hx-get={`/dashboard/admin/files/preview-modal?name=${encodeURIComponent(file.name)}`}
                          hx-target="#file-modal"
                        >
                          {file.name.split(".").pop() ?? "file"}
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        class="font-medium font-mono text-sm hover:underline text-left hover:text-primary"
                        hx-get={`/dashboard/admin/files/preview-modal?name=${encodeURIComponent(file.name)}`}
                        hx-target="#file-modal"
                      >
                        {file.name}
                      </button>
                    </td>
                    <td class="text-xs text-base-content/70">{file.sizeFormatted}</td>
                    <td class="text-xs text-base-content/70">{file.modifiedAt}</td>
                    <td class="text-right">
                      <div class="flex items-center justify-end gap-1.5" x-data={`{ copied: false, url: '${file.url}' }`}>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline"
                          hx-get={`/dashboard/admin/files/preview-modal?name=${encodeURIComponent(file.name)}`}
                          hx-target="#file-modal"
                        >
                          {t("common.preview", locale)}
                        </button>

                        <button
                          type="button"
                          class="btn btn-xs btn-outline"
                          x-on:click="navigator.clipboard.writeText(window.location.origin + url); copied = true; setTimeout(() => copied = false, 2000)"
                          x-text={`copied ? '${t("common.copied", locale)}' : '${t("common.copy_url", locale)}'`}
                        >
                          {t("common.copy_url", locale)}
                        </button>

                        <button
                          type="button"
                          class="btn btn-xs btn-outline"
                          hx-get={`/dashboard/admin/files/rename-modal?name=${encodeURIComponent(file.name)}`}
                          hx-target="#file-modal"
                        >
                          {t("common.rename", locale)}
                        </button>

                        <button
                          type="button"
                          class="btn btn-xs btn-outline"
                          hx-post="/dashboard/admin/files/duplicate"
                          hx-vals={JSON.stringify({ filename: file.name })}
                          hx-target="#files-table"
                          hx-swap="outerHTML"
                        >
                          {t("common.duplicate", locale)}
                        </button>

                        <button
                          type="button"
                          class="btn btn-xs btn-error btn-outline"
                          hx-get={`/dashboard/admin/files/confirm-delete?name=${encodeURIComponent(file.name)}`}
                          hx-target="#file-modal"
                        >
                          {t("common.delete", locale)}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} class="py-12 text-center text-sm text-base-content/60">
                    {t("admin.files.empty", locale)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>

      <div id="file-modal"></div>
    </div>
  );
}

export function FilePreviewModal({ file, locale = "en" }: { file: FileItem; locale?: Locale }) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <div class="flex items-center justify-between border-b border-base-200 pb-3">
          <div>
            <h3 class="font-bold text-lg text-base-content font-mono">{file.name}</h3>
            <p class="text-xs text-base-content/60 mt-0.5">
              {file.sizeFormatted} · Modified: {file.modifiedAt}
            </p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" onclick="this.closest('dialog').remove()">
            ✕
          </button>
        </div>

        <div class="my-6 flex items-center justify-center rounded-2xl border border-base-300 bg-base-200/50 p-4 min-h-64 overflow-hidden">
          {file.isImage ? (
            <img
              src={file.url}
              alt={file.name}
              class="max-h-96 max-w-full rounded-lg object-contain shadow-sm"
            />
          ) : (
            <div class="text-center space-y-2 p-8">
              <div class="inline-block rounded-2xl bg-base-300 p-6 text-3xl font-mono uppercase font-bold text-base-content/70">
                {file.name.split(".").pop() ?? "file"}
              </div>
              <p class="text-sm font-medium text-base-content/80">Non-image asset file</p>
              <p class="text-xs text-base-content/60">Direct previews are available for PNG, JPG, JPEG, SVG, WebP, and GIF.</p>
            </div>
          )}
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div class="w-full sm:flex-1">
            <input
              type="text"
              readonly
              value={file.url}
              class="input input-bordered input-sm w-full font-mono text-xs select-all bg-base-200"
            />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end" x-data={`{ copied: false, url: '${file.url}' }`}>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline btn-sm"
            >
              Open in Tab ↗
            </a>

            <button
              type="button"
              class="btn btn-primary btn-sm"
              x-on:click="navigator.clipboard.writeText(window.location.origin + url); copied = true; setTimeout(() => copied = false, 2000)"
              x-text={`copied ? '${t("common.copied", locale)}' : '${t("common.copy_url", locale)}'`}
            >
              {t("common.copy_url", locale)}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function UploadModal({ locale = "en" }: { locale?: Locale }) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-base-content">{t("common.upload", locale)}</h3>
        <p class="text-xs text-base-content/60 mt-1">
          {t("admin.presentation_file", locale)} / {t("admin.image_file", locale)}
        </p>

        <form
          hx-post="/dashboard/admin/files/upload"
          hx-encoding="multipart/form-data"
          hx-target="#files-table"
          hx-swap="outerHTML"
          class="mt-4 space-y-4"
        >
          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">{t("admin.files.upload_btn", locale)}</span>
            <input
              type="file"
              name="file"
              required
              class="file-input file-input-bordered file-input-sm w-full"
            />
          </label>

          <div class="modal-action">
            <button type="button" class="btn btn-sm" onclick="this.closest('dialog').remove()">
              {t("common.cancel", locale)}
            </button>
            <button type="submit" class="btn btn-primary btn-sm">
              {t("common.upload", locale)}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export function RenameModal({ filename, locale = "en" }: { filename: string; locale?: Locale }) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-base-content">{t("common.rename", locale)}</h3>
        <p class="text-xs text-base-content/60 mt-1 font-mono">{filename}</p>

        <form
          hx-put="/dashboard/admin/files/rename"
          hx-target="#files-table"
          hx-swap="outerHTML"
          class="mt-4 space-y-4"
        >
          <input type="hidden" name="oldName" value={filename} />

          <label class="form-control w-full">
            <span class="label-text text-xs font-medium">New Filename</span>
            <input
              class="input input-bordered input-sm w-full font-mono text-sm"
              name="newName"
              value={filename}
              required
            />
          </label>

          <div class="modal-action">
            <button type="button" class="btn btn-sm" onclick="this.closest('dialog').remove()">
              {t("common.cancel", locale)}
            </button>
            <button type="submit" class="btn btn-primary btn-sm">
              {t("common.save", locale)}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export function FileConfirmDeleteModal({ filename, locale = "en" }: { filename: string; locale?: Locale }) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-base-content">{t("admin.files.confirm_delete_title", locale)}</h3>
        <p class="text-sm text-base-content/70 mt-2">
          {t("admin.files.confirm_delete_msg", locale)}
        </p>
        <p class="font-mono text-xs text-primary mt-1">{filename}</p>

        <div class="modal-action">
          <button type="button" class="btn btn-sm" onclick="this.closest('dialog').remove()">
            {t("common.cancel", locale)}
          </button>
          <button
            type="button"
            class="btn btn-error btn-sm"
            hx-delete={`/dashboard/admin/files/${encodeURIComponent(filename)}`}
            hx-target="#files-table"
            hx-swap="outerHTML"
          >
            {t("common.delete", locale)}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function FileBulkConfirmDeleteModal({ filenames, locale = "en" }: { filenames: string[]; locale?: Locale }) {
  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-base-content">{t("admin.files.confirm_bulk_delete_title", locale)}</h3>
        <p class="text-sm text-base-content/70 mt-2">
          {t("admin.files.confirm_bulk_delete_msg", locale)}
        </p>
        <div class="mt-3 max-h-36 overflow-y-auto space-y-1 bg-base-200/50 p-2 rounded-lg text-xs font-mono">
          {filenames.map((f) => (
            <div key={f} class="truncate text-base-content/80">• {f}</div>
          ))}
        </div>

        <form
          hx-post="/dashboard/admin/files/bulk-delete"
          hx-target="#files-table"
          hx-swap="outerHTML"
          class="modal-action"
        >
          {filenames.map((f) => (
            <input type="hidden" name="filenames" value={f} key={f} />
          ))}
          <button type="button" class="btn btn-sm" onclick="this.closest('dialog').remove()">
            {t("common.cancel", locale)}
          </button>
          <button
            type="submit"
            class="btn btn-error btn-sm"
          >
            {t("admin.delete_selected", locale)} ({filenames.length})
          </button>
        </form>
      </div>
    </dialog>
  );
}
