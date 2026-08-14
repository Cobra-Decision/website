import { generateId } from "../../lib/id";
import { mkdir } from "node:fs/promises";
import { join, extname } from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? "./public/uploads";
const ASSET_BASE_URL = process.env.ASSET_BASE_URL ?? "/uploads";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

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
    await mkdir(STORAGE_DIR, { recursive: true });
    const ext = ALLOWED_IMAGE_TYPES[file.type];
    const filename = `meet_img_${generateId()}.${ext}`;
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

export async function handlePresentationUpload(file: File | null | undefined): Promise<{ url?: string; error?: string; name?: string }> {
  if (!file || typeof file === "string" || !(file instanceof File) || file.size === 0) {
    return {};
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Presentation file size exceeds maximum limit of 25 MB." };
  }

  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    const originalExt = extname(file.name).toLowerCase() || ".pdf";
    const cleanExt = originalExt.replace(/[^a-z0-9.]/gi, "") || ".pdf";
    const filename = `presentation_${generateId()}${cleanExt}`;
    const destination = join(STORAGE_DIR, filename);

    const buffer = await file.arrayBuffer();
    await Bun.write(destination, buffer);

    const url = `${ASSET_BASE_URL.replace(/\/$/, "")}/${filename}`;
    return { url, name: file.name };
  } catch (error) {
    console.error("Presentation upload error:", error);
    return { error: "Failed to upload presentation file to disk." };
  }
}
