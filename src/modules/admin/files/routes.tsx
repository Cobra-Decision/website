import { Hono, type Context } from "hono";
import type { Database } from "bun:sqlite";
import { readdir, stat, rename, unlink, copyFile, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import {
  FileGrid,
  FilePreviewModal,
  RenameModal,
  UploadModal,
  FileConfirmDeleteModal,
  FileBulkConfirmDeleteModal,
  type FileItem,
} from "./views";
import { Toast } from "../views";
import { getErrorMessage } from "../../../lib/cache";
import { handleImageUpload, handlePresentationUpload } from "../upload";
import { getLocale } from "../../../lib/i18n/context";
import { logger } from "../../../lib/logger";

export function getStorageDir(): string {
  return process.env.STORAGE_DIR ?? "./public/uploads";
}

export function getAssetBaseUrl(): string {
  return (process.env.ASSET_BASE_URL ?? "/uploads").replace(/\/$/, "");
}

export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  const base = basename(filename.trim());
  if (base.includes("..") || base.includes("/") || base.includes("\\") || base.includes("\0")) {
    return null;
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(base)) {
    return null;
  }
  return base;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function listFiles(): Promise<FileItem[]> {
  const storageDir = getStorageDir();
  const assetBaseUrl = getAssetBaseUrl();
  try {
    await mkdir(storageDir, { recursive: true });
    const entries = await readdir(storageDir);
    const files: FileItem[] = [];

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = join(storageDir, entry);
      const fileStat = await stat(fullPath);
      if (fileStat.isFile()) {
        const ext = extname(entry).toLowerCase();
        const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext);
        files.push({
          name: entry,
          size: fileStat.size,
          sizeFormatted: formatSize(fileStat.size),
          isImage,
          modifiedAt: fileStat.mtime.toISOString().replace("T", " ").slice(0, 19),
          url: `${assetBaseUrl}/${entry}`,
        });
      }
    }

    return files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  } catch (error) {
    console.error("Failed to read storage dir:", error);
    return [];
  }
}

