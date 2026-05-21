# AGENTS.md

This file provides consolidated guidance to all AI agents (Antigravity, Claude Code, Cascade, Cursor, etc.) working within this repository.

## Commands

- `pnpm dev` — Start dev server on `http://localhost:3091`
- `pnpm build` — Production build (includes memory fix)
- `pnpm start` — Start production server on `http://localhost:3091`
- `pnpm lint` — Run ESLint (`eslint` via flat config in `eslint.config.mjs`)
- `pnpm typecheck` — Run TypeScript type checking (includes memory fix)
- `pnpm test` — Run tests using Vitest with `NODE_ENV=test`
- `pnpm test:watch` — Run tests in watch mode with `NODE_ENV=test`
- `pnpm test:coverage` — Run tests with coverage report under `NODE_ENV=test`
- `pnpm test:ui` — Run tests with Vitest UI
- `pnpm format` — Format code with Prettier
- `pnpm format:check` — Check formatting with Prettier
- `pnpm check` — Run full CI check (lint, typecheck, build, test)
- Vitest v4 is the configured test framework

### Agent Guidelines

### Autonomous Prompt Runs

When executing files from `prompts/`, read `prompts/README.md` first and treat it as the run contract. For random autonomous runs, use `prompts/random_selector.md`, update `prompts/prompts_metadata.json` selection and terminal outcome counters in the same branch, include the selected prompt in the commit body, and keep the selected prompt's changes small enough for quick review. If a prompt cannot be completed safely, log the reason in `issues_to_look/` instead of inventing new policy.
- `prompts/random_selector.md` uses eligibility and scheduling from `prompts/prompts_metadata.json`: it selects only `enabled` and `autonomousSafe` prompts where `totalNoop < totalCompleted`, and treats `prompts_optimizer.md` as a rare (~1 in 25) maintenance run.
- For terminal outcomes, set each prompt's `lastOutcome` and `lastCompletedAt` together with `prompts` and top-level metadata timestamps for `completed`, `noop`, or `failed` runs.

### Quality Verification

**Whenever you make changes, once the feature is complete, run `pnpm check` to verify linting, types, build, and tests.** This ensures no regressions were introduced. At minimum, run `pnpm lint` and `pnpm format` before finishing your work.

### Architecture

Life OS is a Next.js 16 App Router application — a "shell" that dynamically renders a public portfolio and a private admin dashboard. It uses React 19, the MongoDB Node.js driver v7, Tailwind CSS v4, Zod v4, and Framer Motion v12.

The admin dashboard includes several core shell features:

- **Command Palette** (`src/components/ui/CommandPalette.tsx`) — Accessible via `Cmd+K` (or `Ctrl+K`), allows quick navigation to any module, the dashboard, or settings.
- **Zen Mode** (`src/components/ZenMode.tsx`) — A distraction-free mode that can be toggled to hide/show UI elements.
- **Global Module Search** (`src/components/shell/GlobalModuleSearch.tsx`) — Integrated into the sidebar for quickly filtering modules.

### Polymorphic Data Layer

All module data lives in a **single MongoDB `content` collection** using a discriminator pattern:

- `module_type` — string discriminator (e.g., `"expense"`, `"blog_post"`, `"compass_task"`)
- `payload` — module-specific data validated by Zod schemas in `src/lib/schemas.ts`
- `is_public` — controls public visibility
- Timestamps (`created_at`, `updated_at`) are ISO strings managed by the API

Four MongoDB collections are used for core workflows: `system` (global config), `content` (all module data), `metrics` (analytics events), and `ai_providers` (AI provider configuration and sync metadata). See `src/lib/types.ts` for `SystemConfig` and `ContentDocument` interfaces.

### Module System

Each module is a self-contained folder under `src/modules/[name]/` with up to three files:

- `AdminView.tsx` — CRUD interface, rendered at `/admin/[name]` via dynamic import
- `Widget.tsx` — Dashboard summary card for the admin bento grid at `/admin`
- `PublicView.tsx` (optional) — Read-only public view

The `src/registry.ts` maps module slugs to `ModuleConfig` (name, icon, defaultPublic, contentType, description, tags). The `src/lib/schemas.ts` has a `SchemaRegistry` mapping `contentType` strings to Zod schemas for validation.

The dynamic admin route (`src/app/admin/[module]/page.tsx`) imports `@/modules/${moduleName}/AdminView` at runtime, falling back to `_template/AdminView` if not found.

### Widget Contract

Widgets are **constrained dashboard tiles**, not mini-apps. `WidgetCard` enforces a hard max-height of **280px** (`WIDGET_MAX_HEIGHT` from `src/components/dashboard/widget-primitives.tsx`). Any widget content that exceeds this height is **clipped**. In development mode, overflowing widgets show a red ring and a warning banner so violations are immediately visible.

**Rules:**

