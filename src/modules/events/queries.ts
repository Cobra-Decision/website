import type { Database } from "bun:sqlite";
import type { CreateMeetInput, Meet, MeetWithDetails, Tag, UserSummary } from "./types";
import { toUtcIso } from "./datetime";
import { refreshLandingCache } from "../../lib/cache";

export function createMeet(database: Database, data: CreateMeetInput): Meet {
  const insert = database.query(`INSERT INTO meets (title, description, topics, scheduled_at_utc, scheduled_date, scheduled_time, duration_minutes, meet_url, image_url, presenter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`);
  const meet = database.transaction(() => {
    const row = insert.get(data.title, data.description ?? "", JSON.stringify(data.topics), toUtcIso(data.scheduledDate, data.scheduledTime), data.scheduledDate, data.scheduledTime,
      data.durationMinutes ?? 60, data.meetUrl ?? null, data.imageUrl ?? null, data.presenterId ?? null) as Meet;
    const map = database.query("INSERT INTO meet_tags (meet_id, tag_id) VALUES (?, ?)");
    for (const tagId of data.tagIds) map.run(row.id, tagId);
    return row;
  })();
  refreshLandingCache(database);
  return meet;
}

export function toggleAttendance(database: Database, meetId: number, userId: number) {
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

export function getUpcomingMeets(database: Database): MeetWithDetails[] {
  const meets = database.query<Meet, []>(`SELECT * FROM meets
    WHERE deleted_at IS NULL AND scheduled_date >= DATE('now')
    ORDER BY scheduled_date, scheduled_time`).all();
  const attendees = database.query<{ user_id: number }, [number]>("SELECT user_id FROM meet_attendees WHERE meet_id = ?");
  const tags = database.query<Tag, [number]>(`SELECT t.* FROM tags t JOIN meet_tags mt ON mt.tag_id = t.id
    WHERE mt.meet_id = ? AND t.deleted_at IS NULL ORDER BY t.title`);
  const presenter = database.query<UserSummary, [number]>(`SELECT id, email, username, first_name, last_name FROM users
    WHERE id = ? AND deleted_at IS NULL`);
  return meets.map((meet) => {
    const attendeeIds = attendees.all(meet.id).map(({ user_id }) => user_id);
    return {
      ...meet,
      topics: JSON.parse(meet.topics ?? "[]") as string[],
      presenter: meet.presenter_id === null ? null : presenter.get(meet.presenter_id) ?? null,
      attendee_count: attendeeIds.length,
      attendee_ids: attendeeIds,
      tags: tags.all(meet.id),
    };
  });
}
