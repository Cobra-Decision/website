import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const hashMap = new Map<string, string>();

/**
 * Returns a content-hashed asset URL for cache busting (e.g. `/app.css?v=83de2a50`).
 * Hashes are computed once in production or re-checked when needed.
 */
export function assetUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && hashMap.has(path)) {
    return `${path}?v=${hashMap.get(path)}`;
  }

  const localFile = `./public${path}`;
  if (existsSync(localFile)) {
    try {
      const content = readFileSync(localFile);
      const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
      hashMap.set(path, hash);
      return `${path}?v=${hash}`;
    } catch {
      // Fallback if read fails
    }
  }

  return path;
}
