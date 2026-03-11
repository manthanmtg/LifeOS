# Life OS — Master Implementation Plan

> **Version:** 4.0 | **Status:** Maintenance / Reference | **Date:** March 2026

---

## Executive Summary

Life OS is a high-fidelity, open-source template framework. It acts as a **"Shell"** that dynamically renders a professional portfolio and a private life-management dashboard. The application is designed as a **single-tenant, self-deployable system** with a strict **Separation of Concerns (SoC)**. It features a bidirectional link between the Admin Portal and individual modules, allowing modules to provide their own administrative sub-interfaces (`AdminView`) within a secure, themeable, and highly responsive shell.

---

## Goals & Objectives

| # | Goal | Description |
|---|------|-------------|
| 1 | **Modular Extensibility** | Add or remove life-management "micro-apps" (modules) within minutes without affecting the core shell. Current suite: 18 modules. |
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

## Phase 2: UX, Theming & The Command Center ✅

**Goal:** Build the visual identity, global navigation, and the core admin logic.

### 2.1 — Universal Theme Engine
- [x] Define CSS custom properties for each theme in `src/app/globals.css`
- [x] Themes implemented: One Dark, Dracula, Studio Dark, Nordic Light, Cyberpunk, Midnight One, Vampire
- [x] Each theme overrides `--accent` / `--accent-hover` (components use zinc-* utilities for base)
- [x] Integrate `next-themes` for theme switching (`data-theme` on `<html>`)
- [x] Persist selected theme to `system.active_theme` via `/api/system` PUT
- [x] Apply theme on load from system config server-side in root layout
- [x] Glassmorphism utilities: `.glass-card` class with `backdrop-blur`

### 2.2 — Shell Components
- [x] `AdminHeader.tsx` — breadcrumb navigation + ⌘K hint badge
- [x] `PublicHeader.tsx` — sticky glassmorphism header, dynamically shows isPublic modules from system config
- [x] `PublicFooter.tsx` — footer with social links from portfolio profile + copyright
- [x] Admin layout wired with AdminHeader + CommandPalette
- [x] **Mobile (< lg):** Hamburger trigger + Framer Motion slide-in drawer, 44px min touch targets
- [x] **Desktop (≥ lg):** Persistent left sidebar
- [x] Public header mobile hamburger with animated dropdown
- [x] Admin layout mobile padding to clear hamburger button

### 2.3 — Command Palette (Ctrl+K)
- [x] Create `src/components/ui/CommandPalette.tsx`
- [x] Global keyboard shortcut: `Cmd+K` / `Ctrl+K`
- [x] Overlay modal with search input, blurred backdrop
- [x] Search sources: module navigation, quick actions
- [x] Keyboard navigation: Arrow keys, Enter, Escape
- [x] Framer Motion entrance/exit animations

### 2.4 — Admin Portal Base
- [x] **Visibility Manager** (`src/app/admin/settings/page.tsx`): Toggle isPublic/enabled per module
- [x] **Theme Gallery**: Visual preview cards with color swatches, one-click apply, accent ring on active
- [x] Settings accessible via `/admin/settings`

**Verified:** Build passes, all routes 200, theme persistence confirmed, responsive sidebar verified.

---

## Phase 3: Identity & Finance Modules ✅

**Goal:** Deploy the public face and the most critical daily-use private module.

### 3.1 — Module 0: Portfolio
- [x] `src/modules/portfolio/AdminView.tsx` — Profile editor (hero/bio/skills/social-links) with live preview
- [x] `src/modules/portfolio/Widget.tsx` — Dashboard widget: title, skill count, hiring badge
- [x] Public-facing portfolio page (`View.tsx`) — renders on `/`
- [x] SEO metadata (OG tags, keywords, title template) in root layout

### 3.2 — Module 3: Financial Stack
#### 3.2.1 — Expense Tracker
- [x] `src/modules/expenses/AdminView.tsx` — Quick-add form, smart suggestions, category/date filters, CRUD
- [x] `src/modules/expenses/Widget.tsx` — Total this month, trend vs last month, top category
- [x] **Interactive SVG Donut Chart** — category breakdown with legend
- [x] Zod schema: `ExpenseSchema` (defined in Phase 1)

#### 3.2.2 — Subscription Manager
- [x] `SubscriptionSchema` added to `schemas.ts` + registered in `SchemaRegistry`
- [x] `src/modules/subscriptions/AdminView.tsx` — Card grid, renewal countdowns, Total Monthly Burn, CRUD
- [x] `src/modules/subscriptions/Widget.tsx` — Monthly burn + next renewal
- [x] Registered `subscriptions` in `registry.ts` and `AdminSidebar` icon map

