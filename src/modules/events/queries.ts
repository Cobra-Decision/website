import type { Database } from "bun:sqlite";
import type { CreateMeetInput, Meet, MeetWithDetails, Tag, UserSummary } from "./types";
import { toUtcIso } from "./datetime";
import { refreshLandingCache } from "../../lib/cache";
import { generateId } from "../../lib/id";

export function createMeet(database: Database, data: CreateMeetInput): Meet {
  const id = data.id ?? generateId();
  const normalizedTopics = normalizeTopics(data.topics);
  const insert = database.query(`INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, meet_url, video_url, file_url, image_url, status, access_status, presenter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`);
  const meet = database.transaction(() => {
    const row = insert.get(
      id,
      data.title,
      data.description ?? "",
      JSON.stringify(normalizedTopics),
      toUtcIso(data.scheduledDate, data.scheduledTime),
      data.scheduledDate,
      data.scheduledTime,
      data.durationMinutes ?? 60,
      data.meetUrl ?? null,
      data.videoUrl ?? null,
      data.fileUrl ?? null,
      data.imageUrl ?? null,
      data.status ?? "upcoming",
      data.accessStatus ?? "public",
      data.presenterId ?? null
    ) as Meet;
    const map = database.query("INSERT INTO meet_tags (meet_id, tag_id) VALUES (?, ?)");
    for (const tagId of data.tagIds) map.run(row.id, tagId);
    return row;
  })();
  refreshLandingCache(database);
  return meet;
}

export function toggleAttendance(database: Database, meetId: string, userId: string): boolean {
  const exists = database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meetId, userId);
  if (exists) {
    database.run("DELETE FROM meet_attendees WHERE meet_id = ? AND user_id = ?", [meetId, userId]);
    refreshLandingCache(database);
    return false;
  }
  database.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES (?, ?)", [meetId, userId]);
  refreshLandingCache(database);
  return true;
}

export function attendMeet(database: Database, meetId: string, userId: string): boolean {
  const exists = database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meetId, userId);
  if (!exists) {
    database.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES (?, ?)", [meetId, userId]);
    refreshLandingCache(database);
  }
  return true;
}

export function leaveMeet(database: Database, meetId: string, userId: string): boolean {
  database.run("DELETE FROM meet_attendees WHERE meet_id = ? AND user_id = ?", [meetId, userId]);
  refreshLandingCache(database);
  return false;
}

export function getUpcomingMeets(database: Database, limit = 5): MeetWithDetails[] {
  const meets = database.query<Meet, []>(`SELECT * FROM meets
    WHERE deleted_at IS NULL
    ORDER BY scheduled_date DESC, scheduled_time DESC
    LIMIT ${limit}`).all();
  return hydrateMeets(database, meets);
}

