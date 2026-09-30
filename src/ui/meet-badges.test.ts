import { describe, expect, it } from "bun:test";
import { MeetStatusBadge, MeetAccessBadge, MeetPublishBadge } from "./meet-badges";
import { TagBadge } from "./tag-badge";

describe("Meet Badges Refactored Components", () => {
  it("renders MeetStatusBadge correctly for upcoming, live, and completed", () => {
    const upcoming = MeetStatusBadge({ status: "upcoming", locale: "en" });
    expect(upcoming.toString()).toContain("badge-primary");
    expect(upcoming.toString()).toContain("Upcoming");

    const live = MeetStatusBadge({ status: "live", locale: "en" });
    expect(live.toString()).toContain("badge-success text-white");
    expect(live.toString()).toContain("animate-pulse");
    expect(live.toString()).toContain("Live");

    const completed = MeetStatusBadge({ status: "completed", locale: "en" });
    expect(completed.toString()).toContain("badge-ghost");
    expect(completed.toString()).toContain("Completed");
  });

  it("MeetStatusBadge forwards extra attributes and classes", () => {
    const el = MeetStatusBadge({
      status: "upcoming",
      class: "custom-status",
      id: "meet-stat-1",
      "data-test": "status-badge",
    });
    const str = el.toString();
    expect(str).toContain("custom-status");
    expect(str).toContain('id="meet-stat-1"');
    expect(str).toContain('data-test="status-badge"');
  });

  it("renders MeetAccessBadge correctly for public vs private", () => {
    const pub = MeetAccessBadge({ accessStatus: "public", locale: "en" });
    expect(pub.toString()).toContain("badge-outline");
    expect(pub.toString()).not.toContain("badge-warning");
    expect(pub.toString()).toContain("Public");

    const priv = MeetAccessBadge({ accessStatus: "private", locale: "en" });
    expect(priv.toString()).toContain("badge-warning");
    expect(priv.toString()).toContain("badge-outline");
    expect(priv.toString()).toContain("Private");
    expect(priv.toString()).toContain("<svg"); // LockIcon
  });

  it("renders MeetPublishBadge correctly", () => {
    const pub = MeetPublishBadge({ publishStatus: "public", locale: "en" });
    expect(pub).toBeNull();

    const restricted = MeetPublishBadge({ publishStatus: "restricted", locale: "en" });
    expect(restricted?.toString()).toContain("badge-warning");
    expect(restricted?.toString()).toContain("Restricted");
    expect(restricted?.toString()).toContain("<svg");

    const priv = MeetPublishBadge({ publishStatus: "private", locale: "en" });
    expect(priv?.toString()).toContain("badge-neutral");
    expect(priv?.toString()).toContain("Private");
    expect(priv?.toString()).toContain("<svg");
  });
});

describe("TagBadge Refactored Component", () => {
  it("renders basic TagBadge without remove button or description", () => {
    const badge = TagBadge({ title: "TypeScript" });
    const str = badge.toString();
    expect(str).toContain("<span");
    expect(str).toContain("badge");
    expect(str).toContain("badge-outline");
    expect(str).toContain("TypeScript");
    expect(str).not.toContain("<button");
  });

  it("renders TagBadge with variant and size", () => {
    const badge = TagBadge({ title: "Bun", variant: "primary", size: "xs" });
    const str = badge.toString();
    expect(str).toContain("badge-primary");
    expect(str).toContain("badge-xs");
    expect(str).toContain("Bun");
  });

  it("renders TagBadge with tooltip description", () => {
    const badge = TagBadge({ title: "Hono", description: "Ultrafast web framework" });
    const str = badge.toString();
    expect(str).toContain('class="tooltip"');
    expect(str).toContain('data-tip="Ultrafast web framework"');
    expect(str).toContain("Hono");
  });

  it("renders TagBadge with remove button and HTMX attributes", () => {
    const badge = TagBadge({
      title: "Hono",
      onRemoveHref: "/tags/remove/1",
      removeTarget: "#tag-list",
      removeAriaLabel: "Remove Hono tag",
    });
    const str = badge.toString();
    expect(str).toContain("<button");
    expect(str).toContain('hx-delete="/tags/remove/1"');
    expect(str).toContain('hx-target="#tag-list"');
    expect(str).toContain('hx-swap="outerHTML"');
    expect(str).toContain('aria-label="Remove Hono tag"');
  });

  it("TagBadge forwards custom attributes", () => {
    const badge = TagBadge({
      title: "Custom",
      id: "tag-badge-item",
      "data-id": "123",
      class: "my-custom-tag",
    });
    const str = badge.toString();
    expect(str).toContain('id="tag-badge-item"');
    expect(str).toContain('data-id="123"');
    expect(str).toContain("my-custom-tag");
  });
});
