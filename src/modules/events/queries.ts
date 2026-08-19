import type { Database } from "bun:sqlite";
import type { CreateMeetInput, Meet, MeetWithDetails, Tag, UserSummary } from "./types";
import { toUtcIso } from "./datetime";
import { refreshLandingCache } from "../../lib/cache";
import { generateId } from "../../lib/id";

export function createMeet(database: Database, data: CreateMeetInput): Meet {
  const id = data.id ?? generateId();
  const insert = database.query(`INSERT INTO meets (id, title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, meet_url, file_url, image_url, status, access_status, presenter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`);
  const meet = database.transaction(() => {
    const row = insert.get(
      id,
      data.title,
      data.description ?? "",
      JSON.stringify(data.topics),
      toUtcIso(data.scheduledDate, data.scheduledTime),
      data.scheduledDate,
      data.scheduledTime,
      data.durationMinutes ?? 60,
      data.meetUrl ?? null,
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
  userId?: string;
  attendedOnly?: boolean;
}): MeetWithDetails[] {
  let sql = `SELECT DISTINCT m.* FROM meets m WHERE m.deleted_at IS NULL`;
  const args: any[] = [];

  if (params.attendedOnly && params.userId) {
    sql += ` AND EXISTS (SELECT 1 FROM meet_attendees ma WHERE ma.meet_id = m.id AND ma.user_id = ?)`;
    args.push(params.userId);
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

function parseTopics(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function hydrateMeets(database: Database, meets: Meet[]): MeetWithDetails[] {
  const attendees = database.query<{ user_id: string }, [string]>("SELECT user_id FROM meet_attendees WHERE meet_id = ?");
  const tags = database.query<Tag, [string]>(`SELECT t.* FROM tags t JOIN meet_tags mt ON mt.tag_id = t.id
    WHERE mt.meet_id = ? AND t.deleted_at IS NULL ORDER BY t.title`);
  const presenter = database.query<UserSummary, [string]>(`SELECT id, email, username, first_name, last_name FROM users
    WHERE id = ? AND deleted_at IS NULL`);

  return meets.map((meet) => {
    const attendeeIds = attendees.all(meet.id).map(({ user_id }) => user_id);
    return {
      ...meet,
      status: meet.status ?? "upcoming",
      access_status: meet.access_status ?? "public",
      file_url: meet.file_url ?? null,
      topics: parseTopics(meet.topics),
      presenter: meet.presenter_id === null ? null : presenter.get(meet.presenter_id) ?? null,
      attendee_count: attendeeIds.length,
      attendee_ids: attendeeIds,
      tags: tags.all(meet.id),
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

export function recordMeetVisit(database: Database, meetId: string, platformSlug?: string) {
  try {
    let platformId: string | null = null;
    if (platformSlug) {
      const row = database.query<{ id: string }, [string]>("SELECT id FROM platforms WHERE slug = ? AND deleted_at IS NULL").get(platformSlug);
      if (row) platformId = row.id;
    }
    database.run("INSERT INTO meet_visits (id, meet_id, platform_id) VALUES (?, ?, ?)", [generateId(), meetId, platformId]);
  } catch (error) {
    console.error("Failed to record meet visit:", error);
  }
}
