import type { Database } from "bun:sqlite";
import { generateId } from "../id";
import { createMeet, toggleAttendance } from "../../modules/events/queries";
import { refreshLandingCache } from "../cache";

export interface SeedReportItem {
  feature: string;
  table: string;
  created: number;
  updated: number;
  skipped: number;
}

export type SeedReport = Record<string, SeedReportItem[]>;

// Helper to record seed change
function addReport(report: SeedReport, feature: string, table: string, created = 0, updated = 0, skipped = 0) {
  if (!report[feature]) report[feature] = [];
  const existing = report[feature].find((r) => r.table === table);
  if (existing) {
    existing.created += created;
    existing.updated += updated;
    existing.skipped += skipped;
  } else {
    report[feature].push({ feature, table, created, updated, skipped });
  }
}

export async function seedRoles(db: Database, report: SeedReport = {}): Promise<SeedReport> {
  const roles = [
    { title: "member", description: "Default user role" },
    { title: "admin", description: "Administrator" },
    { title: "Super Admin", description: "Full administrative access" },
  ];

  for (const role of roles) {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get(role.title);
    if (!existing) {
      db.run("INSERT INTO roles (id, title, description) VALUES (?, ?, ?)", [generateId(), role.title, role.description]);
      addReport(report, "roles", "roles", 1, 0, 0);
    } else {
      addReport(report, "roles", "roles", 0, 0, 1);
    }
  }
  return report;
}

export async function seedEndpoints(db: Database, report: SeedReport = {}): Promise<SeedReport> {
  // Ensure roles exist first
  await seedRoles(db, report);

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
    "/dashboard/admin/database",
    "/dashboard/admin/database/export",
    "/dashboard/admin/database/import",
    "/dashboard/admin/database/backup-now",
    "/dashboard/admin/database/migrate",
  ];

  for (const endpoint of endpointsToRegister) {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get(endpoint);
    if (!existing) {
      db.run("INSERT INTO endpoints (id, title, description) VALUES (?, ?, ?)", [generateId(), endpoint, "System endpoint"]);
      addReport(report, "endpoints", "endpoints", 1, 0, 0);
    } else {
      addReport(report, "endpoints", "endpoints", 0, 0, 1);
    }
  }

  // Bind role endpoints
  const adminRoles = db.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE title IN ('admin', 'Super Admin')").all();
  const allEndpoints = db.query<{ id: string; title: string }, []>("SELECT id, title FROM endpoints").all();

  for (const r of adminRoles) {
    for (const e of allEndpoints) {
      if (r.title === "admin" && e.title === "/dashboard/admin/report") continue;
      const existing = db.query<{ id: string }, [string, string]>("SELECT id FROM role_endpoints WHERE role_id = ? AND endpoint_id = ?").get(r.id, e.id);
      if (!existing) {
        db.run(
          "INSERT OR IGNORE INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)",
          [generateId(), r.id, e.id, "Dashboard access"]
        );
        addReport(report, "endpoints", "role_endpoints", 1, 0, 0);
      } else {
        addReport(report, "endpoints", "role_endpoints", 0, 0, 1);
      }
    }
  }

  const memberRole = db.query<{ id: string }, [string]>("SELECT id FROM roles WHERE title = ?").get("member");
  if (memberRole) {
    const memberEndpoints = ["/dashboard", "/dashboard/user", "/dashboard/user/meets", "/dashboard/user/my-meets", "/dashboard/account"];
    for (const path of memberEndpoints) {
      const ep = db.query<{ id: string }, [string]>("SELECT id FROM endpoints WHERE title = ?").get(path);
      if (ep) {
        const existing = db.query<{ id: string }, [string, string]>("SELECT id FROM role_endpoints WHERE role_id = ? AND endpoint_id = ?").get(memberRole.id, ep.id);
        if (!existing) {
          db.run(
            "INSERT OR IGNORE INTO role_endpoints (id, role_id, endpoint_id, description) VALUES (?, ?, ?, ?)",
            [generateId(), memberRole.id, ep.id, "Member dashboard access"]
          );
          addReport(report, "endpoints", "role_endpoints", 1, 0, 0);
        } else {
          addReport(report, "endpoints", "role_endpoints", 0, 0, 1);
        }
      }
    }
  }

  // Error messages
  for (const message of [
    ["success", "admin.created", "Record saved successfully."],
    ["success", "admin.deleted", "Record deleted successfully."],
    ["error", "admin.error", "The action could not be completed."],
    ["error", "admin.invalid_relation", "Choose a valid related record."],
    ["warning", "admin.nothing_selected", "Select at least one record."],
    ["info", "admin.no_changes", "No changes were needed."],
  ]) {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM error_messages WHERE title = ?").get(message[1]);
    if (!existing) {
      db.run("INSERT INTO error_messages (id, type, title, description) VALUES (?, ?, ?, ?)", [generateId(), message[0], message[1], message[2]]);
      addReport(report, "endpoints", "error_messages", 1, 0, 0);
    } else {
      addReport(report, "endpoints", "error_messages", 0, 0, 1);
    }
  }

  return report;
}

