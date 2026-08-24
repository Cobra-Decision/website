import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../lib/database/migration";
import { createMeet, filterMeets } from "./queries";
import { seedRoles, seedUsers, seedTags } from "../../lib/database/seeding";

test("filterMeets filters by status correctly", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  await seedUsers(db);
  const tags = await seedTags(db);

  createMeet(db, {
    title: "Upcoming Session",
    topics: ["Tech"],
    scheduledDate: "2026-09-01",
    scheduledTime: "18:00",
    status: "upcoming",
    tagIds: [],
  });

  createMeet(db, {
    title: "Completed Session",
    topics: ["Review"],
    scheduledDate: "2026-08-01",
    scheduledTime: "18:00",
    status: "completed",
    tagIds: [],
  });

  createMeet(db, {
    title: "Live Session",
    topics: ["Live"],
    scheduledDate: "2026-08-24",
    scheduledTime: "12:00",
    status: "live",
    tagIds: [],
  });

  const upcomingOnly = filterMeets(db, { status: "upcoming" });
  expect(upcomingOnly.length).toBe(1);
  expect(upcomingOnly[0].title).toBe("Upcoming Session");
  expect(upcomingOnly[0].status).toBe("upcoming");

  const completedOnly = filterMeets(db, { status: "completed" });
  expect(completedOnly.length).toBe(1);
  expect(completedOnly[0].title).toBe("Completed Session");
  expect(completedOnly[0].status).toBe("completed");

  const allMeets = filterMeets(db, {});
  expect(allMeets.length).toBe(3);
});
