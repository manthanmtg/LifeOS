# Lint & Purity Doctor run blocked by navigation mock test

- Selected prompt: `lint_and_purity_doctor_prompt.md`
- Scoped change made: `src/modules/binge/components/BingeCard.tsx`
  - Replaced `img` with `next/image` and removed `@next/next/no-img-element` suppression.

## Verification outcome
- `pnpm check` fails in `src/test/mocks/navigation.test.ts` (`exposes push, replace, prefetch, and back as spies`) with:
  - `expected 'vi.fn()' to be 'push'`
- This failure is unrelated to the `src/modules/binge` change and existed independently of this run.

## Proposed next step
- Restore mock name expectations in the navigation mock helper (likely in `src/test/mocks/navigation.ts` or related setup) so `push` has mock name `"push"`, or update the assertion to a robust expectation compatible with the current Vitest mock behavior.