export async function seedTags(db: Database, report: SeedReport = {}): Promise<SeedReport> {
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
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM tags WHERE title = ?").get(title);
    if (!existing) {
      db.run("INSERT INTO tags (id, title, description) VALUES (?, ?, ?)", [generateId(), title, description]);
      addReport(report, "tags", "tags", 1, 0, 0);
    } else {
      db.run("UPDATE tags SET description=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL", [description, existing.id]);
      addReport(report, "tags", "tags", 0, 1, 0);
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
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM platforms WHERE slug = ?").get(platform.slug);
    if (!existing) {
      db.run("INSERT INTO platforms (id, slug, name) VALUES (?, ?, ?)", [generateId(), platform.slug, platform.name]);
      addReport(report, "tags", "platforms", 1, 0, 0);
    } else {
      addReport(report, "tags", "platforms", 0, 0, 1);
    }
  }

  return report;
}

export async function seedUsers(db: Database, report: SeedReport = {}): Promise<SeedReport> {
  // Ensure roles exist
  await seedRoles(db, report);
  const roles = Object.fromEntries(
    db.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE deleted_at IS NULL").all().map((role) => [role.title, role.id])
  );

  const sampleUsers = [
    { email: "maya@example.com", username: "maya", firstName: "Maya", lastName: "Chen", phone: "+989121112233", roleId: roles.member },
    { email: "noah@example.com", username: "noah", firstName: "Noah", lastName: "Patel", phone: "+14155552671", roleId: roles.member },
    { email: "alex.admin@example.com", username: "alex-admin", firstName: "Alex", lastName: "Morgan", phone: "+447911123456", roleId: roles.admin },
  ];

  for (const user of sampleUsers) {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(user.email);
    if (!existing) {
      const id = generateId();
      db.run(
        "INSERT OR IGNORE INTO users (id, email, username, phone, first_name, last_name, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, user.email, user.username, user.phone, user.firstName, user.lastName, await Bun.password.hash("sample-password"), user.roleId]
      );
      addReport(report, "users", "users", 1, 0, 0);
    } else {
      addReport(report, "users", "users", 0, 0, 1);
    }
  }

  // Check admin env seed
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    const adminEmail = process.env.SEED_ADMIN_EMAIL.trim().toLowerCase();
    const superAdminRole = roles["Super Admin"] ?? roles.admin;
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL").get(adminEmail);
    if (!existing) {
      db.run(
        "INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
        [generateId(), adminEmail, await Bun.password.hash(process.env.SEED_ADMIN_PASSWORD), superAdminRole]
      );
      addReport(report, "users", "users (admin-env)", 1, 0, 0);
    } else {
      db.run("UPDATE users SET role_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [superAdminRole, existing.id]);
      addReport(report, "users", "users (admin-env)", 0, 1, 0);
    }
  }

  return report;
}

