import { generateId } from "../../lib/id";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? "./public/uploads";
const ASSET_BASE_URL = process.env.ASSET_BASE_URL ?? "/uploads";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export async function handleImageUpload(file: File | null | undefined): Promise<{ url?: string; error?: string }> {
  if (!file || typeof file === "string" || !(file instanceof File) || file.size === 0) {
    return {};
  }

  if (!ALLOWED_TYPES[file.type]) {
    return { error: "Invalid image format. Allowed: PNG, JPEG, WebP." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Image size exceeds maximum limit of 5 MB." };
  }

  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    const ext = ALLOWED_TYPES[file.type];
    const filename = `meet_${generateId()}.${ext}`;
    const destination = join(STORAGE_DIR, filename);

    const buffer = await file.arrayBuffer();
    await Bun.write(destination, buffer);

    const url = `${ASSET_BASE_URL.replace(/\/$/, "")}/${filename}`;
    return { url };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "Failed to upload image file to disk." };
  }
}
