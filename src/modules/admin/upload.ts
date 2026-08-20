import { generateId } from "../../lib/id";
import { mkdir } from "node:fs/promises";
import { join, extname } from "node:path";

export function getStorageDir(): string {
  return process.env.STORAGE_DIR ?? "./public/uploads";
}

export function getAssetBaseUrl(): string {
  return (process.env.ASSET_BASE_URL ?? "/uploads").replace(/\/$/, "");
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

export async function handleVideoUpload(file: File | null | undefined): Promise<{ url?: string; error?: string; name?: string }> {
  if (!file || typeof file === "string" || !(file instanceof File) || file.size === 0) {
    return {};
  }

  if (!ALLOWED_VIDEO_TYPES[file.type] && !file.name.match(/\.(mp4|webm|ogv|mov)$/i)) {
    return { error: "Invalid video format. Allowed: MP4, WebM, OGG, MOV." };
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return { error: "Video file size exceeds maximum limit of 100 MB." };
  }

  try {
    const storageDir = getStorageDir();
    const assetBaseUrl = getAssetBaseUrl();
    await mkdir(storageDir, { recursive: true });
    const originalExt = extname(file.name).toLowerCase() || ".mp4";
    const cleanExt = originalExt.replace(/[^a-z0-9.]/gi, "") || ".mp4";
    const filename = `meet_video_${generateId()}${cleanExt}`;
    const destination = join(storageDir, filename);

    const buffer = await file.arrayBuffer();
    await Bun.write(destination, buffer);

    const url = `${assetBaseUrl}/${filename}`;
    return { url, name: file.name };
  } catch (error) {
    console.error("Video upload error:", error);
    return { error: "Failed to upload video file to disk." };
  }
}

export async function handleImageUpload(file: File | null | undefined): Promise<{ url?: string; error?: string }> {
  if (!file || typeof file === "string" || !(file instanceof File) || file.size === 0) {
    return {};
  }

  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return { error: "Invalid image format. Allowed: PNG, JPEG, WebP." };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { error: "Image size exceeds maximum limit of 5 MB." };
  }

  try {
    const storageDir = getStorageDir();
    const assetBaseUrl = getAssetBaseUrl();
    await mkdir(storageDir, { recursive: true });
    const ext = ALLOWED_IMAGE_TYPES[file.type];
    const filename = `meet_img_${generateId()}.${ext}`;
    const destination = join(storageDir, filename);

    const buffer = await file.arrayBuffer();
    await Bun.write(destination, buffer);

    const url = `${assetBaseUrl}/${filename}`;
    return { url };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "Failed to upload image file to disk." };
  }
}

export async function handlePresentationUpload(file: File | null | undefined): Promise<{ url?: string; error?: string; name?: string }> {
  if (!file || typeof file === "string" || !(file instanceof File) || file.size === 0) {
    return {};
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Presentation file size exceeds maximum limit of 25 MB." };
  }

  try {
    const storageDir = getStorageDir();
    const assetBaseUrl = getAssetBaseUrl();
    await mkdir(storageDir, { recursive: true });
    const originalExt = extname(file.name).toLowerCase() || ".pdf";
    const cleanExt = originalExt.replace(/[^a-z0-9.]/gi, "") || ".pdf";
    const filename = `presentation_${generateId()}${cleanExt}`;
    const destination = join(storageDir, filename);

    const buffer = await file.arrayBuffer();
    await Bun.write(destination, buffer);

    const url = `${assetBaseUrl}/${filename}`;
    return { url, name: file.name };
  } catch (error) {
    console.error("Presentation upload error:", error);
    return { error: "Failed to upload presentation file to disk." };
  }
}
