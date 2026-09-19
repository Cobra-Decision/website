import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { sign } from "hono/jwt";
import { runMigrations } from "../../lib/database/migration";
import { createMeet, filterMeets, getMeetById } from "./queries";
import { seedRoles, seedUsers, seedTags } from "../../lib/database/seeding";
import { generateId } from "../../lib/id";
import { createApp } from "../../app";
import type { MiddlewareHandler } from "hono";

test("filterMeets filters by status correctly", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);
  await seedUsers(db);
  await seedTags(db);

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
  db.close();
});

test("visibility matrix in filterMeets and getMeetById for public, private, and restricted meets", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);

  const memberRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  const superAdminRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'Super Admin'").get()!;

  const user1 = generateId();
  const user2 = generateId();
  const presenterUser = generateId();
  const adminUser = generateId();

  db.run(
    "INSERT INTO users (id, email, password_hash, role_id) VALUES (?, 'user1@test.com', 'hash', ?), (?, 'user2@test.com', 'hash', ?), (?, 'presenter@test.com', 'hash', ?), (?, 'admin@test.com', 'hash', ?)",
    [user1, memberRole.id, user2, memberRole.id, presenterUser, memberRole.id, adminUser, superAdminRole.id]
  );

  const publicMeet = createMeet(db, {
    title: "Public Gathering",
    topics: ["Open"],
    scheduledDate: "2026-09-10",
    scheduledTime: "10:00",
    publishStatus: "public",
    tagIds: [],
  });

  const privateMeet = createMeet(db, {
    title: "Private Executive Board",
    topics: ["Strategy"],
    scheduledDate: "2026-09-11",
    scheduledTime: "11:00",
    publishStatus: "private",
    tagIds: [],
  });

  const restrictedMeet = createMeet(db, {
    title: "Restricted Working Group",
    topics: ["Architecture"],
    scheduledDate: "2026-09-12",
    scheduledTime: "12:00",
    publishStatus: "restricted",
    presenterId: presenterUser,
    allowedUserIds: [user1],
    tagIds: [],
  });

  // 1. Anonymous viewer: only public meets
  const anonFilter = filterMeets(db, {});
  expect(anonFilter.map((m) => m.id)).toEqual([publicMeet.id]);
  expect(getMeetById(db, publicMeet.id)).not.toBeNull();
  expect(getMeetById(db, privateMeet.id)).toBeNull();
  expect(getMeetById(db, restrictedMeet.id)).toBeNull();

  // 2. Assigned user (user1): sees public + their restricted meet, but NOT private or other restricted meets
  const user1Filter = filterMeets(db, { viewer: { userId: user1 } });
  expect(user1Filter.map((m) => m.id).sort()).toEqual([publicMeet.id, restrictedMeet.id].sort());
  expect(getMeetById(db, publicMeet.id, { userId: user1 })).not.toBeNull();
  expect(getMeetById(db, restrictedMeet.id, { userId: user1 })).not.toBeNull();
  expect(getMeetById(db, privateMeet.id, { userId: user1 })).toBeNull();

  // 3. Unassigned user (user2): sees only public meets
  const user2Filter = filterMeets(db, { viewer: { userId: user2 } });
  expect(user2Filter.map((m) => m.id)).toEqual([publicMeet.id]);
  expect(getMeetById(db, publicMeet.id, { userId: user2 })).not.toBeNull();
  expect(getMeetById(db, restrictedMeet.id, { userId: user2 })).toBeNull();
  expect(getMeetById(db, privateMeet.id, { userId: user2 })).toBeNull();

  // 4. Presenter: sees their own restricted meet even if not explicitly in allowedUserIds
  const presenterFilter = filterMeets(db, { viewer: { userId: presenterUser } });
  expect(presenterFilter.map((m) => m.id).sort()).toEqual([publicMeet.id, restrictedMeet.id].sort());
  expect(getMeetById(db, restrictedMeet.id, { userId: presenterUser })).not.toBeNull();

  // 5. Super Admin: sees all meets (public, private, restricted)
  const adminFilter = filterMeets(db, { viewer: { isSuperAdmin: true } });
  expect(adminFilter.map((m) => m.id).sort()).toEqual([publicMeet.id, privateMeet.id, restrictedMeet.id].sort());
  expect(getMeetById(db, publicMeet.id, { isSuperAdmin: true })).not.toBeNull();
  expect(getMeetById(db, privateMeet.id, { isSuperAdmin: true })).not.toBeNull();
  expect(getMeetById(db, restrictedMeet.id, { isSuperAdmin: true })).not.toBeNull();

  db.close();
});

