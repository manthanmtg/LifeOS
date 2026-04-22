# Typecheck OOM During `pnpm check`

- Selected prompt: `prompts/accessibility_improver.md`
- Attempted target: `src/components/ui/ImagePreview.tsx`
- Held back because `pnpm check` failed during verification, so the prompt requires reverting the code change.
- `pnpm lint` completed with existing warnings, then `pnpm typecheck` aborted with `Reached heap limit Allocation failed - JavaScript heap out of memory`.
- This blocks safe autonomous improvements because every successful run is supposed to finish with a clean `pnpm check`.
- Proposed fix: raise the Node heap for typecheck/build in CI or `package.json`, and/or reduce TypeScript memory pressure per the repo guidance in `AGENTS.md`.
