# Loading Skeleton Auditor Prompt

## Objective

Pick one random module, page, or dynamic import block and ensure it utilizes a rich skeleton/shimmer loading state rather than a blank screen or a plain text "Loading..." indicator.

## Philosophy

A premium user experience masks latency with beautiful, contextual loading indicators. Blank screens cause confusion; bare spinners look unpolished. Presenting a skeleton that matches the eventual content structure provides the perception of speed and reliability.

## Workflow

### 1. Pick a Target

- Select a dynamic Next.js App Router layout/page (`src/app/**/loading.tsx` or `page.tsx`).
- Select a module's `AdminView.tsx` or `Widget.tsx` that fetches client-side data.
- Check a `next/dynamic` import statement.

### 2. Audit (Pick 1–3 Issues)

Check for these common gaps:

- **Missing Next.js Loaders**: Missing `loading.tsx` in a route group that incurs server-side fetching latency.
- **Basic Spinners/Text**: Components that conditionally render `<div>Loading...</div>` or `<Spinner />` instead of a skeleton primitive.
- **Dynamic Import Violations**: `next/dynamic` imports lacking the `{ loading: () => <Skeleton /> }`  *object literal* as the secondary argument.
- **Widget States**: Widgets that fail to track `loading` state to `false` in a `.finally()` block, or fail to render an `animate-pulse` visual.

### 3. Fix (Small Scope)

- Add a skeleton screen leveraging primitives like `SkeletonBlock`, `WidgetSkeleton`, `AdminModuleSkeleton`, or `PublicModuleSkeleton` from `src/components/ui/Skeletons.tsx`.
- Fix the `next/dynamic` import syntax properly.
- Fix **1 component or route** per run.

### 4. No-Op Conditions

- If the selected file already perfectly leverages `Skeletons.tsx` or utilizes native `loading.tsx` cleanly, log "Loading states look polished" and stop.
- If identifying the right loading primitive requires designing new complex shapes, document the need in `issues_to_look/`.

### 5. Verify

- Run `pnpm build` to ensure type bindings and builds function correctly (specifically validating the dynamic import syntax).
- Run `pnpm check`.

### 6. Commit

- Commit with a message like: `perf(crm): inject AdminModuleSkeleton during initial chunk load`

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
