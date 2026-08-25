import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../lib/database/migration";
import { seedRoles, seedEndpoints } from "../../lib/database/seeding";
import { getPlatformFunnelStats } from "./platforms-views";
import { recordMeetVisit } from "../events/queries";

describe("Warehouse Center - Platforms Data & Funnel Analytics", () => {
  it("should calculate correct aggregate funnel metrics and platform share", async () => {
    const db = new Database(":memory:");
    await runMigrations(db);
    await seedRoles(db);
    await seedEndpoints(db, {}, { bindRoles: true });

    // Seed platform and meets
    db.run("INSERT INTO platforms (id, slug, name) VALUES ('p-tg', 'telegram', 'Telegram Channel')");
    db.run("INSERT INTO platforms (id, slug, name) VALUES ('p-li', 'linkedin', 'LinkedIn')");
    db.run(
      "INSERT INTO meets (id, title, scheduled_date, scheduled_time, duration_minutes) VALUES ('m-1', 'Cobra Tech Meet', '2026-09-01', '18:00', 60)"
    );
    db.run(
      "INSERT INTO meets (id, title, scheduled_date, scheduled_time, duration_minutes) VALUES ('m-2', 'Product Launch', '2026-09-02', '19:00', 45)"
    );
    db.run(
      "INSERT INTO users (id, email, username, password_hash, role_id) VALUES ('u-1', 'attendee1@example.com', 'att1', 'hash', (SELECT id FROM roles LIMIT 1))"
    );

    // Seed visits
    recordMeetVisit(db, "m-1", "telegram", "user-1-ip");
    recordMeetVisit(db, "m-1", "telegram", "user-2-ip");
    recordMeetVisit(db, "m-1", "linkedin", "user-3-ip");
    recordMeetVisit(db, "m-2", undefined, "user-4-ip"); // Direct

    // Seed RSVP attendee
    db.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES ('m-1', 'u-1')");

    const stats = getPlatformFunnelStats(db);

    expect(stats.totalVisits).toBe(4);
    expect(stats.totalAttendees).toBe(1);
    expect(stats.uniqueMeetsCount).toBe(2);
    expect(stats.overallConversionRate).toBe(25); // 1 / 4 * 100

    expect(stats.topPlatform?.name).toBe("Telegram Channel");
    expect(stats.topPlatform?.visits).toBe(2);

    expect(stats.platforms.length).toBe(3);
    const tgPlatform = stats.platforms.find((p) => p.slug === "telegram");
    expect(tgPlatform?.visits).toBe(2);
    expect(tgPlatform?.sharePercent).toBe(50);

    // Test filter by platform
    const filteredStats = getPlatformFunnelStats(db, { platform: "telegram" });
    expect(filteredStats.recentVisits.length).toBe(2);
    expect(filteredStats.recentVisits.every((v) => v.platform_name === "Telegram Channel")).toBe(true);

    // Test search by meet title
    const searchedStats = getPlatformFunnelStats(db, { q: "Product Launch" });
    expect(searchedStats.recentVisits.length).toBe(1);
    expect(searchedStats.recentVisits[0].meet_title).toBe("Product Launch");
  });
});
