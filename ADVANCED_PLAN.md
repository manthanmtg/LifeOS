# Life OS — Advanced Roadmap

> **Status:** Active Development · **Base:** All 6 Phases Complete · **Date:** March 2026

This document extends the original PLAN.md with advanced features, production hardening, and new modules. Items are organized by priority tier, with estimated effort and dependencies.

---

## Tier 0 — Critical Production Gaps

These were deferred from PLAN.md and should be completed first.

### 0.1 — Media Storage Integration
> Currently no way to upload images (blog covers, portfolio avatar, bookshelf covers).

- [ ] Create `src/lib/storage.ts` — S3/Netlify Blob client utility
  - Support both providers via `STORAGE_PROVIDER` env var (`s3 | netlify-blob`)
  - Factory pattern: `getStorageClient()` returns unified interface
- [ ] `app/api/upload/route.ts`:
  - Accept multipart `FormData` (images only: jpg, png, webp, gif, svg)
  - Validate file size (max 5MB), MIME type check (not just extension)
  - Generate unique filename: `{module}/{uuid}.{ext}`
  - Return `{ url, key, size }` on success
- [ ] Image optimization pipeline (via `sharp`):
  - Auto-resize to max 1920×1080 while preserving aspect ratio
  - Generate thumbnail variant (400×300) for grid views
  - Strip EXIF metadata for privacy
  - Convert to WebP if browser supports it
- [ ] Wire uploads into:
  - **Blog AdminView** — cover image picker above content editor
  - **Portfolio AdminView** — avatar upload + project screenshots
  - **Bookshelf AdminView** — book cover URL or upload
- [ ] Add `STORAGE_*` env vars to `.env.local.example`

**Effort:** ~4 hours | **Deps:** AWS S3 credentials or Netlify Blob

---

### 0.2 — Real Markdown Renderer
> Blog posts currently use a simple regex-based parser. Needs proper rendering.

- [ ] Install `react-markdown` + `remark-gfm` + `rehype-highlight`
- [ ] Replace the `renderContent()` function in `/blog/[slug]/page.tsx` with:
  ```tsx
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
    {post.payload.content}
  </ReactMarkdown>
  ```
- [ ] Style with Tailwind typography plugin (`@tailwindcss/typography`)
- [ ] Support: tables, task lists, footnotes, strikethrough, code highlighting (50+ languages)
- [ ] Add copy-to-clipboard button on code blocks (like GitHub)

**Effort:** ~1 hour | **Deps:** None

---

### 0.3 — Automated Testing Suite
> Zero tests currently. Core flows should be covered before any deployment.

- [ ] Set up Vitest + React Testing Library + MSW (Mock Service Worker)
- [ ] **Unit tests** (`__tests__/unit/`):
  - `schemas.test.ts` — validate all 9 Zod schemas accept valid data, reject invalid
  - `auth.test.ts` — JWT sign/verify roundtrip, expiry, invalid tokens
  - `utils.test.ts` — `cn()` utility merging
- [ ] **API integration tests** (`__tests__/api/`):
  - `content.test.ts` — CRUD operations, Zod rejection, filter by module_type
  - `system.test.ts` — GET/PUT config, theme persistence
  - `auth.test.ts` — login flow, cookie setting, wrong password rejection
  - `export-import.test.ts` — roundtrip: export → import → verify data integrity
- [ ] **Component tests** (`__tests__/components/`):
  - `CommandPalette.test.tsx` — keyboard shortcut, search filtering, navigation
  - `AdminSidebar.test.tsx` — module list rendering, active state, mobile drawer
  - `ZenMode.test.tsx` — toggle via keyboard, CSS class application
- [ ] CI pipeline: GitHub Actions workflow for `pnpm test` + `pnpm build` on every PR
- [ ] Coverage target: ≥ 80% on `src/lib/`, ≥ 60% overall

**Effort:** ~6 hours | **Deps:** None

---

## Tier 1 — High-Impact Feature Enhancements

### 1.1 — Public Module Router
> Public modules (Blog, Portfolio, Bookshelf) need dedicated public routes.

- [ ] Dynamic public route: `app/[module]/page.tsx`
  - On request, check if module `isPublic` in system config
  - If public + has `View.tsx`, render it with PublicHeader/Footer
  - If not public, return 404
- [ ] Public pages for eligible modules:
  - `/bookshelf` — Grid of completed books with ratings (read-only)
  - `/reading` — Curated reading list (read-only)
  - `/ideas` — Promoted ideas only (portfolio tie-in)
