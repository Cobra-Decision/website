import { describe, expect, it } from "bun:test";
import { Button, Input, Textarea, Select, Checkbox, Toggle, FormField } from "./index";

describe("UI Kit Form Primitives", () => {
  it("renders Button as button with primary variant, size, and HTMX props", () => {
    const html = Button({
      variant: "primary",
      size: "sm",
      children: "Submit",
      "hx-post": "/api/test",
      "hx-target": "#result",
    }).toString();

    expect(html).toContain("<button");
    expect(html).toContain('class="btn btn-primary btn-sm"');
    expect(html).toContain('hx-post="/api/test"');
    expect(html).toContain('hx-target="#result"');
    expect(html).toContain("Submit");
  });

  it("renders Button as anchor when href is provided", () => {
    const html = Button({
      href: "/dashboard",
      variant: "ghost",
      size: "xs",
      children: "Dashboard",
    }).toString();

    expect(html).toContain("<a");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('class="btn btn-ghost btn-xs"');
  });

  it("renders Button loading state with disabled attribute", () => {
    const html = Button({
      loading: true,
      children: "Save",
    }).toString();

    expect(html).toContain("<button");
    expect(html).toContain("disabled");
    expect(html).toContain("loading-spinner");
  });

  it("renders Input with type, size, and daisyUI classes", () => {
    const html = Input({
      name: "email",
      type: "email",
      size: "sm",
      placeholder: "name@example.com",
      required: true,
    }).toString();

    expect(html).toContain("<input");
    expect(html).toContain('type="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('class="input input-bordered input-sm focus:input-primary focus:outline-none w-full"');
    expect(html).toContain("required");
  });

  it("renders Input type=file with file-input classes", () => {
    const html = Input({
      name: "attachment",
      type: "file",
      size: "sm",
    }).toString();

    expect(html).toContain('type="file"');
    expect(html).toContain("file-input");
    expect(html).toContain("file-input-bordered");
    expect(html).toContain("file-input-sm");
  });

  it("renders Input type=hidden without visual classes", () => {
    const html = Input({
      name: "id",
      type: "hidden",
      value: "123",
    }).toString();

    expect(html).toContain('type="hidden"');
    expect(html).toContain('value="123"');
    expect(html).not.toContain("input-bordered");
  });

  it("renders Textarea with rows and content", () => {
    const html = Textarea({
      name: "bio",
      rows: 4,
      size: "sm",
      value: "Hello world",
    }).toString();

    expect(html).toContain("<textarea");
    expect(html).toContain('name="bio"');
    expect(html).toContain('rows="4"');
    expect(html).toContain('class="textarea textarea-bordered textarea-sm focus:textarea-primary focus:outline-none w-full"');
    expect(html).toContain("Hello world</textarea>");
  });

  it("renders Select with options and auto-selects matching value", () => {
    const html = Select({
      name: "role",
      size: "sm",
      value: "admin",
      options: [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
      ],
    }).toString();

    expect(html).toContain("<select");
    expect(html).toContain('class="select select-bordered select-sm focus:select-primary focus:outline-none w-full"');
    expect(html).toContain('<option value="user">User</option>');
    expect(html).toContain('<option value="admin" selected');
    expect(html).toContain(">Admin</option>");
  });

  it("renders Checkbox standalone and with label", () => {
    const standalone = Checkbox({ name: "ids", value: "1", size: "sm" }).toString();
    expect(standalone).toContain("<input");
    expect(standalone).toContain('type="checkbox"');
    expect(standalone).toContain('class="checkbox checkbox-primary checkbox-sm"');
    expect(standalone).not.toContain("<label");

    const withLabel = Checkbox({ name: "agree", label: "I agree", size: "sm" }).toString();
    expect(withLabel).toContain("<label");
    expect(withLabel).toContain("I agree");
  });

  it("renders Toggle with size and checked state", () => {
    const html = Toggle({
      name: "active",
      checked: true,
      size: "sm",
    }).toString();

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('class="toggle toggle-primary toggle-sm"');
    expect(html).toContain("checked");
  });

  it("renders FormField with label, required asterisk, hint, and error", () => {
    const html = FormField({
      label: "Username",
      required: true,
      hint: "Must be unique",
      error: "Username taken",
      children: Input({ name: "username" }),
    }).toString();

    expect(html).toContain("Username");
    expect(html).toContain("*");
    expect(html).toContain("Must be unique");
    expect(html).toContain("Username taken");
    expect(html).toContain('name="username"');
  });
});