export function createFileAdminRoutes(
  db: Database,
  renderPage?: (c: Context, title: string, body: any) => any
) {
  const app = new Hono();

  const toast = (
    c: Context,
    title: string,
    fallback: string,
    type: "info" | "error" | "success" | "warning" = "success"
  ) => {
    const locale = getLocale(c);
    const message = getErrorMessage(title) ?? { type, title, description: fallback };
    return <Toast type={message.type} title={message.title} description={message.description} locale={locale} />;
  };

  app.get("/", async (c) => {
    const locale = getLocale(c);
    const files = await listFiles();
    const table = <FileGrid files={files} query={c.req.query()} locale={locale} />;
    if (c.req.header("HX-Request")) {
      return c.html(table);
    }
    if (renderPage) {
      return renderPage(c, "File Management", table);
    }
    return c.html(table);
  });

  app.get("/preview-modal", async (c) => {
    const locale = getLocale(c);
    const rawName = c.req.query("name") ?? "";
    const filename = sanitizeFilename(rawName);
    if (!filename) return c.html(toast(c, "admin.error", "Invalid filename.", "error"), 400);

    const files = await listFiles();
    const file = files.find((f) => f.name === filename);
    if (!file) return c.html(toast(c, "admin.error", "File not found.", "error"), 404);

    return c.html(<FilePreviewModal file={file} locale={locale} />);
  });

  app.get("/upload-modal", (c) => {
    const locale = getLocale(c);
    return c.html(<UploadModal locale={locale} />);
  });

  app.get("/confirm-delete", (c) => {
    const locale = getLocale(c);
    const rawName = c.req.query("name") ?? "";
    const filename = sanitizeFilename(rawName);
    if (!filename) return c.html(toast(c, "admin.error", "Invalid filename.", "error"), 400);
    return c.html(<FileConfirmDeleteModal filename={filename} locale={locale} />);
  });

  app.on(["GET", "POST"], "/bulk-confirm", async (c) => {
    const locale = getLocale(c);
    let rawFilenames: any[] = [];
    if (c.req.method === "POST") {
      const body = await c.req.parseBody({ all: true });
      const raw = body["filenames"] || body["filenames[]"];
      rawFilenames = Array.isArray(raw) ? raw : raw ? [raw] : [];
    } else {
      const queried = c.req.queries("filenames") ?? (c.req.query("filenames") ? [c.req.query("filenames")!] : []);
      rawFilenames = queried;
    }
    const filenames = rawFilenames.map((f) => sanitizeFilename(String(f))).filter((f): f is string => Boolean(f));

    if (!filenames.length) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.nothing_selected", "Select at least one file to delete.", "warning")}
        </>,
        400
      );
    }

    return c.html(<FileBulkConfirmDeleteModal filenames={filenames} locale={locale} />);
  });

  app.post("/upload", async (c) => {
    const locale = getLocale(c);
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File) || file.size === 0) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Please select a file to upload.", "error")}
        </>,
        400
      );
    }

    const sanitized = sanitizeFilename(file.name);
    if (!sanitized) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Invalid filename.", "error")}
        </>,
        400
      );
    }

    try {
      const storageDir = getStorageDir();
      await mkdir(storageDir, { recursive: true });
      const dest = join(storageDir, sanitized);
      const buffer = await file.arrayBuffer();
      await Bun.write(dest, buffer);

      logger.file("FILE_UPLOADED", {
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { filename: sanitized, url: `${getAssetBaseUrl()}/${sanitized}`, size: file.size, mimeType: file.type },
      });

      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.created", "File uploaded successfully.")}
        </>
      );
    } catch (err) {
      logger.file("FILE_UPLOAD_FAILED", {
        level: "ERROR",
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { filename: file.name, size: file.size, mimeType: file.type },
        error: err,
      });
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Failed to save uploaded file.", "error")}
        </>,
        500
      );
    }
  });

  app.get("/rename-modal", (c) => {
    const locale = getLocale(c);
    const rawName = c.req.query("name") ?? "";
    const filename = sanitizeFilename(rawName);
    if (!filename) return c.html(toast(c, "admin.error", "Invalid filename.", "error"), 400);
    return c.html(<RenameModal filename={filename} locale={locale} />);
  });

  app.put("/rename", async (c) => {
    const locale = getLocale(c);
    const body = await c.req.parseBody();
    const oldName = sanitizeFilename(String(body.oldName ?? ""));
    const newName = sanitizeFilename(String(body.newName ?? ""));

    if (!oldName || !newName) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Invalid filename provided.", "error")}
        </>,
        400
      );
    }

    try {
      const storageDir = getStorageDir();
      const oldPath = join(storageDir, oldName);
      const newPath = join(storageDir, newName);
      await rename(oldPath, newPath);
      logger.file("FILE_RENAMED", {
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { oldName, newName },
      });
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.created", `Renamed to ${newName}`)}
        </>
      );
    } catch {
      logger.file("FILE_RENAME_FAILED", {
        level: "ERROR",
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { oldName, newName },
      });
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Failed to rename file.", "error")}
        </>,
        500
      );
    }
  });

  app.post("/duplicate", async (c) => {
    const locale = getLocale(c);
    const body = await c.req.parseBody();
    const filename = sanitizeFilename(String(body.filename ?? ""));
    if (!filename) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Invalid filename.", "error")}
        </>,
        400
      );
    }

    try {
      const storageDir = getStorageDir();
      const src = join(storageDir, filename);
      const ext = extname(filename);
      const baseNoExt = basename(filename, ext);
      const duplicateName = `copy_${Date.now()}_${baseNoExt}${ext}`;
      const dest = join(storageDir, duplicateName);

      await copyFile(src, dest);
      logger.file("FILE_COPIED", {
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { source: filename, destination: duplicateName },
      });
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.created", `Duplicated as ${duplicateName}`)}
        </>
      );
    } catch {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Failed to duplicate file.", "error")}
        </>,
        500
      );
    }
  });

  app.post("/bulk-delete", async (c) => {
    const locale = getLocale(c);
    const body = await c.req.parseBody({ all: true });
    const rawFilenames = body["filenames"] || body["filenames[]"];
    const filenamesList = Array.isArray(rawFilenames)
      ? rawFilenames
      : rawFilenames
      ? [rawFilenames]
      : [];
    const filenames = filenamesList
      .map((f) => sanitizeFilename(String(f)))
      .filter((f): f is string => Boolean(f));

    if (!filenames.length) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.nothing_selected", "Select at least one file to delete.", "warning")}
        </>,
        400
      );
    }

    const storageDir = getStorageDir();
    for (const filename of filenames) {
      try {
        await unlink(join(storageDir, filename));
        logger.file("FILE_DELETED", {
          actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
          data: { filename, bulk: true },
        });
      } catch (err) {
        console.error(`Failed to delete file ${filename}:`, err);
        logger.file("FILE_DELETE_FAILED", {
          level: "ERROR",
          actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
          data: { filename, bulk: true },
          error: err,
        });
      }
    }

    const files = await listFiles();
    return c.html(
      <>
        <FileGrid files={files} locale={locale} />
        {toast(c, "admin.deleted", `${filenames.length} file(s) deleted.`)}
      </>
    );
  });

  app.delete("/:filename", async (c) => {
    const locale = getLocale(c);
    const filename = sanitizeFilename(c.req.param("filename"));
    if (!filename) {
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Invalid filename.", "error")}
        </>,
        400
      );
    }

    try {
      const storageDir = getStorageDir();
      const target = join(storageDir, filename);
      await unlink(target);
      logger.file("FILE_DELETED", {
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { filename },
      });
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.deleted", `File ${filename} deleted.`)}
        </>
      );
    } catch (err) {
      logger.file("FILE_DELETE_FAILED", {
        level: "ERROR",
        actor: { ip: c.req.header("x-forwarded-for") ?? "local" },
        data: { filename },
        error: err,
      });
      const files = await listFiles();
      return c.html(
        <>
          <FileGrid files={files} locale={locale} />
          {toast(c, "admin.error", "Failed to delete file.", "error")}
        </>,
        500
      );
    }
  });

  return app;
}
