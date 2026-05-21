# Zod schema tightener verification blocked

## Context

The random prompt selector chose `prompts/zod_schema_tightener.md` on 2026-05-21.

## Attempted change

I identified that nested `HealthProfileSchema` record IDs use `z.string().min(1)`, which accepts whitespace-only IDs and has no max-length bound. A focused failing test confirmed that `conditions: [{ id: "   ", name: "Asthma" }]` currently passes validation.

## Why this was held back

The implementation was reverted because the required `pnpm check` verification failed during TypeScript checking on unrelated existing errors:

- `src/modules/_template/__tests__/AdminView.test.tsx(220,19)`: `startsWith` is called on `URL | RequestInfo`.
- `src/modules/binge/components/BingeForm.tsx(99,7)`: `string` is assigned where the binge type union is expected.
- `src/modules/binge/components/BingeForm.tsx(100,7)`: `string` is assigned where the binge status union is expected.
- `src/modules/recurring-expenses/Widget.tsx(142,11)`: `string` is assigned where a widget variant semantic color type is expected.

## Proposed follow-up

Fix the existing typecheck blockers first, then re-apply the health profile ID tightening with a regression test for blank nested IDs.
