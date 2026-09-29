# Unified UI Kit Form Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement zero-runtime-cost server-side JSX form primitives (`Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `FormField`) in `src/ui/forms/` and systematically migrate all views across auth, dashboard, admin, events, landing, and custom UI components to the unified primitives.

**Architecture:** Server-rendered JSX components with Hono JSX and daisyUI/Tailwind CSS, forwarding all HTMX (`hx-*`), Alpine.js (`x-*`), and native HTML attributes. Logical RTL/LTR spacing (`ms-*`, `me-*`, `ps-*`, `pe-*`) for bilingual English/Persian typography.

**Tech Stack:** Bun, Hono (server-rendered JSX), HTMX, Alpine.js, Tailwind CSS + daisyUI, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-29-ui-kit-form-primitives-design.md`

## Global Constraints

- **Zero Client Overhead:** Pure server-rendered JSX functions returning HTML strings/nodes. No client-side bundle or heavy JS frameworks.
- **Full Attribute Passthrough:** All components must spread `...props` directly onto native elements to support arbitrary HTMX (`hx-*`), Alpine (`x-*`), and HTML5 attributes.
- **daisyUI CSS Standard:** Use only standard daisyUI classes (`btn`, `input`, `textarea`, `select`, `checkbox`, `toggle`, `form-control`) and Tailwind logical spacing (`me-*`, `ms-*`).
- **Strict Typing:** Export full TypeScript prop interfaces with size (`xs`, `sm`, `md`, `lg`) and variant mappings.

---

### Task 1: Create Form Primitives & Comprehensive Unit Tests

**Files:**
- Create: `src/ui/forms/types.ts`
- Create: `src/ui/forms/button.tsx`
- Create: `src/ui/forms/input.tsx`
- Create: `src/ui/forms/textarea.tsx`
- Create: `src/ui/forms/select.tsx`
- Create: `src/ui/forms/checkbox.tsx`
- Create: `src/ui/forms/toggle.tsx`
- Create: `src/ui/forms/form-field.tsx`
- Create: `src/ui/forms/index.ts`
- Test: `src/ui/forms/forms.test.ts`

**Interfaces:**
- Produces: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `FormField`, `ComponentSize`, `ButtonVariant`, `SelectOption` from `src/ui/forms/index.ts`.

- [ ] **Step 1: Write the failing unit tests for all form primitives**

Write `src/ui/forms/forms.test.ts`:
```typescript
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
    expect(html).toContain('<option value="admin" selected>Admin</option>');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/ui/forms/forms.test.ts`
Expected: FAIL (Cannot find module `./index`)

- [ ] **Step 3: Implement the types and primitives**

Create `src/ui/forms/types.ts`:
```typescript
export type ComponentSize = "xs" | "sm" | "md" | "lg";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "ghost"
  | "outline"
  | "error"
  | "success"
  | "warning"
  | "info";

export interface SelectOption {
  value: string | number;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}
```

Create `src/ui/forms/button.tsx`:
```typescript
import type { ButtonVariant, ComponentSize } from "./types";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  type?: "button" | "submit" | "reset";
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  htmxIndicator?: boolean;
  outline?: boolean;
  circle?: boolean;
  square?: boolean;
  block?: boolean;
  icon?: any;
  iconRight?: any;
  class?: string;
  children?: any;
  [key: string]: any;
}

const sizeClasses: Record<ComponentSize, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  neutral: "btn-neutral",
  ghost: "btn-ghost",
  outline: "btn-outline",
  error: "btn-error",
  success: "btn-success",
  warning: "btn-warning",
  info: "btn-info",
};

