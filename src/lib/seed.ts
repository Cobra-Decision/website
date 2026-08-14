import type { Database } from "bun:sqlite";
import { createMeet, toggleAttendance } from "../modules/events/queries";

export async function seedSampleData(database: Database) {
  const roles = Object.fromEntries(database.query<{ id: number; title: string }, []>("SELECT id,title FROM roles WHERE deleted_at IS NULL").all().map((role) => [role.title, role.id]));
  const ensureUser = async (email: string, username: string, firstName: string, lastName: string, roleId = roles.member) => {
    const existing = database.query<{ id: number }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(email);
    if (existing) return existing;
    database.run("INSERT OR IGNORE INTO users (email, username, first_name, last_name, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?)", [email, username, firstName, lastName, await Bun.password.hash("sample-password"), roleId]);
    return database.query<{ id: number }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(email)
      ?? database.query<{ id: number }, []>("SELECT id FROM users WHERE deleted_at IS NULL ORDER BY id LIMIT 1").get()!;
  };
  const maya = await ensureUser("maya@example.com", "maya", "Maya", "Chen");
  const noah = await ensureUser("noah@example.com", "noah", "Noah", "Patel");
  await ensureUser("alex.admin@example.com", "alex-admin", "Alex", "Morgan", roles.admin);

  const sampleTags = { Design: "Product and visual design", Engineering: "Software architecture and implementation", Community: "Community building and collaboration", Career: "Professional growth and mentorship" };
  for (const [title, description] of Object.entries(sampleTags)) {
    database.run("INSERT OR IGNORE INTO tags (title,description) VALUES (?,?)", [title, description]);
    database.run("UPDATE tags SET description=?,updated_at=CURRENT_TIMESTAMP WHERE title=? AND deleted_at IS NULL", [description, title]);
  }
  for (const message of [
    ["success", "admin.created", "Record saved successfully."], ["success", "admin.deleted", "Record deleted successfully."],
    ["error", "admin.error", "The action could not be completed."], ["error", "admin.invalid_relation", "Choose a valid related record."],
    ["warning", "admin.nothing_selected", "Select at least one record."], ["info", "admin.no_changes", "No changes were needed."],
  ]) database.run("INSERT OR IGNORE INTO error_messages (type,title,description) VALUES (?,?,?)", message);
  const tags = database.query<{ id: number; title: string }, []>("SELECT id, title FROM tags WHERE deleted_at IS NULL").all();
  const tagIds = (names: string[]) => tags.filter((tag) => names.includes(tag.title)).map((tag) => tag.id);
  const samples = [
    { title: "Designing with Bun", description: "A practical discussion about fast TypeScript backend systems.", topics: ["Bun", "Backend systems"], date: "2099-06-12", time: "18:30", duration: 90, presenter: maya.id, url: "https://meet.example.com/designing-with-bun", image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80", tags: ["Engineering", "Design"] },
    { title: "The craft of product critique", description: "Practice giving specific, useful, and respectful product feedback.", topics: ["Product design", "Feedback"], date: "2099-06-19", time: "19:00", duration: 75, presenter: noah.id, url: "https://meet.example.com/product-critique", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80", tags: ["Design", "Community"] },
    { title: "Open community table", description: "An open conversation about careers, collaboration, and current challenges.", topics: ["Career", "Open discussion"], date: "2099-06-26", time: "18:00", duration: 60, presenter: null, url: "https://meet.example.com/community-table", image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80", tags: ["Community", "Career"] },
  ];
  for (const sample of samples) {
    const existing = database.query<{ id: number }, [string]>("SELECT id FROM meets WHERE title = ? AND deleted_at IS NULL").get(sample.title);
    const meet = existing ?? createMeet(database, { title: sample.title, description: sample.description, topics: sample.topics, scheduledDate: sample.date, scheduledTime: sample.time, durationMinutes: sample.duration, meetUrl: sample.url, imageUrl: sample.image, presenterId: sample.presenter, tagIds: tagIds(sample.tags) });
    database.run("UPDATE meets SET description=?,meet_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [sample.description, sample.url, meet.id]);
    for (const tagId of tagIds(sample.tags)) database.run("INSERT OR IGNORE INTO meet_tags (meet_id,tag_id) VALUES (?,?)", [meet.id, tagId]);
    if (!database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, noah.id)) toggleAttendance(database, meet.id, noah.id);
  }
  database.run("INSERT INTO contact_requests (email) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM contact_requests WHERE email = ?)", ["hello@meetspace.example", "hello@meetspace.example"]);
}
