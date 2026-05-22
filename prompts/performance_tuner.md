---
id: performance-tuner
title: Performance Tuner Prompt
category: performance
enabled: true
autonomousSafe: true
---
# Performance Tuner Prompt

## Objective

Find and fix **one performance issue** in the LifeOS codebase — unnecessary re-renders, missing memoization, heavy bundle imports, or inefficient data fetching.

## Philosophy

Performance is invisible when it's good and infuriating when it's bad. Each run makes one thing faster, smoother, or lighter. Over time, the app becomes noticeably snappier.

## Workflow

### 1. Pick a Target

Select one area to investigate:
```bash
{ find src/modules -name "AdminView.tsx"; find src/modules -name "Widget.tsx"; find src/components -name "*.tsx"; find src/app/api -name "route.ts"; } | sort -R | head -n 1
```

- A module's `AdminView.tsx` (look for re-render issues)
- A widget in `src/modules/*/Widget.tsx` (look for unnecessary fetches)
- A shared component (look for missing `React.memo` or `useCallback`)
- An API route (look for unindexed queries or over-fetching)
- Bundle size (look for heavy imports that could be dynamic)

### 2. Identify One Issue

Common performance problems:

- **Unnecessary re-renders**: State updates that rebuild the entire component tree. Fix with `React.memo`, `useMemo`, `useCallback`.
- **Missing code splitting**: Large libraries imported statically that should use `next/dynamic` or dynamic `import()`.
- **Redundant fetches**: Multiple components fetching the same data independently. Consider lifting the fetch.
- **Heavy computations in render**: Sorting, filtering, or formatting done on every render without memoization.
- **Unoptimized images**: Missing `next/image` usage, oversized assets.

### 3. Fix (One Issue Only)

- Make **one** targeted fix per run.
- The fix must be clearly an improvement with no behavioral change.
- If fixing requires restructuring a component, log it to `issues_to_look/` instead.

### 4. No-Op Protocol

- If the component is already highly performant (e.g., no heavy renders, proper memoization, lightweight imports), pick another. If 3 checks come back clean, log "performance is solid" and **stop**.
- Do NOT add `useMemo` or `useCallback` blindly if the work being memoized is trivial; this adds overhead rather than saving it.

### 5. Verify

- Run `pnpm check` — zero regressions.
- If possible, verify the improvement is observable (faster load, fewer renders).

### 6. Commit

- Commit with a message like: `perf(dashboard): memoize widget grid to prevent re-renders on tab switch`

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