- [ ] Add `generateMetadata()` per page for dynamic SEO titles

**Effort:** ~3 hours | **Deps:** None

---

### 1.2 — Notification / Toast System
> No user feedback system for success/error states. Relies on inline messages.

- [ ] Create `src/components/ui/Toast.tsx`:
  - Global toast container (bottom-right, stacked)
  - Variants: `success`, `error`, `warning`, `info`
  - Auto-dismiss after 4s with progress bar
  - Framer Motion slide-in/slide-out animations
  - ❌ close button + keyboard dismiss (Escape)
- [ ] Create `src/hooks/useToast.ts` — context-based toast API
  ```ts
  const { toast } = useToast();
  toast.success("Expense saved!");
  toast.error("Failed to delete");
  ```
- [ ] Wire into all modules (replace inline `formError` states)
- [ ] Wire into export/import feedback flow

**Effort:** ~2 hours | **Deps:** None

---

### 1.3 — Drag & Drop Reordering
> Several modules would benefit from drag-and-drop.

- [ ] Install `@dnd-kit/core` + `@dnd-kit/sortable`
- [ ] Reading Queue — drag to reorder by priority
- [ ] Ideas Kanban — drag cards between status columns
- [ ] Habit Tracker — reorder habit rows
- [ ] Portfolio skills — reorder skill tags
- [ ] Persist order via `sort_order` field in content payload

**Effort:** ~3 hours | **Deps:** `@dnd-kit`

---

### 1.4 — Advanced Analytics
> Current analytics manually logs events. Needs automatic tracking + richer views.

- [ ] **Auto-tracking middleware** in `proxy.ts`:
  - On every public page request, auto-POST to `/api/metrics`
  - Parse `User-Agent` for device type (regex or `ua-parser-js`)
  - Debounce: skip same IP + path within 30s (use in-memory Map with TTL)
  - Exclude: `/api/*`, `/_next/*`, static assets, bots (via user-agent)
- [ ] **Geography** (optional):
  - Parse `x-vercel-ip-country` or `cf-ipcountry` headers
  - Add `country` field to metrics schema
  - World map visualization (inline SVG or simple country list)
- [ ] **Background aggregation cron** (`app/api/cron/aggregate/route.ts`):
  - Netlify scheduled function (daily at midnight UTC)
  - Rolls up raw metrics into `daily_metrics` collection:
    `{ date, path, view_count, unique_visitors, device_breakdown }`
  - Delete raw events older than 90 days after aggregation
  - Prevents DB bloat over time
- [ ] **Enhanced AdminView charts:**
  - Donut chart for device breakdown (not just text)
  - Line chart for daily trends (SVG path)
  - Bounce rate estimation (single-page sessions)
  - Unique visitors vs total views comparison

**Effort:** ~5 hours | **Deps:** None

---

### 1.5 — Auth Hardening & Multi-Admin
> Single password, no rate limiting, no admin profile.

- [ ] **Rate limiting** on `/api/auth/login`:
  - In-memory counter: max 5 attempts per IP per 15 minutes
  - Return 429 with `Retry-After` header
  - Reset on successful login
- [ ] **Session management:**
  - Add `issued_at` and `session_id` to JWT payload
  - Track active sessions in system config
  - "Log out all sessions" button in Settings
- [ ] **Password change** in Settings:
  - New API: `PUT /api/auth/password` (requires current password + new password)
  - Update `ADMIN_PASSWORD` in-memory, persist to DB for comparison
  - Or: switch to bcrypt-hashed password stored in `system` collection
- [ ] **Optional multi-admin** (future):
  - `admin_users` array in system config
  - Each entry: `{ username, password_hash, role: "admin" | "editor" }`
  - JWT includes `sub: username`
  - Editor role: can manage content but not settings/export/import

**Effort:** ~4 hours | **Deps:** `bcrypt` (optional)

---

## Tier 2 — Polish & Developer Experience

### 2.1 — PWA Support
> Make Life OS installable on mobile as a native-feeling app.

- [ ] Add `manifest.json` with app name, icons, theme colors
- [ ] Service worker for offline shell caching (Next.js `next-pwa`)
- [ ] Add iOS meta tags (`apple-mobile-web-app-capable`, status bar style)
- [ ] Splash screens for different device sizes
- [ ] Register service worker in root layout

**Effort:** ~2 hours | **Deps:** `next-pwa`

---

