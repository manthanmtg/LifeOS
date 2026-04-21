# Module Generator Prompt

> **⚠️ NOT FOR AUTONOMOUS USE.** This prompt creates entirely new modules, which is a drastic change. It should only be executed when a human explicitly requests a new module. If `random_selector.md` picks this prompt, **no-op** — skip and do nothing.

## Objective

Generate a complete, standard-compliant LifeOS module based on a user-provided name and core feature set.

## Requirements

1. **Registry**: Add the module to `src/registry.ts` with a suitable Lucide icon and `contentType`.
2. **Schema**: Define a Zod schema in `src/lib/schemas.ts` and register it in `SchemaRegistry`.
3. **Structure**: Create `src/modules/[name]/` with:
   - `AdminView.tsx`: Full CRUD interface using `/api/content`.
   - `Widget.tsx`: Dashboard summary card.
   - `PublicView.tsx` (if `is_public` is true).
4. **Integration**: Update `src/app/admin/page.tsx` with a dynamic import for the new Widget.
5. **Sidebar**: Add the module icon to `IconMap` in `src/components/shell/AdminSidebar.tsx`.

## Design Guidelines

- Follow the `_template` folder for structure.
- Use `SkeletonBlock` and `WidgetSkeleton` for loading states.
- Ensure all interactive components have `"use client"`.
- Use the semantic color system (`accent`, `success`, etc.).

## Issue Cleanup
If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
