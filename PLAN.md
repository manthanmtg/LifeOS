# Life OS — Master Implementation Plan

> **Version:** 3.4 | **Status:** In Development | **Date:** March 2026

---

## Executive Summary

Life OS is a high-fidelity, open-source template framework. It acts as a **"Shell"** that dynamically renders a professional portfolio and a private life-management dashboard. The application is designed as a **single-tenant, self-deployable system** with a strict **Separation of Concerns (SoC)**. It features a bidirectional link between the Admin Portal and individual modules, allowing modules to provide their own administrative sub-interfaces (`AdminView`) within a secure, themeable, and highly responsive shell.

---

## Goals & Objectives

| # | Goal | Description |
|---|------|-------------|
| 1 | **Modular Extensibility** | Add or remove life-management "micro-apps" (modules) within minutes without affecting the core shell. |
| 2 | **Deep Admin Integration** | The Admin Portal acts as a "Directory," linking directly to isolated management views (`AdminView`) for each module. |
| 3 | **Streamlined Data Architecture** | Utilize a high-performance polymorphic MongoDB schema for zero-config module expansion and global search. |
| 4 | **Data Autonomy & Analytics** | Track all site metrics internally (MongoDB) to avoid third-party scripts, with full data export/import for true data ownership. |
| 5 | **Top-Notch UX & Theming** | Provide designer-grade developer themes (One Dark, Dracula, etc.), Glassmorphism effects, and iPad-first responsiveness. |
| 6 | **Dynamic Visibility** | A "Simple Switch" to toggle any module between public and private states. |

---

## User Personas

### The Owner (Admin)
The **sole user/developer**. Needs a central hub to manage every aspect of the "Life OS," log daily data efficiently, and curate a professional brand. Interacts with the Admin Portal (`/admin`), command palette, editors, and ledgers.

### The Visitor
Interacts only with **finalized public views**, expecting a high-performance, polished portfolio with rich SEO/Social sharing previews. Never sees private modules, admin UI, or raw data.

---

## Deployment & Extension Workflow

1. **Turnkey Deployment:** User clicks "Deploy to Netlify" → inputs `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET` → app goes live.
2. **Auto-Seeding:** On first run, `ensureSystemConfig()` initializes the `system` collection with default config and module registry.
3. **Extend:** Create `src/modules/[new-module]/AdminView.tsx` → define its Zod schema → register it in `src/registry.ts` → the system automatically saves data into the `content` collection using the new `module_type`. **Zero database setup.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack), Tailwind CSS v4, Framer Motion |
| Database | MongoDB Atlas (3 collections: `system`, `content`, `metrics`) |
| Validation | Zod v4 (strict schema validation on API layer before insertion) |
| Auth | `ADMIN_PASSWORD` env var → JWT via `jose` (edge-compatible), stored as HTTP-only cookie (`lifeos_token`) |
| Media Storage | Netlify Blob or AWS S3 (blog covers, portfolio assets — avoids MongoDB 16MB limit) |
| Package Manager | pnpm |
| Deployment | Netlify (one-click "Deploy to Netlify" button) |

## Database Schema

### Collection 1: `system` (single document)
```json
{
  "_id": "global",
  "site_title": "Life OS",
  "active_theme": "one-dark",
  "bio": "...",
  "moduleRegistry": {
    "portfolio": { "enabled": true, "isPublic": true },
    "blog": { "enabled": true, "isPublic": true },
    "expenses": { "enabled": true, "isPublic": false }
  }
}
```

### Collection 2: `content` (polymorphic, all module data)
```json
{
  "_id": "ObjectId",
  "module_type": "expense" | "blog_post" | "portfolio_profile" | "book" | "subscription" | "snippet" | "habit" | "idea" | "reading_item",
  "is_public": false,
  "created_at": "ISO-Date",
  "updated_at": "ISO-Date",
  "payload": { /* validated by Zod per module_type */ }
}
```
**Indexes:** `module_type` (primary filter), `is_public`, `created_at` (sort), compound `{ module_type, is_public }`.

