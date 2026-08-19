import type { Database } from "bun:sqlite";
import { createMeet, toggleAttendance } from "../modules/events/queries";
import { generateId } from "./id";

export async function seedSampleData(database: Database) {
  const roles = Object.fromEntries(
    database.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE deleted_at IS NULL").all().map((role) => [role.title, role.id])
  );

  const ensureUser = async (email: string, username: string, firstName: string, lastName: string, phone = "+989123456789", roleId = roles.member) => {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(email);
    if (existing) return existing;
    const id = generateId();
    database.run(
      "INSERT OR IGNORE INTO users (id, email, username, phone, first_name, last_name, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, email, username, phone, firstName, lastName, await Bun.password.hash("sample-password"), roleId]
    );
    return (
      database.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(email) ??
      database.query<{ id: string }, []>("SELECT id FROM users WHERE deleted_at IS NULL ORDER BY id LIMIT 1").get()!
    );
  };

  const maya = await ensureUser("maya@example.com", "maya", "Maya", "Chen", "+989121112233");
  const noah = await ensureUser("noah@example.com", "noah", "Noah", "Patel", "+14155552671");
  await ensureUser("alex.admin@example.com", "alex-admin", "Alex", "Morgan", "+447911123456", roles.admin);

  // Register all system endpoints
  const endpointsToRegister = [
    "/dashboard",
    "/dashboard/user",
    "/dashboard/user/meets",
    "/dashboard/user/my-meets",
    "/dashboard/account",
    "/dashboard/admin",
    "/dashboard/admin/users",
    "/dashboard/admin/users/bulk-confirm",
    "/dashboard/admin/meets",
    "/dashboard/admin/meets/bulk-confirm",
    "/dashboard/admin/tags",
    "/dashboard/admin/tags/bulk-confirm",
    "/dashboard/admin/roles",
    "/dashboard/admin/roles/bulk-confirm",
    "/dashboard/admin/endpoints",
    "/dashboard/admin/endpoints/bulk-confirm",
    "/dashboard/admin/files",
    "/dashboard/admin/files/upload",
    "/dashboard/admin/files/upload-modal",
    "/dashboard/admin/files/preview-modal",
    "/dashboard/admin/files/rename",
    "/dashboard/admin/files/rename-modal",
    "/dashboard/admin/files/duplicate",
    "/dashboard/admin/files/bulk-confirm",
    "/dashboard/admin/report",
    "/dashboard/admin/mailer",
    "/dashboard/admin/mail-management",
    "/dashboard/admin/mailer/send",
    "/dashboard/admin/mailer/subscribers",
    "/dashboard/admin/mailer/test-modal",
    "/dashboard/admin/mailer/test-send",
    "/dashboard/admin/mail-editor",
    "/dashboard/admin/mail-editor/save",
    "/dashboard/admin/mail-editor/delete",
    "/dashboard/admin/mail-scheduler",
    "/dashboard/admin/mail-scheduler/schedule",
    "/dashboard/admin/mail-scheduler/repeat",
    "/dashboard/admin/mail-scheduler/cancel",
    "/dashboard/admin/mail-scheduler/delete",
  ];

  for (const endpoint of endpointsToRegister) {
    const existing = database.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get(endpoint);
    if (!existing) {
      database.run("INSERT INTO endpoints (id, title, description) VALUES (?, ?, ?)", [
        generateId(),
        endpoint,
        "System endpoint",
      ]);
    }
  }

  // Map permissions for Super Admin and Admin
  const adminRoles = database.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE title IN ('admin', 'Super Admin')").all();
  const allEndpoints = database.query<{ id: string; title: string }, []>("SELECT id, title FROM endpoints").all();

  for (const r of adminRoles) {
    for (const e of allEndpoints) {
      if (r.title === "admin" && e.title === "/dashboard/admin/report") continue;
      database.run(
        "INSERT OR IGNORE INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)",
        [generateId(), r.id, e.id, "Dashboard access"]
      );
    }
  }

  // Member role endpoints
  const memberRole = database.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");
  if (memberRole) {
    const memberEndpoints = ["/dashboard", "/dashboard/user", "/dashboard/user/meets", "/dashboard/user/my-meets", "/dashboard/account"];
    for (const path of memberEndpoints) {
      const ep = database.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get(path);
      if (ep) {
        database.run(
          "INSERT OR IGNORE INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)",
          [generateId(), memberRole.id, ep.id, "Member dashboard access"]
        );
      }
    }
  }

  const defaultPlatforms = [
    { slug: "gmail", name: "Gmail" },
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
      title: "Designing with Bun",
      description: `# Designing with Bun & HTMX

A practical deep-dive into building **blazing fast** server-rendered TypeScript systems.

### Agenda & Key Takeaways:
- **Server Performance**: Leveraging Bun's native SQLite and HTTP server.
- **State Management**: Eliminating heavy client bundles with *HTMX*.
- **Practical Architecture**: Clean code patterns for hypermedia-driven apps.

> "The best code is the code you never have to ship to the browser."

Check our [official documentation](https://bun.sh) before joining.`,
      topics: ["Bun", "Hono", "HTMX", "Architecture"],
      date: "2099-06-12",
      time: "18:30",
      duration: 90,
      presenter: maya.id,
      status: "upcoming" as const,
      accessStatus: "public" as const,
      fileUrl: "/uploads/bun_masterclass_slides.pdf",
      url: "https://meet.example.com/designing-with-bun",
      image: "/placeholder-meet.svg",
      tags: ["Engineering", "Architecture", "TypeScript"],
    },
    {
      title: "The Craft of Product Critique",
      description: `## Collaborative Product Design Session

Practice giving **specific, actionable, and respectful** feedback in an open forum.

### Requirements:
1. Review the attached presentation deck.
2. Bring one user flow from your own product.
3. Be ready for interactive whiteboard analysis.`,
      topics: ["Product design", "Feedback", "Design Systems"],
      date: "2099-06-19",
      time: "19:00",
      duration: 75,
      presenter: noah.id,
      status: "upcoming" as const,
      accessStatus: "private" as const,
      fileUrl: "/uploads/product_critique_deck.pdf",
      url: "https://meet.example.com/product-critique",
      image: "/placeholder-meet.svg",
      tags: ["Design", "Community"],
    },
    {
      title: "Open Community Table & DevOps",
      description: `### میز گفتگوی جامعه کاربری و دوآپس
یک گفتگوی آزاد و صمیمی درباره تجربیات عملیاتی، چالش‌های معماری سرور و مسیر شغلی مهندسی نرم‌افزار.

- بررسی تجربیات و رخدادهای واقعی در پروداکشن
- نکات کلیدی در پیاده‌سازی خطوط اتوماسیون CI/CD
- پرسش و پاسخ آزاد پیرامون زیرساخت‌های مقیاس‌پذیر

\`\`\`bash
# Example quick deployment check
curl -sSL https://api.example.com/health | jq .status
\`\`\`

### Production Checklist:
1. Ensure all database migrations run with transactional safety.
2. Verify TLS certificate expiration and HTTP/2 connectivity.
3. Review structured logs on [OpenTelemetry Dashboard](https://opentelemetry.io).

> گفتگوی آزاد برای تمامی علاقه‌مندان به مباحث مدرن مهندسی نرم‌افزار باز است.`,
      topics: ["Career", "DevOps", "Open discussion"],
      date: "2099-06-26",
      time: "18:00",
      duration: 60,
      presenter: null,
      status: "completed" as const,
      accessStatus: "public" as const,
      fileUrl: null,
      url: "https://meet.example.com/community-table",
      image: "/placeholder-meet.svg",
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
        fileUrl: sample.fileUrl,
        status: sample.status,
        accessStatus: sample.accessStatus,
        imageUrl: sample.image,
        presenterId: sample.presenter,
        tagIds: tagIds(sample.tags),
      });
    database.run(
      "UPDATE meets SET description=?, meet_url=?, file_url=?, status=?, access_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [sample.description, sample.url, sample.fileUrl, sample.status, sample.accessStatus, meet.id]
    );
    for (const tagId of tagIds(sample.tags)) {
      database.run("INSERT OR IGNORE INTO meet_tags (meet_id, tag_id) VALUES (?, ?)", [meet.id, tagId]);
    }
    if (!database.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, noah.id)) {
      toggleAttendance(database, meet.id, noah.id);
    }
  }

  // Seed sample user preferred tags
  const sampleUserTags = [
    { userId: maya.id, tags: ["Engineering", "TypeScript", "Architecture"] },
    { userId: noah.id, tags: ["Design", "Community", "Career"] },
  ];
  for (const userPref of sampleUserTags) {
    for (const tagId of tagIds(userPref.tags)) {
      database.run("INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)", [userPref.userId, tagId]);
    }
  }

  const existingContact = database.query<{ id: string }, [string]>("SELECT id FROM contact_requests WHERE email = ?").get("hello@meetspace.example");
  if (!existingContact) {
    database.run("INSERT INTO contact_requests (id, email) VALUES (?, ?)", [generateId(), "hello@meetspace.example"]);
  }
}