### 3.3 — Bento Grid Dashboard
- [x] `admin/page.tsx` renders live Expenses and Subscriptions widgets
- [x] Clickable widget cards linking to module admin pages
- [x] All 18 module widgets live

**Verified:** Build passes (10 routes), `[module]` dynamic routing loads expense/subscription AdminViews.

---

## Phase 4: Content & Knowledge Management ✅ (Blog + Portfolio)

**Goal:** Implement complex text editing and media handling.

### 4.1 — Module 1: Blog
- [x] `blog` already in `registry.ts` from Phase 1
- [x] `src/modules/blog/AdminView.tsx` — Markdown editor, preview toggle, auto-slug, status workflow, tags, SEO counter, reading time
- [x] `src/modules/blog/View.tsx` — Public blog listing at `/blog` (published only, sorted by date)
- [x] `app/blog/[slug]/page.tsx` — Individual blog post page with markdown rendering
- [x] `src/modules/blog/Widget.tsx` — Published/draft counts

### 4.1b — Module 0: Portfolio
- [x] `src/modules/portfolio/AdminView.tsx` — Profile editor with hero/bio/skills/social-links + live preview
- [x] `src/modules/portfolio/Widget.tsx` — Profile summary, skill count, hiring badge
- [x] Public-facing portfolio page (`View.tsx`) — renders as landing page

**Verified:** Build passes, all modules load via dynamic `[module]` routing, dashboard shows all 4 live widgets.

### 4.2 — Module 2: Knowledge & Reading
#### 4.2.1 — Reading Todo Queue
- [x] `ReadingItemSchema` added to `schemas.ts` (url, title, source_domain, priority, type, is_read, notes)
- [x] `src/modules/reading/AdminView.tsx` — URL paste + domain extraction, priority badges (red/yellow/green), type/read filters, circle toggle for read/unread
- [x] `src/modules/reading/Widget.tsx` — Unread count, high priority count
- [x] Registered `reading` in `registry.ts`

#### 4.2.2 — Bookshelf
- [x] `BookSchema` added to `schemas.ts` (title, author, status, pages, rating, notes, tags)
- [x] `src/modules/bookshelf/AdminView.tsx` — Book cards with progress bars, star ratings, status filter tabs, notes, CRUD
- [x] `src/modules/bookshelf/Widget.tsx` — Total books, currently reading title, completed count
- [x] Registered `bookshelf` in `registry.ts`

### 4.3 — Module 5: Idea Dump (Second Brain)
- [x] `IdeaSchema` added to `schemas.ts` (title, description, category, status, priority, tags, promoted flags)
- [x] `src/modules/ideas/AdminView.tsx` — Kanban-style column view (all 5 statuses), card grid by filter, promote-to-portfolio button, CRUD
- [x] `src/modules/ideas/Widget.tsx` — Total, raw, promoted counts
- [x] Registered `ideas` in `registry.ts`

**Verified:** Build passes, dashboard now has 7 live widgets, all modules load via dynamic routing.

### 4.4 — Media Storage Integration
- [ ] Set up S3/Netlify Blob client utility (`src/lib/storage.ts`)
- [ ] Upload API route (`app/api/upload/route.ts`): Accept file, upload to storage, return URL
- [ ] File size limits, type validation (images only: jpg, png, webp, gif)
- [ ] Image optimization/resizing before upload (optional, via `sharp`)

---

## Phase 5: Productivity & Analytics ✅

**Goal:** Finalize the module suite and add self-hosted tracking.

### 5.1 — Module 4: Personal Productivity
#### 5.1.1 — Snippet Box
- [x] `SnippetSchema` added to `schemas.ts` (title, code, language, description, tags, is_favorite)
- [x] `src/modules/snippets/AdminView.tsx` — Code card grid with monospace preview, one-click copy (✓ feedback), star favorites, language filter (dynamic), full-text search, 16 languages
- [x] `src/modules/snippets/Widget.tsx` — Total count, favorites, languages
- [x] Registered `snippets` in `registry.ts`

#### 5.1.2 — Habit Tracker
- [x] `HabitSchema` added to `schemas.ts` (name, description, frequency, target_count, color, completions)
- [x] `src/modules/habits/AdminView.tsx` — GitHub-style heatmap (182 days / 26 weeks), click cells to toggle, 7 color presets, streak counters (current + longest), "Log today" button, CRUD
- [x] `src/modules/habits/Widget.tsx` — Active habits, completed today count
- [x] Registered `habits` in `registry.ts`

### 5.2 — Module 7: Analytics Engine
- [x] `src/app/api/metrics/route.ts` — GET (query with days param) + POST (log page view) using `metrics` collection
- [x] `src/modules/analytics/AdminView.tsx` — Summary cards (total/today/desktop/mobile), sparkline bar chart, top pages, top referrers, date range (7/30/90d)
- [x] `src/modules/analytics/Widget.tsx` — Views today + trend arrow vs yesterday
- [x] Registered `analytics` in `registry.ts`