export function getMeetById(database: Database, id: string): MeetWithDetails | null {
  const meet = database.query<Meet, [string]>("SELECT * FROM meets WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!meet) return null;
  return hydrateMeets(database, [meet])[0] ?? null;
}

export function filterMeets(database: Database, params: {
  q?: string;
  tagId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  userId?: string;
  attendedOnly?: boolean;
}): MeetWithDetails[] {
  let sql = `SELECT DISTINCT m.* FROM meets m WHERE m.deleted_at IS NULL`;
  const args: any[] = [];

  if (params.attendedOnly && params.userId) {
    sql += ` AND EXISTS (SELECT 1 FROM meet_attendees ma WHERE ma.meet_id = m.id AND ma.user_id = ?)`;
    args.push(params.userId);
  }

  if (params.status) {
    sql += ` AND m.status = ?`;
    args.push(params.status);
  }

  if (params.tagId) {
    sql += ` AND EXISTS (SELECT 1 FROM meet_tags mt WHERE mt.meet_id = m.id AND mt.tag_id = ?)`;
    args.push(params.tagId);
  }

  if (params.startDate) {
    sql += ` AND m.scheduled_date >= ?`;
    args.push(params.startDate);
  }

  if (params.endDate) {
    sql += ` AND m.scheduled_date <= ?`;
    args.push(params.endDate);
  }

  if (params.q?.trim()) {
    sql += ` AND (m.title LIKE ? OR m.description LIKE ? OR m.topics LIKE ?)`;
    const query = `%${params.q.trim()}%`;
    args.push(query, query, query);
  }

  sql += ` ORDER BY m.scheduled_date DESC, m.scheduled_time DESC`;
  const meets = database.query<Meet, any[]>(sql).all(...args);
  return hydrateMeets(database, meets);
}

export function normalizeTopics(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).replace(/[\[\]'"]/g, "").trim()).filter(Boolean);
  }
  const str = String(raw).trim();
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).replace(/[\[\]'"]/g, "").trim()).filter(Boolean);
    }
  } catch {}
  return str
    .replace(/[\[\]'"]/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseTopics(raw: string | null | undefined): string[] {
  return normalizeTopics(raw);
}

function hydrateMeets(database: Database, meets: Meet[]): MeetWithDetails[] {
  if (!meets.length) return [];

  const meetIds = meets.map((m) => m.id);
  const placeholders = meetIds.map(() => "?").join(",");

  const attendeesRows = database
    .query<{ meet_id: string; user_id: string }, string[]>(
      `SELECT meet_id, user_id FROM meet_attendees WHERE meet_id IN (${placeholders})`
    )
    .all(...meetIds);

  const attendeesByMeet = new Map<string, string[]>();
  for (const row of attendeesRows) {
    let list = attendeesByMeet.get(row.meet_id);
    if (!list) {
      list = [];
      attendeesByMeet.set(row.meet_id, list);
    }
    list.push(row.user_id);
  }

  const tagsRows = database
    .query<Tag & { meet_id: string }, string[]>(
      `SELECT t.*, mt.meet_id FROM tags t
       JOIN meet_tags mt ON mt.tag_id = t.id
       WHERE mt.meet_id IN (${placeholders}) AND t.deleted_at IS NULL
       ORDER BY t.title ASC`
    )
    .all(...meetIds);

  const tagsByMeet = new Map<string, Tag[]>();
  for (const row of tagsRows) {
    const { meet_id, ...tag } = row;
    let list = tagsByMeet.get(meet_id);
    if (!list) {
      list = [];
      tagsByMeet.set(meet_id, list);
    }
    list.push(tag as Tag);
  }

  const presenterIds = Array.from(new Set(meets.map((m) => m.presenter_id).filter(Boolean))) as string[];
  const presenterMap = new Map<string, UserSummary>();
  if (presenterIds.length > 0) {
    const presenterPlaceholders = presenterIds.map(() => "?").join(",");
    const presenters = database
      .query<UserSummary, string[]>(
        `SELECT id, email, username, first_name, last_name FROM users
         WHERE id IN (${presenterPlaceholders}) AND deleted_at IS NULL`
      )
      .all(...presenterIds);
    for (const p of presenters) {
      presenterMap.set(p.id, p);
    }
  }

  return meets.map((meet) => {
    const attendeeIds = attendeesByMeet.get(meet.id) ?? [];
    return {
      ...meet,
      status: meet.status ?? "upcoming",
      access_status: meet.access_status ?? "public",
      file_url: meet.file_url ?? null,
      video_url: meet.video_url ?? null,
      topics: parseTopics(meet.topics),
      presenter: meet.presenter_id ? presenterMap.get(meet.presenter_id) ?? null : null,
      attendee_count: attendeeIds.length,
      attendee_ids: attendeeIds,
      tags: tagsByMeet.get(meet.id) ?? [],
    };
  });
}

export function getAllTags(database: Database): Tag[] {
  return database.query<Tag, []>("SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY title ASC").all();
}

export function getUserPreferredTags(database: Database, userId: string): Tag[] {
  return database.query<Tag, [string]>(`
    SELECT t.* FROM tags t
    JOIN user_tags ut ON ut.tag_id = t.id
    WHERE ut.user_id = ? AND t.deleted_at IS NULL
    ORDER BY t.title ASC
  `).all(userId);
}

export function setUserPreferredTags(database: Database, userId: string, tagIds: string[]): void {
  database.transaction(() => {
    database.run("DELETE FROM user_tags WHERE user_id = ?", [userId]);
    const insert = database.query("INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)");
    for (const tagId of tagIds) {
      if (tagId && tagId.trim()) {
        insert.run(userId, tagId.trim());
      }
    }
  })();
}

// In-memory cooldown cache: key = `${meetId}:${platformId ?? 'none'}:${visitorKey ?? 'ip'}` -> timestamp
export const visitCooldowns = new Map<string, number>();
export const VISIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function recordMeetVisit(database: Database, meetId: string, platformSlug?: string, visitorKey?: string) {
  try {
    let platformId: string | null = null;
    if (platformSlug) {
      const row = database.query<{ id: string }, [string]>("SELECT id FROM platforms WHERE slug = ? AND deleted_at IS NULL").get(platformSlug);
      if (row) platformId = row.id;
    }

    const now = Date.now();
    const cacheKey = `${meetId}:${platformId ?? "none"}:${visitorKey || "anonymous"}`;
    const lastVisit = visitCooldowns.get(cacheKey);

    if (lastVisit && now - lastVisit < VISIT_COOLDOWN_MS) {
      return;
    }
    visitCooldowns.set(cacheKey, now);

    // ponytail: in-memory map bound by periodic sweep
    if (visitCooldowns.size > 10000) {
      for (const [k, time] of visitCooldowns) {
        if (now - time > VISIT_COOLDOWN_MS) visitCooldowns.delete(k);
      }
    }

    database.run(
      "INSERT INTO meet_visits (id, meet_id, platform_id, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
      [generateId(), meetId, platformId]
    );
  } catch (error) {
    console.error("Failed to record meet visit:", error);
  }
}