### 2.2 — Accessibility (a11y) Audit
> Ensure WCAG 2.1 AA compliance.

- [ ] Add `aria-*` attributes to all interactive components:
  - Sidebar nav: `role="navigation"`, `aria-current="page"` on active
  - Modals: `role="dialog"`, `aria-modal="true"`, focus trap
  - Command palette: `role="combobox"`, `aria-expanded`, `aria-activedescendant`
  - Toast: `role="alert"`, `aria-live="polite"`
- [ ] Keyboard navigation:
  - Tab order audit on all pages
  - All buttons/links accessible via keyboard
  - Focus ring visible on all interactive elements (use `focus-visible:ring-2`)
- [ ] Color contrast: ensure ≥ 4.5:1 on all text vs background combinations per theme
- [ ] Screen reader testing: VoiceOver (macOS/iOS), NVDA (Windows)
- [ ] `eslint-plugin-jsx-a11y` integration

**Effort:** ~4 hours | **Deps:** None

---

### 2.3 — Skeleton Loading States
> Replace "Loading..." text with shimmer skeletons for perceived performance.

- [ ] Create `src/components/ui/Skeleton.tsx`:
  - Reusable variants: `SkeletonCard`, `SkeletonText`, `SkeletonCircle`, `SkeletonChart`
  - Shimmer animation via CSS gradient animation
- [ ] Apply to every module's `loading` state:
  - Dashboard widgets: 3×4 skeleton grid
  - Expense list: 5 skeleton rows
  - Blog list: 3 skeleton cards
  - Analytics: 4 stat skeletons + chart skeleton
- [ ] Use `React.Suspense` boundaries where possible

**Effort:** ~2 hours | **Deps:** None

---

### 2.4 — Confirmation Dialogs
> Delete operations fire immediately with no confirmation.

- [ ] Create `src/components/ui/ConfirmDialog.tsx`:
  - Modal with warning icon, title, description, cancel/confirm buttons
  - "Type to confirm" variant for destructive bulk operations
  - Keyboard: Enter to confirm, Escape to cancel
- [ ] Wire into all delete handlers across modules
- [ ] Wire into import (already partially done)

**Effort:** ~1 hour | **Deps:** None

---

### 2.5 — Error Boundary & 500 Page
> Unhandled component errors currently crash the page.

- [ ] Create `src/app/error.tsx` — root error boundary with retry button
- [ ] Create `src/app/admin/error.tsx` — admin-specific error boundary
- [ ] Create `src/app/not-found.tsx` — custom 404 page (branded, back to home link)
- [ ] Log errors to `metrics` collection with `type: "error"` for debugging

**Effort:** ~1 hour | **Deps:** None

---

## Tier 3 — New Module Ideas

Modules that expand Life OS into a more comprehensive system. Each follows the existing module contract (AdminView + Widget + schema + registry).

### 3.1 — Journal / Daily Notes
> Personal daily journaling with mood tracking.

