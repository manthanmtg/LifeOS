# Performance tuner run: typecheck failure pre-existing

## Selected prompt
`prompts/performance_tuner.md`

## Failure
`pnpm check` failed in typechecking with errors under `src/modules/emi-tracker/**/*` (`Expected 2-3 arguments, but got 4`).

## Notes
The failure appears unrelated to the `Toast` component optimization in this run.
