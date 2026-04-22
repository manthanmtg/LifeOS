# Typecheck OOM During `pnpm check`

- Selected prompt: `prompts/accessibility_improver.md`
- Attempted target: `src/components/ui/ImagePreview.tsx`
- Held back because `pnpm check` failed during verification, so the prompt requires reverting the code change.
- `pnpm lint` completed with existing warnings, then `pnpm typecheck` aborted with `Reached heap limit Allocation failed - JavaScript heap out of memory`.
- This blocks safe autonomous improvements because every successful run is supposed to finish with a clean `pnpm check`.
- Proposed fix: raise the Node heap for typecheck/build in CI or `package.json`, and/or reduce TypeScript memory pressure per the repo guidance in `AGENTS.md`.

## Resolution

- Updated `package.json` so both `typecheck` and `build` run with `node --max-old-space-size=4096`.
- Narrowed `tsconfig.json` `include` globs to the app source and explicit config entry points instead of scanning the whole repository.
- Verified on April 22, 2026 with `pnpm check`: lint completed with existing warnings, typecheck passed, build passed, and Vitest passed with 50 test files / 186 tests.
