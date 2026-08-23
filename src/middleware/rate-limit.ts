import type { MiddlewareHandler } from "hono";

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Lightweight sliding-window in-memory rate limiter middleware.
 * Zero external dependencies.
 *
 * ponytail: in-memory Map, upgrade to Redis if multi-instance horizontally scaled.
 */
export function rateLimiter({
  windowMs = 60_000,
  max = 10,
  message = "Too many requests, please try again later.",
}: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}): MiddlewareHandler {
  const store = new Map<string, RateLimitRecord>();

  // Cleanup old entries every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 300_000);

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "127.0.0.1";

    const now = Date.now();
    let record = store.get(ip);

    if (!record) {
      record = { timestamps: [] };
      store.set(ip, record);
    }

    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= max) {
      c.res.headers.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return c.text(message, 429);
    }

    record.timestamps.push(now);
    return next();
  };
}
