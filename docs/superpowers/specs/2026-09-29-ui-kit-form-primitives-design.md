# Spec: Unified UI Kit - Form Primitives & View Migration

**Date:** 2026-09-29  
**Status:** In Review / Ready for Plan  
**Target:** Standardize and unify all form controls, buttons, inputs, textareas, selects, checkboxes, toggles, date pickers, and form wrappers across the CobraDecision server-rendered JSX + HTMX stack.

---

## 1. Problem Statement & Motivation

### Current Issues:
1. **Scattered & Duplicated Form Markup**: Form controls (`input`, `select`, `button`, `label`, `textarea`) are authored manually across views (`auth`, `admin`, `events`, `dashboard`, `landing`) with inconsistent daisyUI classes (`input-sm`, `input-xs`, `focus:input-primary` missing in some places, varying label margins and font weights).
2. **Inconsistent Error & Label Handling**: Labels and helper/error texts are laid out differently in `auth/views.tsx`, `admin/views.tsx`, `admin/mailer-views.tsx`, and `admin/files/views.tsx`.
3. **Complex Controls Lack Unified Shell**: `DatePicker`, `PhoneInput`, and `TagSelector` have slightly different sizing and wrapper styles than standard inputs.
4. **Maintenance Overhead**: Changing a button style, focus ring, or form layout requires editing dozens of raw HTML tags across multiple domain modules.

### Objectives:
- Provide **zero-runtime-cost, server-side JSX form primitives** in `src/ui/forms/`.
- Ensure **100% native HTML / HTMX / Alpine.js compatibility** via prop forwarding.
- Unify styling using **daisyUI + Tailwind CSS** with support for LTR/RTL and Persian typography (`Vazirmatn`).
- Execute a **systematic, non-breaking migration** across all existing view files.

---

## 2. Complete Inventory of Form Controls to Replace

Below is the full audit of all view files and their current form elements:

| Module / File | Current Raw Elements | Target Component Replacement |
| :--- | :--- | :--- |
| **`src/modules/auth/views.tsx`** | `Field` helper, `<input>`, `<button class="btn btn-primary ...">`, `<altcha-widget>` | `<FormField>`, `<Input>`, `<Button>` |
| **`src/modules/dashboard/account/views.tsx`** | First name, Last name, Username, Email inputs, Bio textarea, Telegram disconnect/connect buttons, Modal close buttons | `<FormField>`, `<Input>`, `<Textarea>`, `<Button>` |
| **`src/modules/admin/views.tsx`** | CRUD Search inputs, field `<select>`, bulk `<input type="checkbox">`, Add New `<button>`, Delete Selected `<button>`, Table sort `<button>`, MeetRelations `<select>` and `<button>` | `<FormField>`, `<Input>`, `<Select>`, `<Checkbox>`, `<Button>` |
| **`src/modules/admin/files/views.tsx`** | Search input, File upload `<input type="file">`, bulk checkboxes, modal dialog buttons, refresh button | `<Input>`, `<Checkbox>`, `<Button>` |
| **`src/modules/admin/mail-editor-views.tsx`** | Title/Subject inputs, Description input, Template body `<textarea>`, Format switch buttons, Save button | `<FormField>`, `<Input>`, `<Textarea>`, `<Button>` |
| **`src/modules/admin/mailer-views.tsx`** | Mode selector buttons/radios, Domain input, Search users input, User/Tag checkboxes, Subject input, Attachment file input, Send broadcast button | `<FormField>`, `<Input>`, `<Checkbox>`, `<Button>` |
| **`src/modules/admin/mail-scheduler-views.tsx`** | Automation rule `<input type="checkbox" class="toggle ...">`, Template `<select>`, Timing inputs, Run Now / Configure buttons | `<Toggle>`, `<Select>`, `<Input>`, `<Button>` |
| **`src/modules/admin/platforms-views.tsx`** | Platform `<select>`, Meet title `<input>`, Filter submit/reset buttons, Table checkboxes, Delete visit buttons | `<FormField>`, `<Select>`, `<Input>`, `<Checkbox>`, `<Button>` |
| **`src/modules/admin/database-views.tsx`** | Backup Now `<button>`, Run Migrations `<button>` | `<Button>` |
| **`src/modules/admin/report-views.tsx`** | Schema field `<select>`, Search schema `<input>`, Filter / Reset buttons | `<FormField>`, `<Select>`, `<Input>`, `<Button>` |
| **`src/modules/events/views.tsx`** | `DynamicCtaButton` RSVP buttons, Attend/Cancel modal buttons | `<Button>` |
| **`src/modules/dashboard/user/views.tsx`** | `RsvpButton` modal attend/leave buttons | `<Button>` |
| **`src/modules/landing/views.tsx` & `support-views.tsx`** | Hero CTA buttons, donation links/buttons | `<Button>` |
| **`src/ui/date-picker.tsx`** | Internal `<input>`, toggle calendar `<button>`, navigation `<button>` | Standardize sizing & props with `<Input>` |
| **`src/ui/phone-input.tsx`** | Country `<select>`, Phone `<input>` | Standardize with `<Select>` and `<Input>` |
| **`src/ui/tag-selector.tsx`** | Tag search `<input>`, remove `<button>`, create tag `<button>` | Standardize with `<Input>`, `<Button>` |