### 5.3 — Data Export/Import (Admin Portal Enhancement)
- [x] `src/app/api/export/route.ts` — Dumps all 3 collections as downloadable `lifeos-backup-YYYY-MM-DD.json`
- [x] `src/app/api/import/route.ts` — Restore from backup JSON, replaces all collections, strips `_id` conflicts
- [x] Settings page: Export button + Import file upload zone with ⚠️ confirmation modal + result display

**Verified:** Build passes (20+ routes), dashboard shows 18 live widgets, all 18 schemas registered.

| Total source files | 100+ |
| Routes | 25+ |
| Modules | 18 |
| Zod schemas | 18 registered |

---

## Phase 6: Testing, Polish & Deployment ✅

**Goal:** Achieve the "3-Minute Turnkey" deployment standard and launch.

### 6.1 — Responsive Audit
- [x] Mobile hamburger menu (AdminSidebar + PublicHeader) with 44px targets
- [x] Responsive Bento grid dashboard (1→2→3 columns)
- [x] All admin forms responsive (grid-cols-1 → md:grid-cols-2)

### 6.2 — Performance Optimization
- [x] Lazy-load module AdminViews via dynamic imports in `[module]/page.tsx`
- [x] MongoDB indexes: `content.module_type`, `content.created_at`, `metrics.timestamp`
- [x] Build passes clean — all 13 routes compile successfully

### 6.3 — Auto-Seeding & First-Run Experience
- [x] `ensureSystemConfig()` seeds system config on fresh DB
- [x] DB indexes auto-created on first run
- [x] Portfolio View shows "Not Set Up" fallback if no profile exists
- [x] `.env.local.example` documents all 3 required vars

### 6.4 — Deployment Pipeline
- [x] `netlify.toml` with build config (pnpm build, .next, Node 20, Next.js plugin)
- [x] Deploy to Netlify button in README (pre-fills MONGODB_URI, ADMIN_PASSWORD, JWT_SECRET)

### 6.5 — Documentation & README
- [x] Comprehensive README: features, 10-module table, Mermaid architecture diagram, quick start, deploy guide, project structure, module dev guide
- [x] `CONTRIBUTING.md` with module development conventions, data architecture, code style
- [x] LICENSE (already exists)

---

## UX & Design Requirements (Cross-Cutting)

These requirements apply across ALL phases and modules:

### Glassmorphism
- Blurred translucent cards (`backdrop-blur-xl`, `bg-white/5`, `border border-white/10`)
- Applied to: cards, modals, command palette, sidebar, navigation overlays

### Framer Motion Animations
- **Page animations:** `animate-fade-in-up` CSS animation on all pages
- **Card hover:** `hover:scale-[1.01]` on dashboard widgets
- **Micro-interactions:** Copy feedback, toggle animations, loading spinners, skeleton pulses

### Context-Aware UI
- **"Zen Mode":** ✅ `Ctrl+Shift+Z` / `Cmd+Shift+Z` dims sidebar+header to 20% opacity, hover restores. Badge shows exit hint.
- **Adaptive styling:** ✅ Cards, backgrounds, and accents adapt via CSS custom properties (`--accent`, `--accent-hover`)

### Typography
- ✅ Primary font: **Inter** (via `next/font/google`, `--font-inter`)
- ✅ Monospace: **JetBrains Mono** (via `next/font/google`, `--font-jetbrains-mono`)
- ✅ Scale: consistent `text-sm` / `text-base` / `text-lg` / `text-xl` / `text-3xl` usage

---

## Zod Schema Registry (Appendix)

All schemas live in `src/lib/schemas.ts`. The `SchemaRegistry` object maps `module_type` strings to their Zod schemas:

| `module_type` | Schema | Status |
|----------------|--------|--------|
| `portfolio_profile` | `PortfolioProfileSchema` | ✅ Defined |
| `expense` | `ExpenseSchema` | ✅ Defined |
| `blog_post` | `BlogPostSchema` | ✅ Defined |
| `subscription` | `SubscriptionSchema` | ✅ Defined |
| `reading_item` | `ReadingItemSchema` | ✅ Defined |
| `book` | `BookSchema` | ✅ Defined |
| `idea` | `IdeaSchema` | ✅ Defined |
| `snippet` | `SnippetSchema` | ✅ Defined |
| `habit` | `HabitSchema` | ✅ Defined |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Setup Speed | Fork → live URL in < 3 minutes |
| Developer Velocity | New module integrated in < 30 minutes, zero DB setup |
| Navigation Efficiency | Dashboard → module editor = 1 click |
| Data Entry Speed | Logging an entry < 3 seconds on mobile |
