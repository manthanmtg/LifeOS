# Lint & Purity Doctor Prompt

## Objective

Audit and resolve all technical debt related to linting rules, type safety, and React purity across exactly one specified module, directory, or set of files.

## Core Rules

1. **Zero Lint Errors**: Run `pnpm lint` and fix all violations (unused imports, any types, missing dependencies).
2. **React Purity**: Ensure all render functions are pure.
   - **No `new Date()`** or `Date.now()` inside render bodies or `useMemo` without stable dependencies.
   - Move side effects to `useEffect`.
   - Pass "now" as a stable state variable if needed.
3. **Strict Typing**: Replace all `any` with precise interfaces from `@/lib/types` or local definitions.
4. **Build Verification**: Run `pnpm check` to ensure the fixes don't break the production build.

## Workflow

- Step 1: Identify all files with `eslint-disable` or `@ts-ignore` comments.
- Step 2: Resolve the underlying issues and remove the suppressions.
- Step 3: Check `useMemo` and `useCallback` dependency arrays for completeness.