test("updating meet publish status and allowed users updates visibility dynamically", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);

  const memberRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  const userA = generateId();
  const userB = generateId();
  db.run("INSERT INTO users (id, email, password_hash, role_id) VALUES (?, 'a@test.com', 'h', ?), (?, 'b@test.com', 'h', ?)", [
    userA,
    memberRole.id,
    userB,
    memberRole.id,
  ]);

  const meet = createMeet(db, {
    title: "Evolving Meet",
    topics: [],
    scheduledDate: "2026-10-01",
    scheduledTime: "10:00",
    publishStatus: "restricted",
    allowedUserIds: [userA],
    tagIds: [],
  });

  // Initially userA can see, userB cannot
  expect(getMeetById(db, meet.id, { userId: userA })).not.toBeNull();
  expect(getMeetById(db, meet.id, { userId: userB })).toBeNull();

  // Change allowed users from userA to userB
  db.transaction(() => {
    db.run("DELETE FROM meet_allowed_users WHERE meet_id = ?", [meet.id]);
    db.run("INSERT INTO meet_allowed_users (meet_id, user_id) VALUES (?, ?)", [meet.id, userB]);
  })();

  expect(getMeetById(db, meet.id, { userId: userA })).toBeNull();
  expect(getMeetById(db, meet.id, { userId: userB })).not.toBeNull();

  // Update publish_status to public
  db.run("UPDATE meets SET publish_status = 'public' WHERE id = ?", [meet.id]);
  expect(getMeetById(db, meet.id, { userId: userA })).not.toBeNull();
  expect(getMeetById(db, meet.id, { userId: userB })).not.toBeNull();
  expect(getMeetById(db, meet.id)).not.toBeNull();

  // Update publish_status to private
  db.run("UPDATE meets SET publish_status = 'private' WHERE id = ?", [meet.id]);
  expect(getMeetById(db, meet.id, { userId: userA })).toBeNull();
  expect(getMeetById(db, meet.id, { userId: userB })).toBeNull();
  expect(getMeetById(db, meet.id)).toBeNull();
  expect(getMeetById(db, meet.id, { isSuperAdmin: true })).not.toBeNull();

  db.close();
});

