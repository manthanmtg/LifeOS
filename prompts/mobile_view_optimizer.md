---
id: mobile-view-optimizer
title: Mobile View Optimizer Prompt
category: ui-quality
enabled: true
autonomousSafe: true
---
# Mobile View Optimizer Prompt

## Objective

Find and fix one mobile usability issue in LifeOS without changing desktop behavior or broad app architecture.

## Scope

Pick one small, user-facing surface:

- a dashboard widget in `src/modules/*/Widget.tsx`
- a module admin view
- a shared layout or navigation component
- a loading, empty, or error state visible on small screens

Optimize one issue only.

## Mobile Checklist

- Remove horizontal overflow at common mobile widths.
- Keep tap targets at least 44px where practical.
- Make dense rows, controls, and cards wrap or stack cleanly.
- Preserve readable text sizes without viewport-based font scaling.
- Keep important actions reachable without awkward scrolling or overlap.
- Use existing semantic colors, `zinc-*` neutrals, spacing, and component patterns.

## Workflow

### 1. Audit

Pick one target to audit at mobile and desktop widths:
```bash
{ find src/modules -name "Widget.tsx"; find src/modules -name "AdminView.tsx"; find src/components -name "*.tsx"; find src/app -name "loading.tsx"; } | sort -R | head -n 1
```
Review the target through code inspection, existing responsive classes, and nearby layout patterns. Prefer fixes where the issue is visible from the markup or styles.

### 2. Fix One Thing

Make the smallest safe change that improves mobile view while preserving desktop layout. Do not redesign the target, introduce dependencies, or rewrite component structure.

### 3. No-Op Conditions

Log an issue in `issues_to_look/` and stop if:

- the target is already mobile-safe
- the fix requires a broad layout rewrite
- the behavior cannot be verified safely from local context
- another existing issue note already tracks the same problem

### 4. Verify

- Run `pnpm check`.
- Run `git diff --check`.
- If the app is already running, inspect the changed surface at mobile and desktop widths.

### 5. Commit

Use a message like `fix(ui): improve mobile widget layout`.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved or found to be resolved, move it to `issues_to_look/resolved/`.