export async function seedMeets(db: Database, report: SeedReport = {}): Promise<SeedReport> {
  // Prerequisite: users and tags
  await seedUsers(db, report);
  await seedTags(db, report);

  const maya = db.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ?").get("maya@example.com");
  const noah = db.query<{ id: string }, [string]>("SELECT id FROM users WHERE email = ?").get("noah@example.com");

  const tags = db.query<{ id: string; title: string }, []>("SELECT id, title FROM tags WHERE deleted_at IS NULL").all();
  const tagIds = (names: string[]) => tags.filter((tag) => names.includes(tag.title)).map((tag) => tag.id);

  const samples = [
    {
      title: "Designing with Bun",
      description: `# Designing with Bun & HTMX\n\nA practical deep-dive into building **blazing fast** server-rendered TypeScript systems.`,
      topics: ["Bun", "Hono", "HTMX", "Architecture"],
      date: "2099-06-12",
      time: "18:30",
      duration: 90,
      presenter: maya?.id ?? null,
      status: "upcoming" as const,
      accessStatus: "public" as const,
      fileUrl: "/uploads/bun_masterclass_slides.pdf",
      url: "https://meet.example.com/designing-with-bun",
      image: "/placeholder-meet.svg",
      tags: ["Engineering", "Architecture", "TypeScript"],
    },
    {
      title: "The Craft of Product Critique",
      description: `## Collaborative Product Design Session\n\nPractice giving **specific, actionable, and respectful** feedback.`,
      topics: ["Product design", "Feedback", "Design Systems"],
      date: "2099-06-19",
      time: "19:00",
      duration: 75,
      presenter: noah?.id ?? null,
      status: "upcoming" as const,
      accessStatus: "private" as const,
      fileUrl: "/uploads/product_critique_deck.pdf",
      url: "https://meet.example.com/product-critique",
      image: "/placeholder-meet.svg",
      tags: ["Design", "Community"],
    },
    {
      title: "Open Community Table & DevOps",
      description: `### میز گفتگوی جامعه کاربری و دوآپس\nیک گفتگوی آزاد و صمیمی درباره تجربیات عملیاتی و چالش‌های معماری سرور.`,
      topics: ["Career", "DevOps", "Open discussion"],
      date: "2099-06-26",
      time: "18:00",
      duration: 60,
      presenter: null,
      status: "completed" as const,
      accessStatus: "public" as const,
      fileUrl: null,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      url: "https://meet.example.com/community-table",
      image: "/placeholder-meet.svg",
      tags: ["Community", "DevOps", "Career"],
    },
  ];

  for (const sample of samples) {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM meets WHERE title = ? AND deleted_at IS NULL").get(sample.title);
    const meet =
      existing ??
      createMeet(db, {
        title: sample.title,
        description: sample.description,
        topics: sample.topics,
        scheduledDate: sample.date,
        scheduledTime: sample.time,
        durationMinutes: sample.duration,
        meetUrl: sample.url,
        videoUrl: (sample as any).videoUrl ?? null,
        fileUrl: sample.fileUrl,
        status: sample.status,
        accessStatus: sample.accessStatus,
        imageUrl: sample.image,
        presenterId: sample.presenter,
        tagIds: tagIds(sample.tags),
      });

    if (!existing) {
      addReport(report, "meets", "meets", 1, 0, 0);
    } else {
      db.run(
        "UPDATE meets SET description=?, meet_url=?, video_url=?, file_url=?, status=?, access_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        [sample.description, sample.url, (sample as any).videoUrl ?? null, sample.fileUrl, sample.status, sample.accessStatus, meet.id]
      );
      addReport(report, "meets", "meets", 0, 1, 0);
    }

    const currentTagIds = tagIds(sample.tags);
    for (const tagId of currentTagIds) {
      const exists = db.query("SELECT 1 FROM meet_tags WHERE meet_id = ? AND tag_id = ?").get(meet.id, tagId);
      if (!exists) {
        db.run("INSERT OR IGNORE INTO meet_tags (meet_id, tag_id) VALUES (?, ?)", [meet.id, tagId]);
        addReport(report, "meets", "meet_tags", 1, 0, 0);
      }
    }

    if (noah && !db.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(meet.id, noah.id)) {
      toggleAttendance(db, meet.id, noah.id);
      addReport(report, "meets", "meet_attendees", 1, 0, 0);
    }
  }

  // Seed sample user preferred tags
  if (maya && noah) {
    const sampleUserTags = [
      { userId: maya.id, tags: ["Engineering", "TypeScript", "Architecture"] },
      { userId: noah.id, tags: ["Design", "Community", "Career"] },
    ];
    for (const userPref of sampleUserTags) {
      for (const tagId of tagIds(userPref.tags)) {
        const exists = db.query("SELECT 1 FROM user_tags WHERE user_id = ? AND tag_id = ?").get(userPref.userId, tagId);
        if (!exists) {
          db.run("INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)", [userPref.userId, tagId]);
          addReport(report, "meets", "user_tags", 1, 0, 0);
        }
      }
    }
  }

  refreshLandingCache(db);

  return report;
}

export async function seedMailer(db: Database, report: SeedReport = {}): Promise<SeedReport> {
  const templates = [
    {
      title: "Welcome New Member",
      subject: "Welcome to CobraDecision community!",
      format: "html" as const,
      value: `<h2>Welcome {{first_name}}!</h2><p>We are excited to have you on board.</p>`,
      description: "Default welcome template sent upon registration",
    },
    {
      title: "Event Reminder",
      subject: "Upcoming Meet: {{meet_title}}",
      format: "markdown" as const,
      value: `Hi {{first_name}},\n\nDon't forget your scheduled meetup: **{{meet_title}}** at {{meet_time}}.`,
      description: "Automated reminder for upcoming meets",
    },
  ];

  for (const t of templates) {
    const existing = db.query<{ id: string }, [string]>("SELECT id FROM emails_schema WHERE title = ? AND deleted_at IS NULL").get(t.title);
    if (!existing) {
      db.run(
        "INSERT INTO emails_schema (id, title, subject, format, value, description) VALUES (?, ?, ?, ?, ?, ?)",
        [generateId(), t.title, t.subject, t.format, t.value, t.description]
      );
      addReport(report, "mailer", "emails_schema", 1, 0, 0);
    } else {
      addReport(report, "mailer", "emails_schema", 0, 0, 1);
    }
  }

  const existingContact = db.query<{ id: string }, [string]>("SELECT id FROM contact_requests WHERE email = ?").get("hello@meetspace.example");
  if (!existingContact) {
    db.run("INSERT INTO contact_requests (id, email) VALUES (?, ?)", [generateId(), "hello@meetspace.example"]);
    addReport(report, "mailer", "contact_requests", 1, 0, 0);
  } else {
    addReport(report, "mailer", "contact_requests", 0, 0, 1);
  }

  return report;
}

export async function seedFull(db: Database): Promise<SeedReport> {
  const report: SeedReport = {};
  await seedRoles(db, report);
  await seedEndpoints(db, report);
  await seedTags(db, report);
  await seedUsers(db, report);
  await seedMeets(db, report);
  await seedMailer(db, report);
  return report;
}
