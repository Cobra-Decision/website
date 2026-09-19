# CobraDecision: Admin Pagination, About Us, and Support Us Design Specification

**Date:** 2026-09-19  
**Status:** Validated & Proposed  
**Authors:** Product Manager, Lead UI/UX Designer, Community Manager, System Architect  

---

## 1. Executive Summary & Problem Statement

This specification establishes three core capabilities for the CobraDecision platform:
1. **Admin Management Table Pagination:** Replace unbounded SQL queries across all administrative resource tables (`users`, `meets`, `tags`, `roles`, `endpoints`, and `files`) with a unified, high-performance, server-side pagination system (10 items/page, persistent sort and search queries, HTMX swaps, and accessible daisyUI pagination controls).
2. **About Us Page (`/about`):** A dedicated, bilingual, responsive community manifesto page presenting CobraDecision's mission, vision, core values, weekly formats, tracks, verified metrics, action funnels, and official channels.
3. **Support Us Page (`/support`):** A transparent community crowdfunding and donation gateway featuring the embedded Yavar donation widget (`https://donate.sudoshz.ir/embed/widget.php?slug=cobra-decision&theme=dark&lang=fa`), explaining community-backed infrastructure stewardship via Shiraz LUG and financial accountability.

---

## 2. Admin Management Table Pagination Specification

### 2.1 Functional Requirements
- **Page Size:** Default to `10` items per page across all administrative management views.
- **Resources Covered:**
  - `users` (`/dashboard/admin/users`)
  - `meets` (`/dashboard/admin/meets`)
  - `tags` (`/dashboard/admin/tags`)
  - `roles` (`/dashboard/admin/roles`)
  - `endpoints` (`/dashboard/admin/endpoints`)
  - `files` (`/dashboard/admin/files`)
- **Query Parameter Handling:**
  - Accept `page` (integer >= 1, defaults to 1) and `limit` (integer, defaults to 10).
  - Preserve active search (`q`), search column (`search_field`), sort column (`sort`), and sort direction (`direction`) across all page changes.
- **HTMX Swapping:**
  - Page links and navigation buttons trigger `hx-get` targeting the resource table container (`#${resource}-table` or `#files-table`) with `hx-swap="outerHTML"`.
- **Display Elements:**
  - Status summary text: *"Showing X to Y of Z entries"* (e.g., *"نمایش ۱ تا ۱۰ از ۳۹ مورد"* / *"Showing 1 to 10 of 39 items"*).
  - daisyUI `join` button group with Previous, Next, first page, last page, and adjacent page numbers with active state styling.

### 2.2 Server-Side Pagination Architecture

#### Database Queries (`src/modules/admin/routes.tsx`)
1. **Total Count Query:** Compute total matching records via `COUNT(*)` with the same `deleted_at IS NULL` and search filter criteria (`CAST(field AS TEXT) LIKE ?`).
2. **Paged Rows Query:** Append `LIMIT ? OFFSET ?` to the existing query builder, computing `offset = (page - 1) * limit`.

#### File Management Pagination (`src/modules/admin/files/routes.tsx`)
1. Scan storage files, apply search filter and sort.
2. Calculate total matching files.
3. Slice array using `files.slice(offset, offset + limit)`.

### 2.3 UI Pagination Component Interface (`src/modules/admin/views.tsx`)
```tsx
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  resource: string;
  query: Record<string, string>;
  locale?: Locale;
}
```

---

## 3. About Us Page Specification (`/about`)

### 3.1 Routing & Layout
- **Route:** `GET /about` registered in `src/modules/landing/routes.tsx`.
- **SEO & Schema.org:**
  - Title: `About Cobra Decision | درباره تصمیم کبرا`
  - Meta Description: `Cobra Decision is a weekly online tech community for open developer discussions and deep-dive technical talks. فضایی برای گفتگوهای تخصصی کامپیوتر و مهندسی نرم‌افزار.`
  - Structured Data (JSON-LD): `Organization` entity with official links (`sameAs`), logo, and bilingual description.
- **Direction & Typography:** Automatic RTL/LTR switching via `Document` layout, `Vazirmatn` font for Persian, and logical spacing (`ps-*`, `pe-*`, `ms-*`, `me-*`).

### 3.2 Page Sections & Content Architecture

1. **Hero & Manifesto:**
   - Badge quote: *"A place for better conversations. Make room for ideas that matter."* / *"فضایی برای گفتگوهای هدفمند و سازنده؛ جایی برای ایده‌هایی که اهمیت دارند."*
   - Heading & Subtitle localized to active locale.
   - Quick CTAs: *"Explore Meets"* (`/#meets`) and *"Get Involved"* (`#get-involved`).

2. **Overview (معرفی کلی):**
   - Clean 2-column or localized overview highlighting independent, non-commercial developer roundtables, practical real-world problem solving, and specialized technical presentations.

