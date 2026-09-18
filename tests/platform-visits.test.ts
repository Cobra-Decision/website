import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { recordMeetVisit, visitCooldowns, pruneExpiredVisits, VISIT_COOLDOWN_MS } from "../src/modules/events/queries";
import { getPlatformFunnelStats } from "../src/modules/admin/platforms-views";

describe("Platform Visits & Tracking Spec", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`
      CREATE TABLE platforms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        deleted_at DATETIME
      );
      CREATE TABLE meets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        deleted_at DATETIME
      );
      CREATE TABLE meet_attendees (
        meet_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (meet_id, user_id)
      );
      CREATE TABLE meet_visits (
        id TEXT PRIMARY KEY,
        meet_id TEXT NOT NULL,
        platform_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    visitCooldowns.clear();
  });

  it("records valid visit and attributes to platform slug", () => {
    db.run("INSERT INTO platforms (id, name, slug) VALUES ('p1', 'Telegram', 'telegram')");
    db.run("INSERT INTO meets (id, title) VALUES ('m1', 'Rust Meetup')");

    recordMeetVisit(db, "m1", "telegram", "visitor-1");

    const visits = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meet_visits").get();
    expect(visits?.count).toBe(1);

    const recorded = db.query<{ meet_id: string; platform_id: string }, []>("SELECT meet_id, platform_id FROM meet_visits").get();
    expect(recorded?.meet_id).toBe("m1");
    expect(recorded?.platform_id).toBe("p1");
  });

  it("deduplicates multiple visits within 5-minute cooldown window", () => {
    db.run("INSERT INTO meets (id, title) VALUES ('m1', 'Tech Talk')");

    recordMeetVisit(db, "m1", undefined, "visitor-ip-1");
    recordMeetVisit(db, "m1", undefined, "visitor-ip-1");
    recordMeetVisit(db, "m1", undefined, "visitor-ip-1");

    const visits = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM meet_visits").get();
    expect(visits?.count).toBe(1);
  });

  it("prunes expired visit cooldowns accurately", () => {
    const oldTime = Date.now() - VISIT_COOLDOWN_MS - 1000;
    visitCooldowns.set("meet1:none:ip1", oldTime);
    visitCooldowns.set("meet1:none:ip2", Date.now());

    expect(visitCooldowns.size).toBe(2);
    pruneExpiredVisits();
    expect(visitCooldowns.size).toBe(1);
    expect(visitCooldowns.has("meet1:none:ip2")).toBe(true);
  });

  it("calculates platform funnel stats accurately with consolidated metrics", () => {
    db.run("INSERT INTO platforms (id, name, slug) VALUES ('p1', 'Telegram', 'telegram')");
    db.run("INSERT INTO meets (id, title) VALUES ('m1', 'Intro to Bun'), ('m2', 'SQLite Deep Dive')");

    // 3 visits: 2 on m1 (1 via telegram, 1 direct), 1 on m2 (direct)
    db.run("INSERT INTO meet_visits (id, meet_id, platform_id) VALUES ('v1', 'm1', 'p1'), ('v2', 'm1', NULL), ('v3', 'm2', NULL)");
    // 1 RSVP on m1
    db.run("INSERT INTO meet_attendees (meet_id, user_id) VALUES ('m1', 'u1')");

    const stats = getPlatformFunnelStats(db);
    expect(stats.totalVisits).toBe(3);
    expect(stats.totalAttendees).toBe(1);
    expect(stats.uniqueMeetsCount).toBe(2);
    expect(Math.round(stats.overallConversionRate)).toBe(33); // 1/3 ~ 33.3%
    expect(stats.platforms.length).toBeGreaterThan(0);
  });
});
