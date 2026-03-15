# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Start dev server (Turbopack)
- `pnpm build` — Production build
- `pnpm lint` — Run ESLint (`eslint` via flat config in `eslint.config.mjs`)
- No test framework is configured

## Lint Verification

Whenever you make changes, once the feature is complete, run `pnpm lint` to verify no linting issues were introduced. Fix any errors or warnings before finishing your work.

## Architecture

Life OS is a Next.js 16 App Router application — a "shell" that dynamically renders a public portfolio and a private admin dashboard. It uses MongoDB, Tailwind CSS v4, Zod v4, and Framer Motion.

### Polymorphic Data Layer

All module data lives in a **single MongoDB `content` collection** using a discriminator pattern:
- `module_type` — string discriminator (e.g., `"expense"`, `"blog_post"`, `"compass_task"`)
- `payload` — module-specific data validated by Zod schemas in `src/lib/schemas.ts`
- `is_public` — controls public visibility
- Timestamps (`created_at`, `updated_at`) are ISO strings managed by the API

Three MongoDB collections total: `system` (global config), `content` (all module data), `metrics` (analytics events). See `src/lib/types.ts` for `SystemConfig`, `ContentDocument`, and `MetricEvent` interfaces.

### Module System

Each module is a self-contained folder under `src/modules/[name]/` with up to three files:
- `AdminView.tsx` — CRUD interface, rendered at `/admin/[name]` via dynamic import
- `Widget.tsx` — Dashboard summary card for the admin bento grid at `/admin`
- `PublicView.tsx` (optional) — Read-only public view

The `src/registry.ts` maps module slugs to `ModuleConfig` (name, icon, defaultPublic, contentType). The `src/lib/schemas.ts` has a `SchemaRegistry` mapping `contentType` strings to Zod schemas for validation.

The dynamic admin route (`src/app/admin/[module]/page.tsx`) imports `@/modules/${moduleName}/AdminView` at runtime, falling back to `_template/AdminView` if not found.

### Adding a New Module

1. Register in `src/registry.ts` with slug, name, icon (Lucide React name), defaultPublic, contentType
2. Add Zod schema to `src/lib/schemas.ts` and register in `SchemaRegistry`
3. Create `src/modules/[name]/AdminView.tsx` — fetch data via `/api/content?module_type=<contentType>`
4. Create `src/modules/[name]/Widget.tsx` and add dynamic import to `src/app/admin/page.tsx`
5. Add icon to `IconMap` in `src/components/shell/AdminSidebar.tsx`
6. For public modules: create `PublicView.tsx` and wire into `src/app/[module]/page.tsx`

### API Routes

- `/api/content` — GET (query by `module_type`, `is_public`) / POST (creates with Zod validation)
- `/api/content/[id]` — GET / PUT / DELETE single item
- `/api/system` — GET / PUT global config
- `/api/auth/login` — POST password-based JWT login
- `/api/metrics` — GET / POST analytics events
- `/api/export` / `/api/import` — Backup and restore

### Auth & Middleware

`src/proxy.ts` is the Next.js middleware. It protects `/admin/*` routes and non-GET `/api/content` requests using JWT tokens (jose library) stored in `lifeos_token` HTTP-only cookie. GET requests to `/api/content` are public.

### Key Files

- `src/lib/mongodb.ts` — Cached MongoClient singleton (global in dev for HMR)
- `src/lib/auth.ts` — JWT sign/verify with jose
- `src/lib/api-response.ts` — `ApiSuccess`, `ApiError`, `ApiValidationError` helpers
- `src/lib/utils.ts` — `cn()` class merge utility
- `src/lib/seed.ts` — First-run DB seeder
- `src/hooks/useModuleSettings.ts` — Hook for per-module settings persisted in system config

### Loading States

Every data-fetching component must show a rich skeleton/shimmer loading state — never a blank screen or bare spinner. Shared skeleton components live in `src/components/ui/Skeletons.tsx` (`SkeletonBlock`, `WidgetSkeleton`, `DashboardSkeleton`, `AdminModuleSkeleton`, `BlogListSkeleton`, `BlogPostSkeleton`, `PublicModuleSkeleton`).

- **Widget components** — Track a `loading` state via `useState(true)`, set `false` in `.finally()`. Return an `animate-pulse` skeleton while loading.
- **Dynamic imports** — Always pass a `{ loading: () => <Skeleton /> }` option to `next/dynamic`. Note: Next.js requires this to be an **object literal**, not a shared variable.
- **Page-level loading** — Each route group has a `loading.tsx` file (`src/app/admin/loading.tsx`, `src/app/blog/loading.tsx`, etc.) that Next.js renders during server-side navigation.
- **Client fetches** — Use `BlogListSkeleton`, `PublicModuleSkeleton`, etc. from the shared library instead of plain spinners.

When adding a new module, ensure both its `Widget.tsx` and `AdminView.tsx` follow this pattern. If a new page route is added, create a corresponding `loading.tsx`.

## Code Style

- `"use client"` directive on all interactive components
- Tailwind CSS with `zinc-*` palette and CSS variable-based semantic colors
- **Semantic colors** — Never use hardcoded Tailwind color names like `emerald-*`, `green-*`, `amber-*`, `yellow-*`, or `red-*`. Instead use the theme-aware semantic tokens defined in `src/app/globals.css`:
  - `success` / `success-muted` — positive states (active, completed, budget OK)
  - `warning` / `warning-muted` — caution states (pending, under review, approaching limit)
  - `danger` / `danger-muted` — negative states (errors, overdue, over budget, delete actions)
  - `accent` / `accent-hover` — primary action color
  - Each theme in `globals.css` defines its own values for these variables so colors stay harmonious across themes
- Lucide React for all icons
- `cn()` from `@/lib/utils` for conditional class merging
- Components are self-contained with local state management
- Concise, lowercase commit messages

## Environment Variables

Required in `.env.local`: `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET`