3. **Mission, Vision & Core Values:**
   - **Mission:** Cultivate a calm, focused, and open environment for technical knowledge sharing, continuous learning, and collaborative problem-solving.
   - **Vision:** To be the reference peer-to-peer technical hub where passionate engineers turn good conversations into impactful software and career growth.
   - **Core Values (3 Cards):**
     - *Learn in Public (یادگیری در جمع و شفافیت)*
     - *Depth over Hype (عمق در برابر ترندهای زودگذر)*
     - *Constructive Dialogue (فرهنگ تعامل سازنده)*

4. **Weekly Session Formats (فرمت جلسات هفتگی):**
   - **Weekly Community Roundtables:** Open discussion on weekly bugs, engineering culture, career/soft skills, and group problem-solving.
   - **Specialized Deep-Dive Talks:** 45–60 min technical presentations, architecture breakdowns, live demos, slides, and recordings.

5. **Key Tracks & Topic Domains (حوزه‌های موضوعی):**
   - Architecture & Backend
   - AI, ML & Data Science
   - DevOps, Cloud & Infrastructure
   - Software Craftsmanship & QA
   - Soft Skills & Engineering Life

6. **Verified Impact & Live Metrics:**
   - 38+ Hours of shared learning
   - 39+ Featured Meets & panels
   - 100% Community-Driven
   - Bilingual Platform (Persian & English)

7. **Conversion Action Hub & Community Directory:**
   - Join Next Meet (Telegram Bot `@CobraDecisionBot`)
   - Propose a Talk (`mailto:cobradecisionteam@gmail.com`)
   - Support Community (Link to `/support`)
   - Verified links: Telegram, LinkedIn, GitHub, YouTube, Yavar.

---

## 4. Support Us Page Specification (`/support`)

### 4.1 Routing & Layout
- **Route:** `GET /support` (with redirect `/donate` -> `/support`) in `src/modules/landing/routes.tsx`.
- **Title:** `Support Cobra Decision | حمایت از تصمیم کبرا`
- **SEO Meta Description:** `Support the CobraDecision tech community. Transparent funding for developer roundtables, deep-dive talks, and community infrastructure via Shiraz LUG & Yavar.`

### 4.2 Page Sections & Visual Elements

1. **Hero & Community Stewardship:**
   - Badge: *"100% Non-Profit & Community-Driven"*
   - Heading: *"Keeping Technical Knowledge Open & Independent"*
   - Subtitle explaining zero advertisements, zero paywalls, and community-funded operations.

2. **Embedded Yavar Donation Gateway:**
   - Responsive, dark-themed, centered iframe container:
     ```html
     <div style="display:flex;justify-content:center;width:100%">
       <iframe
         src="https://donate.sudoshz.ir/embed/widget.php?slug=cobra-decision&theme=dark&lang=fa"
         title="حمایت با یاور"
         loading="lazy"
         referrerpolicy="strict-origin-when-cross-origin"
         style="width:100%;max-width:420px;height:280px;border:0;border-radius:16px;overflow:hidden;display:block;margin:0 auto"
         sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox">
       </iframe>
     </div>
     ```
   - Fallback action button linking directly to `https://donate.sudoshz.ir/u/cobra-decision`.

3. **Transparent Fund Allocation:**
   - Breakdown cards:
     - 50% High-performance Server & Edge Hosting (VPS, SQLite backups, transactional mailer, DNS)
     - 30% Session Recording Archive & Storage
     - 15% Domain, SSL, Automation & Bot Tooling
     - 5% Contributor & Speaker Recognition

4. **Partnership & Financial Governance Context:**
   - Clear description of financial escrow under the **Shiraz Linux Users Group (Shiraz LUG)** via the **Yavar** platform.

5. **Non-Financial Contribution Alternatives:**
   - Propose a talk or panel topic.
   - Contribute code & documentation on GitHub.
   - Share and invite fellow engineers.

6. **Frequently Asked Questions (FAQ Accordion):**
   - How funds are audited and allocated.
   - Non-monetary participation options.
   - Open source and data governance commitments.

---

## 5. Navigation & Header/Footer Integration

### 5.1 Landing Header Navbar (`src/modules/landing/views.tsx`)
- Add navigation links:
  - `How It Works` (`#how-it-works`)
  - `Meets` (`#meets`)
  - `About Us` (`/about`)
  - `Support Us` (`/support`)
  - `Contact` (`#contact`)

### 5.2 Landing Footer (`src/modules/landing/views.tsx`)
- Add direct navigation links to `/about` and `/support` in the footer link group.

---

## 6. Testing & Quality Assurance Plan

1. **Admin Pagination Unit & Integration Tests (`src/modules/admin/pagination.test.ts`):**
   - Verify pagination parameters extraction (default page 1, limit 10).
   - Verify SQL offset calculation and boundary handling (page < 1, page > totalPages).
   - Test search and sort query parameter preservation across page link generation.
   - Verify file listing pagination slice in `/dashboard/admin/files`.
2. **Landing Routes Test (`src/modules/landing/landing.test.ts`):**
   - Verify `GET /about` returns HTTP 200 with HTML, meta tags, and bilingual content.
   - Verify `GET /support` returns HTTP 200 with HTML and contains the Yavar iframe widget.
   - Verify `GET /donate` redirects (302) to `/support`.
3. **Typecheck & Linting:**
   - Run `bun run check` and `bun test`.