- [ ] `JournalSchema`: `date`, `content` (markdown), `mood` (1–5 scale or emoji), `tags`, `weather`
- [ ] AdminView: Calendar-based navigation, click a date to write/edit entry
- [ ] Rich text editor (can reuse blog's markdown approach)
- [ ] Mood trend chart (sparkline of mood over 30 days)
- [ ] Widget: Today's mood, streak of consecutive days journaled
- [ ] "On this day" — show last year's entry on the same date

**Effort:** ~3 hours

---

### 3.2 — Goals / OKR Tracker
> Track quarterly or yearly goals with measurable key results.

- [ ] `GoalSchema`: `title`, `description`, `type` (`goal` | `key_result`), `parent_id`, `target_value`, `current_value`, `deadline`, `status`
- [ ] Tree structure: Goals → Key Results → sub-tasks
- [ ] Progress bars per KR, roll-up percentage to parent goal
- [ ] AdminView: Collapsible tree view + progress dashboard
- [ ] Widget: Active goals count, overall completion percentage
- [ ] Quarter/year filter

**Effort:** ~4 hours

---

### 3.3 — Contacts / CRM Lite
> Keep track of important contacts and interactions.

- [ ] `ContactSchema`: `name`, `email`, `phone`, `company`, `tags`, `notes`, `last_contacted`, `social_links`
- [ ] AdminView: Searchable contact list, quick-add form
- [ ] "Log interaction" sub-feature: track calls/meetings/emails
- [ ] Reminders: "Haven't contacted X in 30 days" (displayed on dashboard widget)
- [ ] Widget: Total contacts, recently added, overdue follow-ups

**Effort:** ~3 hours

---

### 3.4 — Finance Dashboard (Expenses V2)
> Elevate expenses with budgets, recurring income, and net worth tracking.

- [ ] `BudgetSchema`: `category`, `monthly_limit`, `month`
- [ ] Budget progress bars per category (spent vs limit)
- [ ] Income tracking: log salary, freelance payments
- [ ] Net savings calculation: income - expenses per month
- [ ] Monthly/yearly summary charts (SVG bar chart)
- [ ] CSV import for bank statements (parse common formats)

**Effort:** ~5 hours

---

### 3.5 — Pomodoro Timer
> Built-in focus timer with session logging.

- [ ] Timer component: 25/5 Pomodoro cycle, customizable durations
- [ ] Session log: automatically save completed sessions to `content` collection
- [ ] Link sessions to modules: "I spent 2 Pomodoros on Blog"
- [ ] Daily/weekly focus time chart
- [ ] Widget: Today's focus time, sessions completed, current streak
- [ ] Audio notification on timer completion (Web Audio API)
- [ ] Keyboard shortcut: `Ctrl+Shift+P` to start/pause

**Effort:** ~3 hours

---

## Tier 4 — Future Vision

Longer-term ideas that would significantly extend the platform.

### 4.1 — Plugin System
- [ ] Define `LifeOSPlugin` interface with hooks: `onInstall`, `onEnable`, `onDisable`, `registerRoutes`
- [ ] Plugin manifest: `lifeos-plugin.json` with metadata and dependencies
- [ ] Plugin settings page per plugin
- [ ] Community plugin directory (GitHub-based)

### 4.2 — Webhooks & Integrations
- [ ] Outgoing webhooks: trigger on content create/update/delete
- [ ] Incoming webhooks: accept data from external services (Zapier, IFTTT)
- [ ] Pre-built integrations: Notion import, Todoist sync, GitHub activity feed

### 4.3 — AI Assistant
- [ ] Natural language command palette: "Add expense $50 for groceries"
- [ ] Smart categorization: auto-suggest expense category based on description
- [ ] Blog draft generator from topic/outline
- [ ] Habit insights: "You tend to break your reading streak on Fridays"
- [ ] Uses OpenAI/Anthropic API with key stored in system config

### 4.4 — Collaborative Mode
- [ ] Real-time collaboration via WebSockets (or Liveblocks)
- [ ] Multiple admin accounts with role-based permissions
- [ ] Activity feed: "Admin A edited Blog Post X"
- [ ] Comment system on content items

### 4.5 — Native Mobile App
- [ ] React Native / Expo wrapper targeting iOS + Android
- [ ] Quick-add widget (iOS Widget / Android App Widget)
- [ ] Push notifications for habit reminders
- [ ] Biometric auth (FaceID / fingerprint)

---

## Priority Matrix

| Tier | Theme | Items | Est. Total |
|------|-------|-------|-----------|
| **0** | Critical Gaps | Media storage, Markdown renderer, Tests | ~11 hrs |
| **1** | High Impact | Public routes, Toasts, DnD, Analytics+, Auth | ~17 hrs |
| **2** | Polish & DX | PWA, a11y, Skeletons, Confirms, Errors | ~10 hrs |
| **3** | New Modules | Journal, Goals, CRM, Finance V2, Pomodoro | ~18 hrs |
| **4** | Vision | Plugins, Webhooks, AI, Collab, Native | TBD |

**Recommended execution order:** Tier 0 → 1.2 (Toasts) → 1.1 (Public routes) → 2.4–2.5 (Confirms/Errors) → 1.4 (Analytics) → 2.3 (Skeletons) → Pick from Tier 3.

---

## Appendix: Current Codebase Stats

| Metric | Value |
|--------|-------|
| Total source files | 54 |
| Routes | 15 (includes /blog, /blog/[slug]) |
| Modules | 10 (Portfolio, Blog, Expenses, Subscriptions, Reading, Bookshelf, Ideas, Snippets, Habits, Analytics) |
| Zod schemas | 9 registered |
| Themes | 7 (One Dark, Dracula, Studio Dark, Nordic Light, Cyberpunk, Midnight One, Vampire) |
| API endpoints | 8 (auth, content, content/[id], system, metrics, export, import, blog routes) |
| MongoDB collections | 3 (system, content, metrics) |
| MongoDB indexes | 5 auto-created |