test("meet detail & attend routes enforce authorization on private and restricted meets", async () => {
  const db = new Database(":memory:");
  await runMigrations(db);
  await seedRoles(db);

  const memberRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'member'").get()!;
  const superAdminRole = db.query<{ id: string }, []>("SELECT id FROM roles WHERE title = 'Super Admin'").get()!;

  const userAssigned = generateId();
  const userUnassigned = generateId();
  const userPresenter = generateId();
  const userAdmin = generateId();

  db.run(
    "INSERT INTO users (id, email, password_hash, role_id) VALUES (?, 'assigned@test.com', 'h', ?), (?, 'unassigned@test.com', 'h', ?), (?, 'presenter@test.com', 'h', ?), (?, 'admin@test.com', 'h', ?)",
    [userAssigned, memberRole.id, userUnassigned, memberRole.id, userPresenter, memberRole.id, userAdmin, superAdminRole.id]
  );

  const secret = "test-jwt-secret";
  const passCaptcha: MiddlewareHandler = async (_, next) => next();
  const app = createApp({ database: db, captcha: { middleware: passCaptcha, challengeHandler: (c) => c.json({}) }, jwtSecret: secret });

  const assignedCookie = `session=${await sign({ sub: userAssigned, username: "assigned", role_title: "member", role_id: memberRole.id }, secret, "HS256")}`;
  const unassignedCookie = `session=${await sign({ sub: userUnassigned, username: "unassigned", role_title: "member", role_id: memberRole.id }, secret, "HS256")}`;
  const presenterCookie = `session=${await sign({ sub: userPresenter, username: "presenter", role_title: "member", role_id: memberRole.id }, secret, "HS256")}`;
  const adminCookie = `session=${await sign({ sub: userAdmin, username: "admin", role_title: "Super Admin", role_id: superAdminRole.id }, secret, "HS256")}`;

  const publicMeet = createMeet(db, {
    title: "Open Meet",
    topics: [],
    scheduledDate: "2099-01-01",
    scheduledTime: "10:00",
    publishStatus: "public",
    tagIds: [],
  });

  const privateMeet = createMeet(db, {
    title: "Secret Meet",
    topics: [],
    scheduledDate: "2099-01-02",
    scheduledTime: "10:00",
    publishStatus: "private",
    tagIds: [],
  });

  const restrictedMeet = createMeet(db, {
    title: "VIP Meet",
    topics: [],
    scheduledDate: "2099-01-03",
    scheduledTime: "10:00",
    publishStatus: "restricted",
    presenterId: userPresenter,
    allowedUserIds: [userAssigned],
    tagIds: [],
  });

  // --- GET /meets/:id tests ---
  // Public meet: 200 for everyone
  const publicRes = await app.request(`/meets/${publicMeet.id}`);
  expect(publicRes.status).toBe(200);
  const publicHtml = await publicRes.text();
  expect(publicHtml).toContain('id="contact"');
  expect((await app.request(`/meets/${publicMeet.id}`, { headers: { cookie: unassignedCookie } })).status).toBe(200);

  // Private meet: 404 for anon, unassigned, assigned; 200 for super admin
  expect((await app.request(`/meets/${privateMeet.id}`)).status).toBe(404);
  expect((await app.request(`/meets/${privateMeet.id}`, { headers: { cookie: unassignedCookie } })).status).toBe(404);
  expect((await app.request(`/meets/${privateMeet.id}`, { headers: { cookie: assignedCookie } })).status).toBe(404);
  expect((await app.request(`/meets/${privateMeet.id}`, { headers: { cookie: adminCookie } })).status).toBe(200);

  // Restricted meet: 404 for anon & unassigned; 200 for assigned, presenter, super admin
  expect((await app.request(`/meets/${restrictedMeet.id}`)).status).toBe(404);
  expect((await app.request(`/meets/${restrictedMeet.id}`, { headers: { cookie: unassignedCookie } })).status).toBe(404);
  expect((await app.request(`/meets/${restrictedMeet.id}`, { headers: { cookie: assignedCookie } })).status).toBe(200);
  expect((await app.request(`/meets/${restrictedMeet.id}`, { headers: { cookie: presenterCookie } })).status).toBe(200);
  expect((await app.request(`/meets/${restrictedMeet.id}`, { headers: { cookie: adminCookie } })).status).toBe(200);

  // --- POST /meets/:id/attend tests ---
  // Anonymous: 401
  expect((await app.request(`/meets/${restrictedMeet.id}/attend`, { method: "POST" })).status).toBe(401);

  // Unassigned user on restricted meet: 404
  expect((await app.request(`/meets/${restrictedMeet.id}/attend`, { method: "POST", headers: { cookie: unassignedCookie } })).status).toBe(404);

  // Unassigned user on private meet: 404
  expect((await app.request(`/meets/${privateMeet.id}/attend`, { method: "POST", headers: { cookie: unassignedCookie } })).status).toBe(404);

  // Assigned user on restricted meet: 200
  const attendRes = await app.request(`/meets/${restrictedMeet.id}/attend`, { method: "POST", headers: { cookie: assignedCookie } });
  expect(attendRes.status).toBe(200);
  expect(db.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(restrictedMeet.id, userAssigned)).toBeTruthy();

  // Super Admin on private meet: 200
  const adminAttendRes = await app.request(`/meets/${privateMeet.id}/attend`, { method: "POST", headers: { cookie: adminCookie } });
  expect(adminAttendRes.status).toBe(200);
  expect(db.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(privateMeet.id, userAdmin)).toBeTruthy();

  // --- DELETE /meets/:id/attend tests ---
  // Unassigned user on restricted meet: 404
  expect((await app.request(`/meets/${restrictedMeet.id}/attend`, { method: "DELETE", headers: { cookie: unassignedCookie } })).status).toBe(404);

  // Assigned user leaves restricted meet: 200
  const leaveRes = await app.request(`/meets/${restrictedMeet.id}/attend`, { method: "DELETE", headers: { cookie: assignedCookie } });
  expect(leaveRes.status).toBe(200);
  expect(db.query("SELECT 1 FROM meet_attendees WHERE meet_id = ? AND user_id = ?").get(restrictedMeet.id, userAssigned)).toBeNull();

  db.close();
});
