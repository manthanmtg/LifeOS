# Lint & Purity Doctor Prompt

## Objective

Audit and resolve technical debt related to linting rules, type safety, and React purity in **one randomly selected module or directory**. Fix a small batch of issues per run.

## Scope

- Pick **one** module from `src/modules/` or one directory from `src/lib/`, `src/components/`, or `src/app/api/`.
- Fix **at most 5–10 lint/type issues** per run. Don't try to clean the whole project at once.

## Core Rules

1. **Zero Lint Errors**: Run `pnpm lint` and fix violations in the targeted area (unused imports, any types, missing dependencies).
2. **React Purity**: Ensure render functions are pure.
   - **No `new Date()`** or `Date.now()` inside render bodies or `useMemo` without stable dependencies.
   - Move side effects to `useEffect`.
   - Pass "now" as a stable state variable if needed.
3. **Strict Typing**: Replace `any` with precise interfaces from `@/lib/types` or local definitions.
4. **Build Verification**: Run `pnpm check` to ensure fixes don't break the production build.

## No-Op Protocol

- If `pnpm lint` passes cleanly for the targeted area and no `any` types or `eslint-disable` comments exist, **stop — the area is clean.**
- If a fix would require restructuring a component (>30 lines changed), log it in `issues_to_look/` instead.

## Workflow

- Step 1: Pick a random module/directory.
- Step 2: Identify files with `eslint-disable` or `@ts-ignore` comments.
- Step 3: Resolve the underlying issues and remove the suppressions.
- Step 4: Check `useMemo` and `useCallback` dependency arrays for completeness.
- Step 5: Run `pnpm check` and confirm zero regressions.

## Issue Cleanup
If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