---

## 3. UI Kit Component Architecture & API Specs

All components will reside in `src/ui/forms/` and be re-exported via `src/ui/forms/index.ts` and `src/ui/index.ts` (or direct `src/ui/` imports).

### Common Types:
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
```

### 3.1 `<Button />` (`src/ui/forms/button.tsx`)
A unified button component supporting both `<button>` and `<a>` (link button) rendering, with built-in loading indicator support, icons, and full HTMX attribute forwarding.

```typescript
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  type?: "button" | "submit" | "reset";
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
  circle?: boolean;
  square?: boolean;
  block?: boolean;
  icon?: any; // JSX icon element
  iconRight?: any;
  class?: string;
  children?: any;
  [key: string]: any; // Forward all HTMX (hx-*), Alpine (x-*), and HTML attributes
}
```
**Default styling:** `btn transition-all duration-150` with size map (`btn-xs`, `btn-sm`, `btn-md`, `btn-lg`) and variant map (`btn-primary`, `btn-outline btn-error`, etc.).

---

### 3.2 `<Input />` (`src/ui/forms/input.tsx`)
Standard text/email/password/number/search/file input.

```typescript
export interface InputProps {
  name?: string;
  type?: "text" | "email" | "password" | "number" | "search" | "url" | "tel" | "file" | "hidden";
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
```
**Default styling:** `input input-bordered w-full focus:input-primary focus:outline-none` (or `file-input file-input-bordered` when `type="file"`).

---

### 3.3 `<Textarea />` (`src/ui/forms/textarea.tsx`)
Multi-line text editor input.

```typescript
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
```
**Default styling:** `textarea textarea-bordered w-full focus:textarea-primary focus:outline-none`.

---

### 3.4 `<Select />` (`src/ui/forms/select.tsx`)
Dropdown selection component supporting either typed `options` prop or standard `<option>` children.

```typescript
export interface SelectOption {
  value: string | number;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface SelectProps {
  name?: string;
  size?: ComponentSize;
  options?: SelectOption[];
  placeholder?: string; // Optional empty / unselected first option
  value?: string | number;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  class?: string;
  children?: any;
  [key: string]: any;
}
```
**Default styling:** `select select-bordered w-full focus:select-primary focus:outline-none`.

---

### 3.5 `<Checkbox />` & `<Toggle />` (`src/ui/forms/checkbox.tsx`, `src/ui/forms/toggle.tsx`)
Boolean check and toggle switches.

```typescript
export interface CheckboxProps {
  name?: string;
  value?: string | number;
  checked?: boolean;
  size?: ComponentSize;
  variant?: "primary" | "secondary" | "accent" | "success" | "error" | "warning" | "info";
  label?: string; // If provided, wraps inside a label container
  disabled?: boolean;
  id?: string;
  class?: string;
  [key: string]: any;
}
```
**Default styling:**
- Checkbox: `checkbox checkbox-primary`
- Toggle: `toggle toggle-primary`

---

### 3.6 `<FormField />` (`src/ui/forms/form-field.tsx`)
Unified form control container providing consistent labels, optional/required badges, helper hints, and error validation messages.

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
```
**Rendered Structure:**
```html
<div class="form-control w-full space-y-1.5 [custom-class]">
  <div class="flex items-center justify-between px-0.5">
    <label class="label-text text-xs font-semibold text-base-content/90" for={id}>
      {label} {required && <span class="text-error font-bold">*</span>}
    </label>
    {!required && optionalLabel && (
      <span class="label-text-alt text-2xs text-base-content/50">{optionalLabel}</span>
    )}
  </div>
  {children}
  {hint && <p class="text-2xs text-base-content/60 px-0.5">{hint}</p>}
  {error && <p class="text-2xs text-error font-medium px-0.5">{error}</p>}
</div>
```

---

## 4. Migration Plan & Step-by-Step Roadmap

To make changes isolated, easily verifiable, and safe, the migration is structured into sequential phases:

### Phase 1: Core Primitives Creation & Unit Testing
1. Create `src/ui/forms/button.tsx`, `src/ui/forms/input.tsx`, `src/ui/forms/textarea.tsx`, `src/ui/forms/select.tsx`, `src/ui/forms/checkbox.tsx`, `src/ui/forms/toggle.tsx`, `src/ui/forms/form-field.tsx`.
2. Create `src/ui/forms/index.ts` to export all form components.
3. Add unit tests in `src/ui/forms/forms.test.ts` to verify correct class composition, HTMX prop passthrough, size classes, and HTML output.
4. Run `bun test` and `bun run check`.

### Phase 2: Auth Module Migration
1. Refactor `src/modules/auth/views.tsx` (Sign in, Sign up, OTP, Password Reset, Field component) to use `<FormField>`, `<Input>`, and `<Button>`.
2. Run test suite: `bun test src/modules/auth/` and `bun run check`.

### Phase 3: Dashboard & User Account Migration
1. Refactor `src/modules/dashboard/account/views.tsx` (Profile update form, Telegram connection, Modals).
2. Refactor `src/modules/dashboard/user/views.tsx` (RSVP buttons, Modal triggers).
3. Run `bun test` and `bun run check`.

### Phase 4: Admin Module Migration
1. Refactor `src/modules/admin/views.tsx` (CRUD search filters, field selects, bulk checkboxes, table buttons, relations).
2. Refactor `src/modules/admin/files/views.tsx` (Search, upload file inputs, file checkboxes, action buttons).
3. Refactor `src/modules/admin/mail-editor-views.tsx`, `mail-scheduler-views.tsx`, `mailer-views.tsx`.
4. Refactor `src/modules/admin/platforms-views.tsx`, `database-views.tsx`, `report-views.tsx`.
5. Run full admin tests: `bun test src/modules/admin/`.

### Phase 5: Events, Landing, and UI Integration
1. Refactor `src/modules/events/views.tsx` (`DynamicCtaButton`, RSVP modals).
2. Refactor `src/modules/landing/views.tsx` and `support-views.tsx`.
3. Standardize `src/ui/date-picker.tsx`, `src/ui/phone-input.tsx`, `src/ui/tag-selector.tsx` to align with the new `<FormField>` and input sizing standards.
4. Run `bun run check`, `bun test`, `bun run build:css`.

---

## 5. Architectural Safeguards & Lazy Senior Principles

- **No Over-Abstractions:** Primitives are direct JSX wrappers around semantic HTML elements with typed props. No synthetic state containers, no virtual DOM diffing libraries, zero client JS overhead.
- **Full Attribute Passthrough (`...props`):** HTMX attributes (`hx-post`, `hx-get`, `hx-target`, `hx-swap`, `hx-confirm`, `hx-indicator`), Alpine directives (`x-model`, `x-show`, `x-bind`), and standard HTML properties work without restriction.
- **DaisyUI Standard Class Names:** Relies purely on tailwind/daisyUI CSS classes (`btn`, `input`, `select`, `textarea`, `checkbox`, `toggle`, `form-control`) so zero custom CSS files are needed.
- **RTL & Persian Friendly:** Spacing, padding, and text alignments use logical properties (`start`, `end`, `ms-*`, `me-*`, `ps-*`, `pe-*`) to guarantee seamless English and Persian typography.