1. Show one hero metric + at most one detail. That's the entire widget.
2. Use the pre-sized primitives from `src/components/dashboard/widget-primitives.tsx`: `WidgetStat`, `WidgetHighlight`, `WidgetMiniStats`, `WidgetList`.
3. Fetch from `/api/widgets/summary` endpoints — never pull full collections into a widget.
4. No interactive elements (buttons, forms, inputs) inside widgets. The whole card is clickable via `WidgetCard`'s `href` prop.
5. No `window.location` navigation — use `href` on `WidgetCard` instead.
6. Keep animations minimal; the card handles hover transitions.

**Recommended layouts (pick ONE per widget):**

- **A)** `WidgetStat` + `WidgetHighlight` — hero number + spotlight row
- **B)** `WidgetStat` + `WidgetMiniStats` — hero number + up to 3 mini stat cells
- **C)** `WidgetStat` + `WidgetList` — hero number + up to 2 list items
- **D)** `WidgetStat` alone — just the hero metric

Reference implementation: `src/modules/_template/Widget.tsx`

### Adding a New Module

1. Register in `src/registry.ts` with slug, name, icon (Lucide React name), defaultPublic, contentType, description, and tags
2. Add Zod schema to `src/lib/schemas.ts` and register in `SchemaRegistry`
3. Create `src/modules/[name]/AdminView.tsx` — fetch data via `/api/content?module_type=<contentType>`
4. Create `src/modules/[name]/Widget.tsx` following the Widget Contract (see above) and add dynamic import to `src/app/admin/page.tsx`
5. Add icon to `IconMap` in `src/components/shell/AdminSidebar.tsx`
6. For public modules: create `PublicView.tsx` and wire into `src/app/[module]/page.tsx`

### API Routes

- `/api/content` — GET (query by `module_type`, `is_public`) / POST (creates with Zod validation)
- `/api/content/[id]` — GET / PUT / DELETE single item
- `/api/system` — GET / PUT global config
- `/api/auth/login` — POST password-based JWT login
- `/api/auth/logout` — POST clears the auth cookie
- `/api/widgets/summary` — GET compact per-module summaries for dashboard widgets
- `/api/module-info/[slug]` — GET module info markdown for admin module guidance
- `/api/portfolio/resume` — GET public resume PDF content from portfolio data
- `/api/metrics` — GET / POST analytics events
- `/api/db-stats` — GET database collection stats for admin diagnostics
- `/api/export` / `/api/import` — Backup and restore
- `/api/bills/*` — Bill, folder, move, and attachment operations backed by `content`
- `/api/ai-usage/*` — Provider, sync, limits, and debug operations backed by `content`
- Maintenance task CRUD uses `/api/content?module_type=maintenance_task`; there are currently no dedicated `/api/maintenance/*` route files.

### Auth & Middleware

`src/proxy.ts` is the Next.js middleware. It protects `/admin/*`, admin-only API families (`/api/system`, `/api/ai-usage`, `/api/export`, `/api/import`, `/api/db-stats`, `/api/widgets`, `/api/maintenance`, `/api/module-info`, `/api/bills`), GET analytics, and non-GET `/api/content` requests using JWT tokens (jose library) stored in the `lifeos_token` HTTP-only cookie. GET requests to `/api/content` remain public.

The middleware also redirects authenticated users from `/` to `/admin` unless `?public=1` is present, redirects authenticated `/admin/login` visits to `/admin`, and validates same-origin `Origin` headers on non-GET/non-HEAD `/api/*` requests as CSRF protection.

### Key Files

- `src/lib/mongodb.ts` — Cached MongoClient singleton (global in dev for HMR)
- `src/lib/types.ts` — Shared TypeScript interfaces and ContentDocument structure
- `src/lib/schemas.ts` — Zod schemas and the `SchemaRegistry` for module payload validation
- `src/components/ui/CommandPalette.tsx` — Global command palette (Cmd+K)
- `src/components/ZenMode.tsx` — Zen mode provider and toggle
- `src/components/shell/GlobalModuleSearch.tsx` — Sidebar module search
- `src/lib/auth.ts` — JWT sign/verify with jose
- `src/lib/api-response.ts` — `ApiSuccess`, `ApiError`, `ApiValidationError` helpers
- `src/lib/utils.ts` — `cn()` class merge utility
- `src/lib/seed.ts` — First-run DB seeder
- `src/hooks/useModuleSettings.ts` — Hook for per-module settings persisted in system config

### Loading States

Every data-fetching component must show a rich skeleton/shimmer loading state — never a blank screen or bare spinner. Shared skeleton components live in `src/components/ui/Skeletons.tsx` (`SkeletonBlock`, `WidgetSkeleton`, `DashboardSkeleton`, `AdminModuleSkeleton`, `ContentListSkeleton`, `BlogListSkeleton`, `BlogPostSkeleton`, `PublicModuleSkeleton`, `PortfolioSkeleton`).

- **Widget components** — Track a `loading` state via `useState(true)`, set `false` in `.finally()`. Return an `animate-pulse` skeleton while loading.
- **Dynamic imports** — Always pass a `{ loading: () => <Skeleton /> }` option to `next/dynamic`. Note: Next.js requires this to be an **object literal**, not a shared variable.
- **Page-level loading** — Each route group has a `loading.tsx` file (`src/app/admin/loading.tsx`, `src/app/blog/loading.tsx`, etc.) that Next.js renders during server-side navigation.
- **Client fetches** — Use `BlogListSkeleton`, `PublicModuleSkeleton`, etc. from the shared library instead of plain spinners.

