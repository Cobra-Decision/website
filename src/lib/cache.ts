import type { Database } from "bun:sqlite";
import { getUpcomingMeets } from "../modules/events/queries";
import type { MeetWithDetails } from "../modules/events/types";

const limit = 100;
const cache = new Map<string, unknown>();

export type LandingCache = { totalUsers: number; totalMeetHours: number; meets: MeetWithDetails[] };
export type ErrorMessage = { type: "info" | "error" | "success" | "warning"; title: string; description: string };

export function initCache(database: Database) {
  refreshLandingCache(database);
  refreshErrorCache(database);
}

export function refreshLandingCache(database: Database) {
  const hasTable = (name: string) => Boolean(database.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
  const totalUsers = hasTable("users") ? database.query<{ total: number }, []>("SELECT COUNT(*) total FROM users WHERE deleted_at IS NULL").get()!.total : 0;
  if (!hasTable("meets")) {
    setCache("landing", { totalUsers, totalMeetHours: 0, meets: [] } satisfies LandingCache);
    return;
  }
  const totalMinutes = database.query<{ total: number }, []>("SELECT COALESCE(SUM(duration_minutes), 0) total FROM meets WHERE deleted_at IS NULL").get()!.total;
  setCache("landing", { totalUsers, totalMeetHours: Math.ceil(totalMinutes / 60), meets: getUpcomingMeets(database, 5) } satisfies LandingCache);
}

export function refreshErrorCache(database: Database) {
  const exists = database.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='error_messages'").get();
  const messages = exists ? database.query<ErrorMessage, []>("SELECT type,title,description FROM error_messages WHERE deleted_at IS NULL").all() : [];
  setCache("errors", new Map(messages.map((message) => [message.title, message])));
}

export function getErrorMessage(title: string): ErrorMessage | undefined {
  return (getCache("errors") as Map<string, ErrorMessage> | undefined)?.get(title);
}

export function getLandingCache(): LandingCache {
  return getCache("landing") as LandingCache ?? { totalUsers: 0, totalMeetHours: 0, meets: [] };
}

export function getCache(key: string) {
  const value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

export function setCache(key: string, value: unknown) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value!);
}
