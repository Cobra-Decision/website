import type { Database } from "bun:sqlite";
import { createMeet, toggleAttendance } from "../modules/events/queries";

export async function seedSampleData(database: Database) {
  const member = database.query<{ id: number }, []>("SELECT id FROM roles WHERE title = 'member' AND deleted_at IS NULL").get()!;
  const maya = database.query<{ id: number }, []>("SELECT id FROM users WHERE email = 'maya@example.com' AND deleted_at IS NULL").get()
    ?? database.query<{ id: number }, [string, string, string, string, string, number]>("INSERT INTO users (email, username, first_name, last_name, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id")
      .get("maya@example.com", "maya", "Maya", "Chen", await Bun.password.hash("sample-password"), member.id)!;
  const noah = database.query<{ id: number }, []>("SELECT id FROM users WHERE email = 'noah@example.com' AND deleted_at IS NULL").get()
    ?? database.query<{ id: number }, [string, string, string, string, string, number]>("INSERT INTO users (email, username, first_name, last_name, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id")
      .get("noah@example.com", "noah", "Noah", "Patel", await Bun.password.hash("sample-password"), member.id)!;

  for (const title of ["Design", "Engineering", "Community", "Career"]) database.run("INSERT OR IGNORE INTO tags (title) VALUES (?)", [title]);
  const tags = database.query<{ id: number; title: string }, []>("SELECT id, title FROM tags WHERE deleted_at IS NULL").all();
  const tagIds = (names: string[]) => tags.filter((tag) => names.includes(tag.title)).map((tag) => tag.id);
  const samples = [
    { title: "Designing with Bun", topics: ["Bun", "Backend systems"], date: "2099-06-12", time: "18:30", duration: 90, presenter: maya.id, image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80", tags: ["Engineering", "Design"] },
    { title: "The craft of product critique", topics: ["Product design", "Feedback"], date: "2099-06-19", time: "19:00", duration: 75, presenter: noah.id, image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80", tags: ["Design", "Community"] },
    { title: "Open community table", topics: ["Career", "Open discussion"], date: "2099-06-26", time: "18:00", duration: 60, presenter: null, image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80", tags: ["Community", "Career"] },
  ];
  for (const sample of samples) {
    const existing = database.query<{ id: number }, [string]>("SELECT id FROM meets WHERE title = ? AND deleted_at IS NULL").get(sample.title);
    const meet = existing ?? createMeet(database, { title: sample.title, topics: sample.topics, scheduledDate: sample.date, scheduledTime: sample.time, durationMinutes: sample.duration, imageUrl: sample.image, presenterId: sample.presenter, tagIds: tagIds(sample.tags) });
    if (!database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, noah.id)) toggleAttendance(database, meet.id, noah.id);
  }
  database.run("INSERT INTO contact_requests (email) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM contact_requests WHERE email = ?)", ["hello@meetspace.example", "hello@meetspace.example"]);
}