### Collection 3: `metrics` (time-series analytics)
```json
{
  "_id": "ObjectId",
  "path": "/admin/expenses",
  "referrer": "https://google.com",
  "device_type": "mobile" | "tablet" | "desktop" | "unknown",
  "timestamp": "ISO-Date"
}
```

## Module Contract (SoC)

Every module folder `src/modules/[name]/` MUST export:
- **`View.tsx`** — Primary content display (public or private)
- **`Widget.tsx`** — Bento-grid summary card for Admin Dashboard
- **`AdminView.tsx`** — Management interface (editor, ledger, etc.)
- **`config.ts`** — Default visibility, icon, Zod schema, allowed admin actions

## Routing Strategy

- **Public:** `app/page.tsx` (portfolio landing), `app/blog/[slug]/page.tsx`
- **Admin:** `app/admin/page.tsx` (dashboard with Widget grid), `app/admin/[module]/page.tsx` (catch-all → dynamic `AdminView` render from registry)
- **API:** `app/api/content/route.ts` (GET/POST), `app/api/content/[id]/route.ts` (GET/PUT/DELETE), `app/api/system/route.ts` (GET/PUT)

---

## Phase 1: Infrastructure & Core Shell ✅

**Goal:** Establish the foundational architecture, database connections, and security.

