import type { Database } from "bun:sqlite";
import { createMeet, toggleAttendance } from "../modules/events/queries";
import { generateId } from "./id";

export async function seedSampleData(database: Database) {
  const roles = Object.fromEntries(
    database.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE deleted_at IS NULL").all().map((role) => [role.title, role.id])
  );

  const ensureUser = async (email: string, username: string, firstName: string, lastName: string, roleId = roles.member) => {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(email);
    if (existing) return existing;
    const id = generateId();
    database.run(
      "INSERT OR IGNORE INTO users (id, email, username, first_name, last_name, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, email, username, firstName, lastName, await Bun.password.hash("sample-password"), roleId]
    );
    return (
      database.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(email) ??
      database.query<{ id: string }, []>("SELECT id FROM users WHERE deleted_at IS NULL ORDER BY id LIMIT 1").get()!
    );
  };

  const maya = await ensureUser("maya@example.com", "maya", "Maya", "Chen");
  const noah = await ensureUser("noah@example.com", "noah", "Noah", "Patel");
  await ensureUser("alex.admin@example.com", "alex-admin", "Alex", "Morgan", roles.admin);

  const defaultPlatforms = [
    { slug: "telegram", name: "Telegram" },
    { slug: "youtube", name: "YouTube" },
    { slug: "linkedin", name: "LinkedIn" },
    { slug: "github", name: "GitHub" },
    { slug: "instagram", name: "Instagram" },
    { slug: "reddit", name: "Reddit" },
    { slug: "mastodon", name: "Mastodon" },
    { slug: "deltachat", name: "Delta Chat" },
  ];
  for (const platform of defaultPlatforms) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM platforms WHERE slug = ?").get(platform.slug);
    if (!existing) {
      database.run("INSERT INTO platforms (id, slug, name) VALUES (?, ?, ?)", [generateId(), platform.slug, platform.name]);
    }
  }

  const sampleTags = {
    TypeScript: "TypeScript language, compiler, and typed ecosystem",
    DevOps: "Infrastructure, CI/CD pipelines, and cloud systems",
    Architecture: "System architecture, monolithic design, and scalability",
    AI: "Machine learning, AI models, and automated engineering",
    Design: "Product and visual design",
    Engineering: "Software architecture and implementation",
    Community: "Community building and collaboration",
    Career: "Professional growth and mentorship",
  };
  for (const [title, description] of Object.entries(sampleTags)) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM tags WHERE title = ?").get(title);
    if (!existing) {
      database.run("INSERT INTO tags (id, title, description) VALUES (?, ?, ?)", [generateId(), title, description]);
    } else {
      database.run("UPDATE tags SET description=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL", [description, existing.id]);
    }
  }

  for (const message of [
    ["success", "admin.created", "Record saved successfully."],
    ["success", "admin.deleted", "Record deleted successfully."],
    ["error", "admin.error", "The action could not be completed."],
    ["error", "admin.invalid_relation", "Choose a valid related record."],
    ["warning", "admin.nothing_selected", "Select at least one record."],
    ["info", "admin.no_changes", "No changes were needed."],
  ]) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM error_messages WHERE title = ?").get(message[1]);
    if (!existing) {
      database.run("INSERT INTO error_messages (id, type, title, description) VALUES (?, ?, ?, ?)", [generateId(), message[0], message[1], message[2]]);
    }
  }

  const tags = database.query<{ id: string; title: string }, []>("SELECT id, title FROM tags WHERE deleted_at IS NULL").all();
  const tagIds = (names: string[]) => tags.filter((tag) => names.includes(tag.title)).map((tag) => tag.id);

  const samples = [
    {
      title: "Designing with Bun & Hono",
      description: "A practical deep-dive into building blazing fast server-rendered TypeScript systems with HTMX.",
      topics: ["Bun", "Hono", "HTMX", "Architecture"],
      date: "2099-06-12",
      time: "18:30",
      duration: 90,
      presenter: maya.id,
      url: "https://meet.example.com/designing-with-bun",
      image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80",
      tags: ["Engineering", "Architecture", "TypeScript"],
    },
    {
      title: "The Craft of Product Critique",
      description: "Practice giving specific, useful, and respectful product feedback in an open collaborative forum.",
      topics: ["Product design", "Feedback", "Design Systems"],
      date: "2099-06-19",
      time: "19:00",
      duration: 75,
      presenter: noah.id,
      url: "https://meet.example.com/product-critique",
      image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80",
      tags: ["Design", "Community"],
    },
    {
      title: "Open Community Table & DevOps",
      description: "An open conversation about production operations, developer careers, and engineering challenges.",
      topics: ["Career", "DevOps", "Open discussion"],
      date: "2099-06-26",
      time: "18:00",
      duration: 60,
      presenter: null,
      url: "https://meet.example.com/community-table",
      image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
      tags: ["Community", "DevOps", "Career"],
    },
  ];

  for (const sample of samples) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM meets WHERE title = ? AND deleted_at IS NULL").get(sample.title);
    const meet =
      existing ??
      createMeet(database, {
        title: sample.title,
        description: sample.description,
        topics: sample.topics,
        scheduledDate: sample.date,
        scheduledTime: sample.time,
        durationMinutes: sample.duration,
        meetUrl: sample.url,
        imageUrl: sample.image,
        presenterId: sample.presenter,
        tagIds: tagIds(sample.tags),
      });
    database.run("UPDATE meets SET description=?, meet_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [sample.description, sample.url, meet.id]);
    for (const tagId of tagIds(sample.tags)) {
      database.run("INSERT OR IGNORE INTO meet_tags (meet_id, tag_id) VALUES (?, ?)", [meet.id, tagId]);
    }
    if (!database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, noah.id)) {
      toggleAttendance(database, meet.id, noah.id);
    }
  }

  const existingContact = database.query<{ id: string }, [string]>("SELECT id FROM contact_requests WHERE email = ?").get("hello@meetspace.example");
  if (!existingContact) {
    database.run("INSERT INTO contact_requests (id, email) VALUES (?, ?)", [generateId(), "hello@meetspace.example"]);
  }
}
