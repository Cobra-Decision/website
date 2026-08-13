import type { Database } from "bun:sqlite";
import { getUpcomingMeets } from "../modules/events/queries";
import type { MeetWithDetails } from "../modules/events/types";

const limit = 100;
const cache = new Map<string, unknown>();

export type LandingCache = { totalUsers: number; totalMeetHours: number; meets: MeetWithDetails[] };

export function initCache(database: Database) {
  const totalUsers = database.query<{ total: number }, []>("SELECT COUNT(*) total FROM users WHERE deleted_at IS NULL").get()!.total;
  const totalMinutes = database.query<{ total: number }, []>("SELECT COALESCE(SUM(duration_minutes), 0) total FROM meets WHERE deleted_at IS NULL").get()!.total;
  setCache("landing", { totalUsers, totalMeetHours: totalMinutes / 60, meets: getUpcomingMeets(database) } satisfies LandingCache);
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
