# Performance tuner run: typecheck failure pre-existing

## Selected prompt

`prompts/performance_tuner.md`

## Failure

`pnpm check` failed in typechecking with errors under `src/modules/emi-tracker/**/*` (`Expected 2-3 arguments, but got 4`).

During the 2026-05-21 06:46 UTC performance tuner run, `pnpm check` failed before build/test with the same `src/modules/emi-tracker/**/*` formatter-call type errors. It also reported `src/modules/slides/PublicView.tsx(95,49)` where a React mouse event is passed to a handler typed as `{ key?: string }`.

## Notes

The failures appear unrelated to the selected Zen Mode performance review in this run.
