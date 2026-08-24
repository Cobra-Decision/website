import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { sign } from "hono/jwt";
import { runMigrations } from "../src/lib/database/migration";
import { seedRoles, seedTags } from "../src/lib/database/seeding";
import { createAccountRoutes } from "../src/modules/dashboard/account/routes";

describe("Account Page: Telegram Management & Account Deletion", () => {
  const jwtSecret = "test-secret-account-routes";

  async function createTestEnv() {
    const db = new Database(":memory:");
    await runMigrations(db);
    await seedRoles(db);
    await seedTags(db);

    const memberRole = db.query<{ id: string; title: string }, []>("SELECT id, title FROM roles WHERE title = 'member'").get()!;
    const passwordHash = await Bun.password.hash("MyPassword123!");

    db.run(
      `INSERT INTO users (id, username, email, password_hash, telegram_id, role_id)
       VALUES ('user-acc-1', 'accuser', 'accuser@example.com', ?, '777888999', ?)`,
      [passwordHash, memberRole.id]
    );

    const token = await sign(
      { sub: "user-acc-1", username: "accuser", role_title: memberRole.title, role_id: memberRole.id },
      jwtSecret
    );
    const app = createAccountRoutes(db, jwtSecret);

    return { db, app, token };
  }

  it("should disconnect Telegram account and clear telegram_id", async () => {
    const { db, app, token } = await createTestEnv();

    const res = await app.request("/telegram/disconnect", {
      method: "POST",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("telegram-connection-box");

    const user = db.query<{ telegram_id: string | null }, []>("SELECT telegram_id FROM users WHERE id = 'user-acc-1'").get();
    expect(user?.telegram_id).toBeNull();
  });

  it("should reject account deletion with wrong password", async () => {
    const { db, app, token } = await createTestEnv();

    const formData = new FormData();
    formData.append("password", "WrongPassword!");

    const res = await app.request("/delete", {
      method: "POST",
      headers: {
        Cookie: `session=${token}`,
      },
      body: formData,
    });

    expect(res.status).toBe(401);
    const user = db.query<{ deleted_at: string | null }, []>("SELECT deleted_at FROM users WHERE id = 'user-acc-1'").get();
    expect(user?.deleted_at).toBeNull();
  });

  it("should soft-delete user account and clear session cookie on correct password", async () => {
    const { db, app, token } = await createTestEnv();

    // Insert attendee record to check cascade delete
    db.run(`INSERT INTO meets (id, title, scheduled_date, scheduled_time, duration_minutes, presenter_id) VALUES ('m-1', 'Test Meet', '2026-09-01', '10:00', 60, 'user-acc-1')`);
    db.run(`INSERT INTO meet_attendees (user_id, meet_id) VALUES ('user-acc-1', 'm-1')`);

    const formData = new FormData();
    formData.append("password", "MyPassword123!");

    const res = await app.request("/delete", {
      method: "POST",
      headers: {
        Cookie: `session=${token}`,
      },
      body: formData,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("hx-redirect")).toBe("/auth");
    expect(res.headers.get("set-cookie")).toContain("session=;");

    const user = db.query<{ deleted_at: string | null }, []>("SELECT deleted_at FROM users WHERE id = 'user-acc-1'").get();
    expect(user?.deleted_at).not.toBeNull();

    const attendees = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meet_attendees WHERE user_id = 'user-acc-1'").get();
    expect(attendees?.count).toBe(0);
  });
});