- [x] Initialize Next.js 16 (App Router) with TypeScript, Tailwind CSS v4, pnpm
- [x] Install deps: `mongodb`, `zod`, `jose`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`, `next-themes`
- [x] MongoDB connection singleton (`src/lib/mongodb.ts`) with HMR-safe `globalThis` caching
- [x] TypeScript types for all 3 collections (`src/lib/types.ts`)
- [x] Zod schema registry with `ExpenseSchema`, `BlogPostSchema`, `PortfolioProfileSchema` (`src/lib/schemas.ts`)
- [x] First-run seed utility (`src/lib/seed.ts`) — auto-creates `system.global` document
- [x] JWT auth via `jose` (`src/lib/auth.ts`) — `signToken()` / `verifyToken()`, 7-day expiry
- [x] Login API (`POST /api/auth/login`) — validates against `ADMIN_PASSWORD` env var, sets HTTP-only cookie
- [x] Next.js 16 proxy (`src/proxy.ts`) — protects `/admin/*`, `/api/system/*`, mutating `/api/content/*`
- [x] Polymorphic content API (`/api/content`) — GET with query filters, POST with Zod validation
- [x] Single-item API (`/api/content/[id]`) — GET, PUT (re-validates payload), DELETE
- [x] System config API (`/api/system`) — GET/PUT for global config
- [x] Login page (`src/app/login/page.tsx`) — dark themed, password input, redirect on success
- [x] Public landing page (`src/app/page.tsx`) — hero section placeholder
- [x] Admin layout (`src/app/admin/layout.tsx`) — sidebar + main content area
- [x] Admin sidebar (`src/components/shell/AdminSidebar.tsx`) — registry-driven nav, active state, logout
- [x] Admin dashboard (`src/app/admin/page.tsx`) — placeholder widget grid
- [x] Dynamic module routing (`src/app/admin/[module]/page.tsx`) — reads param, renders `AdminView` or 404
- [x] Module registry (`src/registry.ts`) — maps slug → name, icon, defaultPublic
- [x] Template module (`src/modules/_template/AdminView.tsx`) — fallback placeholder
- [x] `cn()` utility (`src/lib/utils.ts`) — `clsx` + `tailwind-merge`

**Verified:** Build passes, seed runs, login (correct/wrong), full CRUD, Zod rejection, system config API.

---

## Phase 2: UX, Theming & The Command Center

**Goal:** Build the visual identity, global navigation, and the core admin logic.

### 2.1 — Universal Theme Engine
- [ ] Define CSS custom properties (HSL-based) for each theme in `src/app/globals.css`
- [ ] Themes to implement:
  - **One Dark** (default) — dark editor-inspired palette
  - **Dracula** — purple-accented dark theme
  - **Studio Dark** — neutral minimalist dark
  - **Nordic Light** — soft light theme with blue accents
  - **Cyberpunk** — neon greens/pinks on black
  - **Midnight One** — deep blue dark theme
  - **Vampire** — deep red/maroon dark theme
- [ ] Each theme defines: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`, `--border`, `--glass-bg`, `--glass-border`
- [ ] Integrate `next-themes` for theme switching (class-based, `<html data-theme="...">`)
- [ ] Persist selected theme to `system.active_theme` via `/api/system` PUT
- [ ] Apply theme on load from system config server-side in root layout
- [ ] Glassmorphism utilities: `.glass-card` class with `backdrop-blur`, translucent bg, subtle border

### 2.2 — Responsive Shell Layout
- [ ] **Desktop (≥1024px):** Persistent left sidebar (current `AdminSidebar`), multi-column content grid
- [ ] **Tablet/iPad (768–1023px):** Collapsible sidebar (hamburger toggle), dual-column Bento layout, 44px minimum touch targets
- [ ] **Mobile (<768px):** Bottom-docked navigation bar (5 primary actions), single column, full-width cards
- [ ] Public header (`src/components/shell/PublicHeader.tsx`): Logo/site title + nav links dynamically filtered by `isPublic` modules from system config
- [ ] Public footer (`src/components/shell/PublicFooter.tsx`): Social links from portfolio profile, copyright
- [ ] Mobile hamburger menu with slide-in drawer animation (Framer Motion)
- [ ] Admin header (`src/components/shell/AdminHeader.tsx`): Breadcrumb trail, user greeting, quick actions

### 2.3 — Command Palette (Ctrl+K)
- [ ] Create `src/components/ui/CommandPalette.tsx`
- [ ] Global keyboard shortcut: `Ctrl+K` (or `Cmd+K` on Mac)
- [ ] Overlay modal with search input, blurred backdrop
- [ ] Search sources:
  - Module navigation ("Go to Expenses", "Go to Blog")
  - Quick actions ("Add Expense", "New Blog Post", "Toggle Theme")
  - Content search (queries `content` collection by payload text fields)
- [ ] Fuzzy matching on search input
- [ ] Keyboard navigation: Arrow keys to select, Enter to execute, Escape to close
- [ ] Framer Motion entrance/exit animations

### 2.4 — Admin Portal Base (Module 6)
- [ ] **Visibility Manager** (`src/modules/admin/AdminView.tsx`):
  - List all modules from registry with toggle switches
  - Toggle sets `moduleRegistry[module].isPublic` via `/api/system` PUT
  - Dynamically updates the public navigation bar in real-time
  - Toggle sets `moduleRegistry[module].enabled` to show/hide from admin sidebar
- [ ] **Theme Gallery**:
  - Visual preview cards for each theme (color swatches + name)
  - One-click apply → updates `system.active_theme` + applies immediately
  - Currently active theme highlighted with accent border
- [ ] Register `admin` module in `src/registry.ts`

### 2.5 — Framer Motion Layout Transitions
- [ ] Wrap page content in `<AnimatePresence>` for route transitions
- [ ] "Layout Morphing" — shared layout animations between page changes (zero-flicker)
- [ ] Card hover micro-interactions: subtle scale, shadow lift
- [ ] Sidebar link transitions: smooth active indicator slide

---

## Phase 3: Identity & Finance Modules

**Goal:** Deploy the public face and the most critical daily-use private module.

### 3.1 — Module 0: Portfolio (Public Hub)
- [ ] `src/modules/portfolio/View.tsx` — The public-facing portfolio page
  - **Hero Section:** Full-width gradient hero with `hero_title`, `sub_headline`, animated typing effect
  - **Bio Section:** Rich text bio with profile picture (from S3/Blob)
  - **Skills Grid:** Tag cloud or grid of skill badges, categorized
  - **Social Links:** Icon buttons linking to GitHub, LinkedIn, Twitter, etc. (from `SocialLinkSchema`)
  - **"Available for Hire" badge:** Conditional green indicator when `available_for_hire: true`
- [ ] `src/modules/portfolio/AdminView.tsx` — Portfolio editor form
  - Edit all `PortfolioProfileSchema` fields
  - Live preview panel (side-by-side on desktop)
  - Image upload for profile photo → S3/Blob storage
  - Zod validation on save
- [ ] `src/modules/portfolio/Widget.tsx` — Dashboard widget showing profile summary
- [ ] `src/modules/portfolio/config.ts` — `{ defaultPublic: true, icon: "User", schema: PortfolioProfileSchema }`
- [ ] **SEO / OG Image Generation:**
  - Dynamic Open Graph image via `next/og` (ImageResponse API)
  - Route: `app/api/og/route.tsx` — generates a 1200×630 image with name, title, skills
  - `<meta property="og:image">` in portfolio page metadata
  - Twitter Card support (`twitter:card`, `twitter:image`)

### 3.2 — Module 3: Financial Stack
#### 3.2.1 — Expense Tracker
- [ ] `src/modules/expenses/AdminView.tsx` — The expense ledger
  - **Quick-add form:** Amount, description, category (dropdown), date picker, recurring toggle
  - **"Smart Suggestions":** As user types description, suggest past descriptions + auto-fill category from history (query `content` where `module_type: "expense"`, match `payload.description`)
  - **Expense list:** Sortable, filterable table/cards with edit/delete actions
  - **Category filter:** Pill buttons for each category
  - **Date range filter:** "This month", "Last 30 days", "Custom range"
- [ ] `src/modules/expenses/Widget.tsx` — Dashboard widget
  - Total spent this month (large number)
  - Sparkline trend (last 6 months)
  - Top spending category badge
- [ ] **Interactive SVG Charts** (`src/modules/expenses/components/`):
  - Monthly spending bar chart (last 12 months)
  - Category breakdown donut/pie chart
  - Daily spending line chart for current month
  - Use lightweight charting (e.g., `recharts` or hand-rolled SVG)
- [ ] Zod schema: `ExpenseSchema` (already defined in `schemas.ts`)

#### 3.2.2 — Subscription Manager
- [ ] Add `SubscriptionSchema` to `src/lib/schemas.ts`:
  ```
  name, cost, currency, billing_cycle ("monthly"|"yearly"|"weekly"),
  next_renewal_date, category, url, is_active, notes
  ```
- [ ] `src/modules/subscriptions/AdminView.tsx`:
  - Card grid of active subscriptions
  - Renewal date countdown badge (e.g., "Renews in 5 days")
  - Color-coded urgency (red <3 days, yellow <7 days, green >7 days)
  - "Total Monthly Burn" calculation at top (annuals divided by 12)
  - Add/edit/cancel subscription forms
- [ ] `src/modules/subscriptions/Widget.tsx`:
  - Total Monthly Burn number
  - Next upcoming renewal with date
- [ ] Register `subscriptions` in `src/registry.ts`

### 3.3 — Bento Grid Dashboard
- [ ] Refactor `src/app/admin/page.tsx` to render actual `Widget` components from all registered modules
- [ ] Responsive Bento layout: varied card sizes (1×1, 2×1, 1×2) based on module importance
- [ ] Glassmorphism card styling with theme-aware colors

---

## Phase 4: Content & Knowledge Management

**Goal:** Implement complex text editing and media handling.

### 4.1 — Module 1: Blog
- [ ] Add `blog` to `src/registry.ts`
- [ ] `src/modules/blog/AdminView.tsx` — Blog editor
  - **Markdown editor:** Full-featured with toolbar (bold, italic, headings, code, link, image)
  - **Dual-pane live preview:** Editor left, rendered Markdown right (desktop); tabbed on mobile
  - **Draft/Publish toggle:** `status` field cycles `draft → published → archived`
  - **Slug auto-generation:** From title, editable, validated by regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`
  - **Tags input:** Comma-separated or tag chips with autocomplete from existing tags
  - **Cover image upload:** File picker → upload to S3/Blob → store URL in `cover_image_url`
  - **SEO description:** Character-counted textarea (max 160)
  - **Reading time estimation:** Auto-calculated from content length (~200 WPM)
  - **Syntax highlighting in preview:** Use a library like `react-syntax-highlighter` or `shiki`
- [ ] `src/modules/blog/View.tsx` — Public blog listing
  - Grid/list of published posts with cover image, title, excerpt, date, tags, reading time
  - Tag-based filtering sidebar/pills
  - Pagination or infinite scroll
- [ ] `app/blog/[slug]/page.tsx` — Individual blog post page
  - Full Markdown rendering with syntax highlighting
  - Table of contents (auto-generated from headings)
  - Share buttons, reading time badge
  - OG metadata per post (title, description, cover image)
- [ ] `src/modules/blog/Widget.tsx` — Latest 3 posts summary, draft count

### 4.2 — Module 2: Knowledge & Reading
#### 4.2.1 — Reading Todo Queue
- [ ] Add `ReadingItemSchema` to `src/lib/schemas.ts`:
  ```
  url, title (auto-scraped), source_domain (auto-extracted),
  priority ("high"|"medium"|"low"), type ("article"|"paper"|"video"|"podcast"),
  is_read, added_at, read_at, notes
  ```
- [ ] `src/modules/reading/AdminView.tsx`:
  - **Fast-entry:** Paste URL → auto-scrape title and domain via `api/scrape` proxy endpoint
  - Priority level selector (color-coded: red/yellow/green)
  - Filterable by priority, type, read/unread
  - **Swipe to delete** on mobile (touch gesture)
  - Mark as read → moves to archive section
  - "Reader Mode" — clean text extraction for articles

#### 4.2.2 — Bookshelf
- [ ] Add `BookSchema` to `src/lib/schemas.ts`:
  ```
  title, author, isbn, cover_url,
  status ("want_to_read"|"reading"|"completed"|"abandoned"),
  total_pages, current_page, rating (1-5),
  started_at, finished_at,
  summary (Markdown), notes (Markdown), tags
  ```
- [ ] `src/modules/bookshelf/AdminView.tsx`:
  - Book cards with cover image, progress bar (`current_page / total_pages`)
  - Status filter tabs (Want to Read / Reading / Completed)
  - Star rating input
  - Expandable Markdown notes/summary per book
  - Add book form with optional ISBN lookup
- [ ] `src/modules/bookshelf/Widget.tsx`: Currently reading + progress, books completed this year

### 4.3 — Module 5: Idea Dump (Second Brain)
- [ ] Add `IdeaSchema` to `src/lib/schemas.ts`:
  ```
  title, description (Markdown), category,
  status ("raw"|"exploring"|"in_progress"|"promoted"|"archived"),
  tags, priority, promoted_to_portfolio (boolean), promoted_at
  ```
- [ ] `src/modules/ideas/AdminView.tsx`:
  - Kanban-style board or card grid organized by status
  - Quick-add floating action button
  - Rich Markdown description editor
  - **"Promote to Portfolio" toggle:** Sets `promoted_to_portfolio: true`, changes status to `"promoted"`, creates/links a public portfolio project card
- [ ] `src/modules/ideas/Widget.tsx`: Count of raw ideas, recently promoted

### 4.4 — Media Storage Integration
- [ ] Set up S3/Netlify Blob client utility (`src/lib/storage.ts`)
- [ ] Upload API route (`app/api/upload/route.ts`): Accept file, upload to storage, return URL
- [ ] File size limits, type validation (images only: jpg, png, webp, gif)
- [ ] Image optimization/resizing before upload (optional, via `sharp`)

---

## Phase 5: Productivity & Analytics

**Goal:** Finalize the module suite and add self-hosted tracking.

### 5.1 — Module 4: Personal Productivity
#### 5.1.1 — Snippet Box
- [ ] Add `SnippetSchema` to `src/lib/schemas.ts`:
  ```
  title, code, language, description, tags, is_favorite
  ```
- [ ] `src/modules/snippets/AdminView.tsx`:
  - Card/list view of snippets with syntax-highlighted preview
  - **One-click copy** button with visual feedback ("Copied!" toast)
  - Language filter dropdown
  - Syntax highlighting matches the active theme colors
  - Full-screen code editor for editing (Monaco-style or CodeMirror)
  - Tag-based organization and search
- [ ] `src/modules/snippets/Widget.tsx`: Total snippet count, recently added

#### 5.1.2 — Habit Tracker
- [ ] Add `HabitSchema` to `src/lib/schemas.ts`:
  ```
  name, description, frequency ("daily"|"weekly"),
  target_count, color,
  completions: [{ date: "YYYY-MM-DD", count: number }]
  ```
- [ ] `src/modules/habits/AdminView.tsx`:
  - **GitHub-style heatmap calendar** (365-day contribution grid)
  - Each habit gets its own heatmap row
  - Click on a date cell to log completion (toggle)
  - **Visual/haptic feedback** on completion: confetti animation, green pulse, vibration API on mobile
  - Streak counter (current streak, longest streak)
  - Weekly/monthly summary stats
- [ ] `src/modules/habits/Widget.tsx`: Active habits count, current streaks, today's completion status

### 5.2 — Module 7: Analytics Engine
- [ ] **Tracking proxy** (`src/proxy.ts` enhancement):
  - On every request, log to `metrics` collection: path, referrer, device type (parsed from User-Agent), timestamp
  - Only track page views (exclude API routes, static assets)
  - Debounce: don't log same IP+path within 30 seconds
- [ ] `src/modules/analytics/AdminView.tsx`:
  - **Page views per module:** Bar chart showing views by path prefix
  - **Visitor device breakdown:** Donut chart (mobile/tablet/desktop)
  - **Admin usage patterns:** Which admin pages are visited most
  - **Referrer sources:** Top referrers list
  - **Time-series view:** Daily/weekly/monthly page view trends (sparklines)
  - Date range selector
- [ ] `src/modules/analytics/Widget.tsx`: Total views today, trend arrow (up/down vs yesterday)
- [ ] **Background aggregation cron:**
  - API route or Netlify scheduled function: `app/api/cron/aggregate/route.ts`
  - Runs daily, aggregates raw `metrics` events into daily summaries
  - Prevents database bloat over time
  - Aggregated format: `{ date, path, view_count, unique_visitors, device_breakdown }`

### 5.3 — Data Export/Import (Admin Portal Enhancement)
- [ ] **Export** (`app/api/export/route.ts`):
  - Authenticated endpoint, admin only
  - Queries all 3 collections (`system`, `content`, `metrics`)
  - Returns as downloadable JSON file (all data) or CSV (content collection only)
  - Filename: `lifeos-backup-YYYY-MM-DD.json`
- [ ] **Import** (`app/api/import/route.ts`):
  - "Restore from Backup" utility in Admin Portal
  - Upload previously exported JSON file
  - Validates structure, warns about data overwrite
  - Confirmation modal before executing
  - Replaces `system` doc, bulk-inserts `content` docs (with option to merge vs replace)
- [ ] UI in Admin Portal settings: Export button (with format selector), Import file upload zone

---

## Phase 6: Testing, Polish & Deployment

**Goal:** Achieve the "3-Minute Turnkey" deployment standard and launch.

### 6.1 — Responsive Audit
- [ ] Test all pages on 3 viewports: iPhone 14 (390px), iPad Air (820px), Desktop (1440px)
- [ ] Verify 44px minimum touch targets on all interactive elements (buttons, toggles, links) for tablet
- [ ] Verify bottom-docked mobile navigation works correctly
- [ ] Verify swipe gestures (reading queue delete) on touch devices
- [ ] Cross-browser testing: Chrome, Firefox, Safari, Edge

### 6.2 — Performance Optimization
- [ ] Lazy-load module AdminViews via dynamic imports (already implemented)
- [ ] Image optimization: `next/image` for all displayed images
- [ ] Bundle analysis: ensure no unnecessarily large dependencies
- [ ] MongoDB connection pooling verification under load
- [ ] Lighthouse audit: target >90 on Performance, Accessibility, Best Practices, SEO

### 6.3 — Auto-Seeding & First-Run Experience
- [ ] Test `ensureSystemConfig()` on a completely fresh MongoDB database
- [ ] Verify all collections are created with proper indexes on first run
- [ ] First-run onboarding flow: if no portfolio profile exists, redirect admin to portfolio setup wizard
- [ ] Verify `.env.local.example` documents all required environment variables

### 6.4 — Deployment Pipeline
- [ ] Create `netlify.toml` with build configuration:
  ```toml
  [build]
    command = "pnpm run build"
    publish = ".next"
  ```
- [ ] One-click "Deploy to Netlify" button in README
  - Pre-fills required env vars: `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET`
- [ ] Document MongoDB Atlas free-cluster setup (step-by-step with screenshots)
- [ ] Test full deployment flow: fork → deploy → set env vars → visit URL → login → seed runs

### 6.5 — Documentation & README
- [ ] Comprehensive README.md:
  - Project overview, screenshots/GIF demo
  - Quick start (local dev): clone, `pnpm install`, set `.env.local`, `pnpm dev`
  - Deploy to Netlify guide
  - "Add a new module in 30 minutes" developer guide
  - Architecture diagram (Mermaid)
  - Theme gallery preview images
- [ ] CONTRIBUTING.md with module development conventions
- [ ] LICENSE (already exists)

---

## UX & Design Requirements (Cross-Cutting)

These requirements apply across ALL phases and modules:

### Glassmorphism
- Blurred translucent cards (`backdrop-blur-xl`, `bg-white/5`, `border border-white/10`)
- Applied to: cards, modals, command palette, sidebar, navigation overlays

### Framer Motion Animations
- **Route transitions:** `<AnimatePresence>` with fade + slide
- **Card hover:** `whileHover={{ scale: 1.02, y: -2 }}` with shadow elevation
- **Layout morphing:** `layoutId` for shared element transitions between pages
- **Micro-interactions:** Button press scale, toggle slide, toast slide-in, skeleton loading pulses

### Context-Aware UI
- **"Zen Mode":** Keyboard shortcut (`Ctrl+Shift+Z`) dims all UI except the active editor/content area — reduces visual noise for deep work
- **Adaptive styling:** Cards, backgrounds, and accents automatically adapt to the selected dev-theme via CSS custom properties

### Typography
- Primary font: **Inter** (via `next/font/google`, already configured)
- Monospace (code): **JetBrains Mono** or **Fira Code**
- Scale: consistent `text-sm` / `text-base` / `text-lg` / `text-xl` / `text-3xl` usage

---

## Zod Schema Registry (Appendix)

All schemas live in `src/lib/schemas.ts`. The `SchemaRegistry` object maps `module_type` strings to their Zod schemas:

| `module_type` | Schema | Status |
|----------------|--------|--------|
| `portfolio_profile` | `PortfolioProfileSchema` | ✅ Defined |
| `expense` | `ExpenseSchema` | ✅ Defined |
| `blog_post` | `BlogPostSchema` | ✅ Defined |
| `subscription` | `SubscriptionSchema` | ⬜ Phase 3 |
| `reading_item` | `ReadingItemSchema` | ⬜ Phase 4 |
| `book` | `BookSchema` | ⬜ Phase 4 |
| `idea` | `IdeaSchema` | ⬜ Phase 4 |
| `snippet` | `SnippetSchema` | ⬜ Phase 5 |
| `habit` | `HabitSchema` | ⬜ Phase 5 |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Setup Speed | Fork → live URL in < 3 minutes |
| Developer Velocity | New module integrated in < 30 minutes, zero DB setup |
| Navigation Efficiency | Dashboard → module editor = 1 click |
| Data Entry Speed | Logging an entry < 3 seconds on mobile |
