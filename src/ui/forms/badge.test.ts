import { describe, expect, it } from "bun:test";
import { Badge } from "./badge";

describe("Badge Primitive Component", () => {
  it("renders default span tag with base badge class and children", () => {
    const res = Badge({ children: "Default Badge" });
    expect(res).toBeDefined();
    const str = res.toString();
    expect(str).toContain("<span");
    expect(str).toContain("class=\"badge\"");
    expect(str).toContain("Default Badge</span>");
  });

  it("renders polymorphic tags correctly", () => {
    const divBadge = Badge({ as: "div", children: "Div Tag" });
    expect(divBadge.toString()).toContain("<div");
    expect(divBadge.toString()).toContain("class=\"badge\"");
    expect(divBadge.toString()).toContain("Div Tag</div>");

    const btnBadge = Badge({ as: "button", children: "Button Tag" });
    expect(btnBadge.toString()).toContain("<button");
    expect(btnBadge.toString()).toContain("class=\"badge\"");
    expect(btnBadge.toString()).toContain("Button Tag</button>");

    const labelBadge = Badge({ as: "label", children: "Label Tag" });
    expect(labelBadge.toString()).toContain("<label");
    expect(labelBadge.toString()).toContain("class=\"badge\"");
    expect(labelBadge.toString()).toContain("Label Tag</label>");

    const aBadge = Badge({ as: "a", href: "/test", children: "Link Tag" });
    expect(aBadge.toString()).toContain("<a");
    expect(aBadge.toString()).toContain("class=\"badge\"");
    expect(aBadge.toString()).toContain("href=\"/test\"");
    expect(aBadge.toString()).toContain("Link Tag</a>");
  });

  it("applies variant classes correctly", () => {
    const variants = [
      { variant: "primary", expected: "badge badge-primary" },
      { variant: "secondary", expected: "badge badge-secondary" },
      { variant: "accent", expected: "badge badge-accent" },
      { variant: "neutral", expected: "badge badge-neutral" },
      { variant: "ghost", expected: "badge badge-ghost" },
      { variant: "error", expected: "badge badge-error" },
      { variant: "success", expected: "badge badge-success" },
      { variant: "warning", expected: "badge badge-warning" },
      { variant: "info", expected: "badge badge-info" },
    ] as const;

    for (const { variant, expected } of variants) {
      const el = Badge({ variant, children: "Text" });
      expect(el.toString()).toContain(`class="${expected}"`);
    }
  });

  it("applies size classes correctly", () => {
    const sizes = [
      { size: "xs", expected: "badge badge-xs" },
      { size: "sm", expected: "badge badge-sm" },
      { size: "md", expected: "badge badge-md" },
      { size: "lg", expected: "badge badge-lg" },
    ] as const;

    for (const { size, expected } of sizes) {
      const el = Badge({ size, children: "Text" });
      expect(el.toString()).toContain(`class="${expected}"`);
    }
  });

  it("applies outline class when outline is true", () => {
    const el = Badge({ outline: true, children: "Outline" });
    expect(el.toString()).toContain('class="badge badge-outline"');

    const elWithVariant = Badge({ variant: "primary", outline: true, children: "Outline Primary" });
    expect(elWithVariant.toString()).toContain('class="badge badge-primary badge-outline"');
  });

  it("merges custom class names cleanly", () => {
    const el = Badge({
      variant: "success",
      size: "sm",
      outline: true,
      class: "font-mono uppercase tracking-wider",
      children: "Custom",
    });
    expect(el.toString()).toContain(
      'class="badge badge-success badge-sm badge-outline font-mono uppercase tracking-wider"'
    );
  });

  it("renders leading icon and trailing iconRight with proper margin classes", () => {
    const icon = { isEscaped: true, toString: () => '<svg id="left-icon"></svg>' };
    const iconRight = { isEscaped: true, toString: () => '<svg id="right-icon"></svg>' };

    const el = Badge({ icon, iconRight, children: "With Icons" });
    const str = el.toString();
    expect(str).toContain('<span class="inline-flex shrink-0 me-1 items-center"><svg id="left-icon"></svg></span>');
    expect(str).toContain("With Icons");
    expect(str).toContain('<span class="inline-flex shrink-0 ms-1 items-center"><svg id="right-icon"></svg></span>');
  });

  it("forwards arbitrary HTML, HTMX, Alpine, and ARIA attributes", () => {
    const el = Badge({
      id: "badge-1",
      "hx-get": "/api/status",
      "hx-target": "#badge-1",
      "hx-swap": "outerHTML",
      "x-data": "{ active: true }",
      "x-text": "active ? 'Active' : 'Inactive'",
      "aria-label": "Status indicator",
      "aria-hidden": "true",
      children: "Status",
    });

    const str = el.toString();
    expect(str).toContain('id="badge-1"');
    expect(str).toContain('hx-get="/api/status"');
    expect(str).toContain('hx-target="#badge-1"');
    expect(str).toContain('hx-swap="outerHTML"');
    expect(str).toContain('x-data="{ active: true }"');
    expect(str).toContain('x-text="active ? &#39;Active&#39; : &#39;Inactive&#39;"');
    expect(str).toContain('aria-label="Status indicator"');
    expect(str).toContain('aria-hidden="true"');
  });
});