When adding a new module, ensure both its `Widget.tsx` and `AdminView.tsx` follow this pattern. If a new page route is added, create a corresponding `loading.tsx`.

## Code Style

- `"use client"` directive on all interactive components
- Tailwind CSS with `zinc-*` palette and CSS variable-based semantic colors
- **Semantic colors** — Never use hardcoded Tailwind color names. This includes `red-*`, `green-*`, `emerald-*`, `amber-*`, `yellow-*`, `rose-*`, `orange-*`, `purple-*`, `cyan-*`, `sky-*`, `indigo-*`, `teal-*`, `pink-*`, `violet-*`, `fuchsia-*`. Also never use `text-white` or `text-black` — use `text-zinc-50` / `text-zinc-950` instead, since the theme system remaps the zinc scale for light/dark modes. Only use the theme-aware semantic tokens defined in `src/app/globals.css`:
  - `success` / `success-muted` — positive states (active, completed, budget OK)
  - `warning` / `warning-muted` — caution states (pending, under review, approaching limit)
  - `danger` / `danger-muted` — negative states (errors, overdue, over budget, delete actions)
  - `accent` / `accent-hover` — primary action color
  - `zinc-50` through `zinc-950` — neutral scale (adapts to light/dark via CSS variables)
  - Each theme in `globals.css` redefines these variables so colors stay harmonious across themes
- Lucide React for all icons
- `cn()` from `@/lib/utils` for conditional class merging
- Components are self-contained with local state management
- Concise, lowercase commit messages

## Known Issues

### `tsc` OOM (Out of Memory)

The TypeScript compiler can hit Node's default heap limit (~1.5–2 GB) during type-checking, especially on memory-constrained servers. Common causes: large codebase, deeply inferred types (e.g., Zod's `.infer`), or `skipLibCheck: false` forcing type-checking of all `node_modules` `.d.ts` files.

**Fixes:**

- **Increase Node heap**: Already configured in `package.json` scripts (`--max-old-space-size=4096`).
- **Enable `skipLibCheck`**: Set `"skipLibCheck": true` in `tsconfig.json` `compilerOptions` (Done).
- **Narrow `include`**: Keep `tsconfig.json` focused on app-relevant TypeScript files (`src/**/*.ts(x)`, `next-env`/`next.config`, Vitest config) rather than the repo root (Done).
- **Add swap space**: On low-RAM servers, adding swap prevents hard OOM kills.

## Visual Verification with Playwright MCP

After making UI changes, use the **Playwright MCP** to visually verify that nothing is broken. This is the preferred way to catch layout regressions, styling issues, and broken interactions.

### Prerequisites

- The app must be running locally on `http://localhost:3091`
- A valid `.env.local` with `MONGODB_URI`, `ADMIN_PASSWORD`, and `JWT_SECRET`

### Step-by-Step

1. **Start the dev server** (if not already running):

   ```bash
   pnpm dev
   ```

   Wait until you see `✓ Ready` in the output.

2. **Navigate to the page under test** using Playwright MCP's `browser_navigate`:
   - Public home: `http://localhost:3091`
   - Admin dashboard: `http://localhost:3091/admin`
   - Specific module: `http://localhost:3091/admin/<module-slug>`
   - Public blog: `http://localhost:3091/blog`

3. **Log in** (for admin pages):
   - Navigate to `http://localhost:3091/admin` — it will redirect to the login page.
   - Use `browser_type` to fill in the admin password from `.env.local` and submit.
   - Alternatively, navigate to the login page and complete the auth flow.

4. **Take screenshots** using `browser_screenshot` to capture the current state of the page. Do this:
   - After login, on the admin dashboard
   - On the specific module page you modified
   - At different viewport sizes (use `browser_resize` if available) to verify responsiveness

5. **Interact and verify**:
   - Use `browser_click` to open modals, toggle states, or trigger actions
   - Take a screenshot after each interaction to confirm the UI responds correctly
   - Check for: broken layouts, overlapping elements, missing data, console errors

6. **Stop the dev server** when done.

### Key Pages to Check

| Page              | URL             | What to verify                                     |
| ----------------- | --------------- | -------------------------------------------------- |
| Dashboard         | `/admin`        | Widget grid renders, no overflow, all widgets load |
| Modified module   | `/admin/<slug>` | CRUD works, forms render, data displays            |
| Public home       | `/`             | Portfolio renders, no auth required                |
| Blog (if changed) | `/blog`         | Post list loads, post detail renders               |

### Tips

- Always screenshot **before and after** your changes if possible — compare visually.
- Check both **desktop** and **mobile** viewports (resize to ~375px width for mobile).
- If a page shows a loading skeleton that never resolves, there's likely a data-fetching or API error.

## Environment Variables

Required in `.env.local`: `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET`
