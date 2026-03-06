# Contributing to Life OS

Thank you for your interest in contributing! This document outlines the conventions and workflow for extending Life OS with new modules.

## Module Development Contract

Every module in Life OS lives in `src/modules/[name]/` and follows a strict **Separation of Concerns** pattern.

### Required Exports

| File | Purpose |
|------|---------|
| `AdminView.tsx` | The management interface (rendered at `/admin/[name]`) |
| `Widget.tsx` | Dashboard summary card (shown on the Command Center grid) |
| `View.tsx` | *(Optional)* Public-facing page for visitor-visible modules |

### Adding a New Module (< 30 Minutes)

1. **Create the module folder:**
   ```bash
   mkdir src/modules/your-module
   ```

2. **Add a Zod schema** to `src/lib/schemas.ts`:
   ```ts
   export const YourSchema = z.object({
     title: z.string().min(1),
     // ... your fields
   });
   ```
   Register it in the `SchemaRegistry` at the bottom of the file.

3. **Register the module** in `src/registry.ts`:
   ```ts
   your_module: { name: "Your Module", icon: "Star", defaultPublic: false }
   ```
   Icons must be valid [Lucide React](https://lucide.dev/icons/) component names.

4. **Add the icon** to the `IconMap` in `src/components/shell/AdminSidebar.tsx`.

5. **Create `AdminView.tsx`** — use any existing module as a reference. Data is stored via:
   ```ts
   // Save
   fetch("/api/content", {
     method: "POST",
     body: JSON.stringify({ module_type: "your_module", is_public: false, payload: { ... } })
   });
   // Read
   fetch("/api/content?module_type=your_module");
   ```

6. **Create `Widget.tsx`** — a summary card for the dashboard.

7. **Add the widget** to `src/app/admin/page.tsx` following the existing pattern.

That's it — **zero database setup required.** The polymorphic `content` collection handles everything.

## Code Style

- **"use client"** directive at the top of all interactive components
- **Tailwind CSS** with `zinc-*` palette + `accent` CSS variables
- **Lucide React** for all icons
- **cn()** utility from `@/lib/utils` for conditional classes
- Components should be self-contained with their own state management

## Data Architecture

All module data uses the **polymorphic pattern** — a single `content` collection with:
- `module_type` — discriminator field (e.g., `"expense"`, `"blog_post"`)
- `payload` — typed object validated by Zod before insertion
- `is_public` — controls public visibility
- Timestamps auto-managed by the API

## Commit Convention

Use concise, lowercase commit messages describing what changed.