export function Button({
  variant,
  size,
  type = "button",
  href,
  disabled = false,
  loading = false,
  htmxIndicator = false,
  outline = false,
  circle = false,
  square = false,
  block = false,
  icon,
  iconRight,
  class: customClass = "",
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "btn",
    variant ? variantClasses[variant] : "",
    size ? sizeClasses[size] : "",
    outline ? "btn-outline" : "",
    circle ? "btn-circle" : "",
    square ? "btn-square" : "",
    block ? "btn-block" : "",
    customClass,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading && <span class="loading loading-spinner loading-xs me-2" aria-hidden="true"></span>}
      {htmxIndicator && <span class="htmx-indicator loading loading-spinner loading-xs me-2" aria-hidden="true"></span>}
      {!loading && icon && <span class="inline-flex shrink-0 me-2 items-center">{icon}</span>}
      {children}
      {iconRight && <span class="inline-flex shrink-0 ms-2 items-center">{iconRight}</span>}
    </>
  );

  if (href) {
    if (disabled) {
      return (
        <a class={`${classes} pointer-events-none opacity-50`} aria-disabled="true" role="link" {...props}>
          {content}
        </a>
      );
    }
    return (
      <a href={href} class={classes} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} class={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
```
Create `src/ui/forms/input.tsx`:
```typescript
import type { ComponentSize } from "./types";

export interface InputProps {
  name?: string;
  type?: "text" | "email" | "password" | "number" | "search" | "url" | "tel" | "file" | "hidden" | string;
  size?: ComponentSize;
  variant?: "bordered" | "ghost" | "primary" | "error" | "success";
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  id?: string;
  class?: string;
  [key: string]: any;
}

const inputSizes: Record<ComponentSize, string> = {
  xs: "input-xs",
  sm: "input-sm",
  md: "input-md",
  lg: "input-lg",
};

const fileInputSizes: Record<ComponentSize, string> = {
  xs: "file-input-xs",
  sm: "file-input-sm",
  md: "file-input-md",
  lg: "file-input-lg",
};

export function Input({
  name,
  type = "text",
  size,
  variant = "bordered",
  value,
  placeholder,
  required,
  disabled,
  readonly,
  autocomplete,
  id,
  class: customClass = "",
  ...props
}: InputProps) {
  if (type === "hidden") {
    return <input type="hidden" name={name} value={value} id={id} class={customClass || undefined} {...props} />;
  }

  const isFile = type === "file";
  const baseClass = isFile ? "file-input" : "input";
  const sizeClass = size ? (isFile ? fileInputSizes[size] : inputSizes[size]) : "";
  const isGhost = variant === "ghost";
  const borderClass = isGhost ? `${baseClass}-ghost` : `${baseClass}-bordered`;
  const colorClass = variant && variant !== "bordered" && !isGhost ? `${baseClass}-${variant}` : "";
  const focusClass = isFile ? "focus:file-input-primary" : "focus:input-primary focus:outline-none";

  const classes = [baseClass, borderClass, colorClass, sizeClass, focusClass, "w-full", customClass]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readonly={readonly}
      autocomplete={autocomplete}
      id={id}
      class={classes}
      {...props}
    />
  );
}
```

Create `src/ui/forms/textarea.tsx`:
```typescript
import type { ComponentSize } from "./types";

export interface TextareaProps {
  name?: string;
  rows?: number;
  size?: ComponentSize;
  variant?: "bordered" | "ghost" | "primary" | "error" | "success";
  value?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  id?: string;
  class?: string;
  children?: any;
  [key: string]: any;
}

const textareaSizes: Record<ComponentSize, string> = {
  xs: "textarea-xs",
  sm: "textarea-sm",
  md: "textarea-md",
  lg: "textarea-lg",
};

export function Textarea({
  name,
  rows,
  size,
  variant = "bordered",
  value,
  placeholder,
  required,
  disabled,
  readonly,
  id,
  class: customClass = "",
  children,
  ...props
}: TextareaProps) {
  const sizeClass = size ? textareaSizes[size] : "";
  const isGhost = variant === "ghost";
  const borderClass = isGhost ? "textarea-ghost" : "textarea-bordered";
  const colorClass = variant && variant !== "bordered" && !isGhost ? `textarea-${variant}` : "";

  const classes = [
    "textarea",
    borderClass,
    colorClass,
    sizeClass,
    "focus:textarea-primary focus:outline-none w-full",
    customClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <textarea
      name={name}
      rows={rows}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readonly={readonly}
      id={id}
      class={classes}
      {...props}
    >
      {value ?? children ?? ""}
    </textarea>
  );
}
```

Create `src/ui/forms/select.tsx`:
```typescript
import type { ComponentSize, SelectOption } from "./types";

export interface SelectProps {
  name?: string;
  size?: ComponentSize;
  options?: SelectOption[];
  placeholder?: string;
  value?: string | number;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  class?: string;
  children?: any;
  [key: string]: any;
}

const selectSizes: Record<ComponentSize, string> = {
  xs: "select-xs",
  sm: "select-sm",
  md: "select-md",
  lg: "select-lg",
};

export function Select({
  name,
  size,
  options,
  placeholder,
  value,
  required,
  disabled,
  id,
  class: customClass = "",
  children,
  ...props
}: SelectProps) {
  const sizeClass = size ? selectSizes[size] : "";
  const classes = ["select select-bordered", sizeClass, "focus:select-primary focus:outline-none w-full", customClass]
    .filter(Boolean)
    .join(" ");

  const isPlaceholderSelected = value === undefined || value === null || value === "";

  return (
    <select name={name} required={required} disabled={disabled} id={id} class={classes} {...props}>
      {placeholder && (
        <option value="" disabled selected={isPlaceholderSelected}>
          {placeholder}
        </option>
      )}
      {options
        ? options.map((opt) => {
            const isSelected =
              value !== undefined && value !== null
                ? String(opt.value) === String(value)
                : Boolean(opt.selected);

            return (
              <option
                key={String(opt.value)}
                value={opt.value}
                selected={isSelected}
                disabled={opt.disabled}
              >
                {opt.label}
              </option>
            );
          })
        : children}
    </select>
  );
}
```

Create `src/ui/forms/checkbox.tsx`:
```typescript
import type { ComponentSize } from "./types";

export interface CheckboxProps {
  name?: string;
  value?: string | number;
  checked?: boolean;
  size?: ComponentSize;
  variant?: "primary" | "secondary" | "accent" | "success" | "error" | "warning" | "info";
  label?: string;
  disabled?: boolean;
  id?: string;
  class?: string;
  [key: string]: any;
}

const checkboxSizes: Record<ComponentSize, string> = {
  xs: "checkbox-xs",
  sm: "checkbox-sm",
  md: "checkbox-md",
  lg: "checkbox-lg",
};

export function Checkbox({
  name,
  value,
  checked,
  size,
  variant = "primary",
  label,
  disabled,
  id,
  class: customClass = "",
  ...props
}: CheckboxProps) {
  const sizeClass = size ? checkboxSizes[size] : "";
  const variantClass = variant ? `checkbox-${variant}` : "checkbox-primary";
  const inputClass = ["checkbox", variantClass, sizeClass, !label ? customClass : ""].filter(Boolean).join(" ");

  const inputEl = (
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      id={id}
      class={inputClass}
      {...props}
    />
  );

  if (!label) {
    return inputEl;
  }

  return (
    <label class={`label cursor-pointer justify-start gap-2 ${customClass}`.trim()}>
      {inputEl}
      <span class="label-text">{label}</span>
    </label>
  );
}
```

Create `src/ui/forms/toggle.tsx`:
```typescript
import type { ComponentSize } from "./types";

export interface ToggleProps {
  name?: string;
  value?: string | number;
  checked?: boolean;
  size?: ComponentSize;
  variant?: "primary" | "secondary" | "accent" | "success" | "error" | "warning" | "info";
  label?: string;
  disabled?: boolean;
  id?: string;
  class?: string;
  [key: string]: any;
}

const toggleSizes: Record<ComponentSize, string> = {
  xs: "toggle-xs",
  sm: "toggle-sm",
  md: "toggle-md",
  lg: "toggle-lg",
};

export function Toggle({
  name,
  value,
  checked,
  size,
  variant = "primary",
  label,
  disabled,
  id,
  class: customClass = "",
  ...props
}: ToggleProps) {
  const sizeClass = size ? toggleSizes[size] : "";
  const variantClass = variant ? `toggle-${variant}` : "toggle-primary";
  const inputClass = ["toggle", variantClass, sizeClass, !label ? customClass : ""].filter(Boolean).join(" ");

  const inputEl = (
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      id={id}
      class={inputClass}
      {...props}
    />
  );

  if (!label) {
    return inputEl;
  }

  return (
    <label class={`label cursor-pointer justify-start gap-2 ${customClass}`.trim()}>
      {inputEl}
      <span class="label-text">{label}</span>
    </label>
  );
}
```

Create `src/ui/forms/form-field.tsx`:
```typescript
export interface FormFieldProps {
  label?: string | any;
  optionalLabel?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  id?: string;
  class?: string;
  children: any;
}

export function FormField({
  label,
  optionalLabel,
  required = false,
  hint,
  error,
  id,
  class: customClass = "",
  children,
}: FormFieldProps) {
  return (
    <div class={`form-control w-full space-y-1.5 ${customClass}`.trim()}>
      {label && (
        <div class="flex items-center justify-between px-0.5">
          <label class="label-text text-xs font-semibold text-base-content/90" for={id}>
            {label} {required && <span class="text-error font-bold">*</span>}
          </label>
          {!required && optionalLabel && (
            <span class="label-text-alt text-2xs text-base-content/50">{optionalLabel}</span>
          )}
        </div>
      )}
      {children}
      {hint && <p class="text-2xs text-base-content/60 px-0.5 text-start">{hint}</p>}
      {error && <p class="text-2xs text-error font-medium px-0.5 text-start">{error}</p>}
    </div>
  );
}
```

Create `src/ui/forms/index.ts`:
```typescript
export * from "./types";
export * from "./button";
export * from "./input";
export * from "./textarea";
export * from "./select";
export * from "./checkbox";
export * from "./toggle";
export * from "./form-field";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/ui/forms/forms.test.ts`
Expected: PASS (All tests passing)

- [ ] **Step 5: Run typecheck**

Run: `bun run check`
Expected: PASS with 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/ui/forms/
git commit -m "feat(ui): implement core form primitives and comprehensive unit tests"
```

---

### Task 2: Migrate Auth Module Views

**Files:**
- Modify: `src/modules/auth/views.tsx`
- Test: `src/modules/auth/permissions.test.ts`

**Interfaces:**
- Consumes: `<FormField>`, `<Input>`, `<Button>` from `src/ui/forms/index.ts`.

- [ ] **Step 1: Replace raw markup in `src/modules/auth/views.tsx`**

Refactor `Field` and action buttons in `src/modules/auth/views.tsx`:
- Import `{ FormField, Input, Button }` from `../../ui/forms`.
- Replace local `Field` with `<FormField>` + `<Input>` or standard `<FormField>` usage.
- Replace `<button class="btn btn-primary w-full shadow-lg">` with `<Button variant="primary" block class="shadow-lg" type="submit">`.
- Replace inline links with `<Button href="..." variant="ghost" size="sm">` or standard styled links.

- [ ] **Step 2: Run tests and typecheck**

Run: `bun test src/modules/auth/`
Run: `bun run check`
Expected: PASS with 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/views.tsx
git commit -m "refactor(auth): migrate auth views to unified form primitives"
```

---

### Task 3: Migrate Dashboard & User Account Views

**Files:**
- Modify: `src/modules/dashboard/account/views.tsx`
- Modify: `src/modules/dashboard/user/views.tsx`
- Modify: `src/ui/dashboard.tsx`

**Interfaces:**
- Consumes: `<FormField>`, `<Input>`, `<Textarea>`, `<Button>` from `src/ui/forms/index.ts`.

- [ ] **Step 1: Refactor `src/modules/dashboard/account/views.tsx`**

- Import `{ FormField, Input, Textarea, Button }` from `../../../ui/forms`.
- In `TelegramConnectionCard`, replace disconnect/connect buttons with `<Button variant="outline" ...>` and `<Button variant="primary" size="sm" ...>`.
- In `AccountPage` form fields (first name, last name, username, email, bio), wrap inputs with `<FormField>` and `<Input>` / `<Textarea>`.
- Replace submit button with `<Button variant="primary" type="submit">`.

- [ ] **Step 2: Refactor `src/modules/dashboard/user/views.tsx`**

- In `RsvpButton`, replace buttons with `<Button size="sm" ...>`.

- [ ] **Step 3: Refactor `src/ui/dashboard.tsx`**

- In `UserProfileDropdown`, replace logout/profile button links with `<Button ...>`.

- [ ] **Step 4: Run tests and typecheck**

Run: `bun test`
Run: `bun run check`
Expected: PASS with 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/account/views.tsx src/modules/dashboard/user/views.tsx src/ui/dashboard.tsx
git commit -m "refactor(dashboard): migrate account and user dashboard views to form primitives"
```

---

### Task 4: Migrate Admin Core, Database, Report & Platforms Views

**Files:**
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/admin/pagination-view.tsx`
- Modify: `src/modules/admin/database-views.tsx`
- Modify: `src/modules/admin/report-views.tsx`
- Modify: `src/modules/admin/platforms-views.tsx`
- Test: `src/modules/admin/platforms.test.ts`, `src/modules/admin/pagination.test.ts`, `src/modules/admin/admin-pagination.test.ts`

**Interfaces:**
- Consumes: `<FormField>`, `<Input>`, `<Select>`, `<Checkbox>`, `<Button>` from `src/ui/forms/index.ts`.

- [ ] **Step 1: Refactor `src/modules/admin/views.tsx`**

- In `CrudTable`: replace search field `<select>` with `<Select size="sm">`, search input with `<Input size="sm">`, search/reset buttons with `<Button size="sm">`, Add New and Bulk Delete with `<Button size="sm">`, bulk checkboxes with `<Checkbox size="sm">`, table sort buttons with `<Button variant="ghost" size="xs">`.
- In `MeetRelations`: replace tag/attendee `<select>` and Add buttons with `<Select size="sm">` and `<Button size="sm">`.
- In delete dialogs: replace buttons with `<Button size="sm">`.

- [ ] **Step 2: Refactor `src/modules/admin/pagination-view.tsx`**

- Replace pagination links/buttons with `<Button size="xs" variant="ghost" ...>`.

- [ ] **Step 3: Refactor `database-views.tsx`, `report-views.tsx`, and `platforms-views.tsx`**

- In `database-views.tsx`: replace Backup Now and Run Migrations buttons with `<Button variant="primary" size="sm">` and `<Button variant="warning" size="sm">`.
- In `report-views.tsx`: replace SchemaTable search `<select>`, `<input>`, and buttons with `<Select size="sm">`, `<Input size="sm">`, and `<Button size="sm">`.
- In `platforms-views.tsx`: replace filter toolbar `<select>`, `<input>`, search/reset buttons, and table checkboxes with `<Select size="sm">`, `<Input size="sm">`, `<Button size="sm">`, and `<Checkbox size="xs">`.

- [ ] **Step 4: Run admin tests and typecheck**

Run: `bun test src/modules/admin/`
Run: `bun run check`
Expected: PASS with 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/views.tsx src/modules/admin/pagination-view.tsx src/modules/admin/database-views.tsx src/modules/admin/report-views.tsx src/modules/admin/platforms-views.tsx
git commit -m "refactor(admin): migrate admin crud, platforms, report, and database views to form primitives"
```

---

### Task 5: Migrate Admin Mail Center & Files Views

**Files:**
- Modify: `src/modules/admin/files/views.tsx`
- Modify: `src/modules/admin/mail-editor-views.tsx`
- Modify: `src/modules/admin/mail-scheduler-views.tsx`
- Modify: `src/modules/admin/mailer-views.tsx`
- Test: `src/modules/mailer/mailer.test.ts`

**Interfaces:**
- Consumes: `<FormField>`, `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`, `<Toggle>`, `<Button>` from `src/ui/forms/index.ts`.

- [ ] **Step 1: Refactor `src/modules/admin/files/views.tsx`**

- Replace search input with `<Input size="sm">`, upload file input with `<Input type="file" size="sm">`, bulk checkboxes with `<Checkbox size="sm">`, modal buttons with `<Button size="sm">`.

- [ ] **Step 2: Refactor `src/modules/admin/mail-editor-views.tsx`**

- Replace format switcher buttons with `<Button size="sm" ...>`.
- Replace title, subject, description inputs with `<FormField>` + `<Input size="sm">`.
- Replace template body textarea with `<Textarea size="sm" rows={12}>`.
- Replace Save button with `<Button variant="primary" type="submit">`.

- [ ] **Step 3: Refactor `src/modules/admin/mail-scheduler-views.tsx`**

- Replace rule status toggle with `<Toggle size="sm">`.
- Replace template `<select>` with `<Select size="xs">`.
- Replace Run Now / Configure buttons with `<Button size="xs">`.

- [ ] **Step 4: Refactor `src/modules/admin/mailer-views.tsx`**

- Replace target mode buttons with `<Button size="xs" ...>`.
- Replace domain, search users, and subject inputs with `<Input size="sm">` / `<Input size="xs">`.
- Replace tag and user checkboxes with `<Checkbox size="xs">`.
- Replace attachment file input with `<Input type="file" size="sm">`.
- Replace Send Broadcast button with `<Button variant="primary" size="md" type="submit">`.

- [ ] **Step 5: Run mailer tests and typecheck**

Run: `bun test src/modules/mailer/`
Run: `bun test src/modules/admin/`
Run: `bun run check`
Expected: PASS with 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/modules/admin/files/views.tsx src/modules/admin/mail-editor-views.tsx src/modules/admin/mail-scheduler-views.tsx src/modules/admin/mailer-views.tsx
git commit -m "refactor(admin): migrate files and mail center views to form primitives"
```

---

### Task 6: Migrate Public Pages & Integrate Complex Form Controls

**Files:**
- Modify: `src/modules/events/views.tsx`
- Modify: `src/modules/landing/views.tsx`
- Modify: `src/modules/landing/support-views.tsx`
- Modify: `src/ui/language-switch.tsx`
- Modify: `src/ui/date-picker.tsx`
- Modify: `src/ui/phone-input.tsx`
- Modify: `src/ui/tag-selector.tsx`
- Test: `src/ui/date-picker.test.ts`, `src/modules/events/events.test.ts`, `src/modules/landing/landing.test.ts`

**Interfaces:**
- Consumes: `<FormField>`, `<Input>`, `<Select>`, `<Button>` from `src/ui/forms/index.ts`.

- [ ] **Step 1: Refactor `src/modules/events/views.tsx`**

- In `DynamicCtaButton`: replace RSVP action button and modal buttons with `<Button ...>`.

- [ ] **Step 2: Refactor `src/modules/landing/views.tsx` and `support-views.tsx`**

- In `Landing`: replace Hero CTA buttons with `<Button href="#meets" variant="primary">` and `<Button href="#how-it-works" variant="ghost">`.
- In `support-views.tsx`: replace action buttons/links with `<Button ...>`.

- [ ] **Step 3: Refactor `src/ui/language-switch.tsx`**

- Replace language switch button links with `<Button size={size} variant={currentLocale === l ? "primary" : "ghost"}>`.

- [ ] **Step 4: Align `src/ui/date-picker.tsx`, `phone-input.tsx`, and `tag-selector.tsx`**

- Standardize inputs and buttons inside `date-picker.tsx`, `phone-input.tsx`, and `tag-selector.tsx` using `<Input>`, `<Select>`, and `<Button>` from `src/ui/forms`.

- [ ] **Step 5: Run full test suite, typecheck, and CSS build**

Run: `bun test`
Run: `bun run check`
Run: `bun run build:css`
Expected: PASS with 0 errors across entire repository

- [ ] **Step 6: Commit**

```bash
git add src/modules/events/views.tsx src/modules/landing/views.tsx src/modules/landing/support-views.tsx src/ui/language-switch.tsx src/ui/date-picker.tsx src/ui/phone-input.tsx src/ui/tag-selector.tsx
git commit -m "refactor(ui): migrate events, landing, and complex UI components to form primitives"
```
