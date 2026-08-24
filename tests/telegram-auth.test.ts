import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "../src/lib/database/migration";
import { seedRoles, seedTags } from "../src/lib/database/seeding";
import { createTelegramRoutes } from "../src/modules/telegram/routes";

describe("Telegram Mini App Integration & Auth Routes", () => {
  const jwtSecret = "test-jwt-secret-key-12345";
  const botToken = "987654321:XYZ-bot-token-test";

  async function generateValidInitData(userId = 123456789, username = "testuser", firstName = "Alice") {
    const authDate = Math.floor(Date.now() / 1000);
    const userJson = JSON.stringify({ id: userId, first_name: firstName, username });
    const dataCheckString = `auth_date=${authDate}\nuser=${userJson}`;

    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const calculatedHashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(dataCheckString));
    const hash = Array.from(new Uint8Array(calculatedHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `user=${encodeURIComponent(userJson)}&auth_date=${authDate}&hash=${hash}`;
  }

  it("should return connect screen when telegram user is unlinked", async () => {
    const db = new Database(":memory:");
    await runMigrations(db);
    await seedRoles(db);
    await seedTags(db);

    const app = createTelegramRoutes(db, jwtSecret, botToken);
    const initData = await generateValidInitData(999000111, "newbie", "Bob");

    const res = await app.request("/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Connect CobraDecision");
    expect(html).toContain("Bob");
  });

  it("should auto-login returning user with telegram_id", async () => {
    const db = new Database(":memory:");
    await runMigrations(db);
    await seedRoles(db);

    const memberRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
    db.run(
      `INSERT INTO users (id, username, email, password_hash, telegram_id, role_id)
       VALUES ('u-1', 'existing_tg_user', 'user@example.com', 'hash', '555666777', ?)`,
      [memberRole.id]
    );

    const app = createTelegramRoutes(db, jwtSecret, botToken);
    const initData = await generateValidInitData(555666777, "existing_tg_user", "Charlie");

    const res = await app.request("/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/dashboard/user");
    expect(res.headers.get("set-cookie")).toContain("session=");
  });

  it("should link existing web user by password", async () => {
    const db = new Database(":memory:");
    await runMigrations(db);
    await seedRoles(db);

    const memberRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
    db.run(
      `INSERT INTO users (id, username, email, password_hash, role_id)
       VALUES ('u-2', 'webuser', 'web@example.com', '${await Bun.password.hash("Secret123!")}', ?)`,
      [memberRole.id]
    );

    const app = createTelegramRoutes(db, jwtSecret, botToken);
    const body = new FormData();
    body.append("identifier", "web@example.com");
    body.append("password", "Secret123!");
    body.append("telegram_id", "444333222");

    const res = await app.request("/link-account", {
      method: "POST",
      body,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("hx-redirect")).toBe("/dashboard/user");
    expect(res.headers.get("set-cookie")).toContain("session=");

    // Verify DB updated
    const user = db.query<{ telegram_id: string }, []>("SELECT telegram_id FROM users WHERE id = 'u-2'").get();
    expect(user?.telegram_id).toBe("444333222");
  });
});
