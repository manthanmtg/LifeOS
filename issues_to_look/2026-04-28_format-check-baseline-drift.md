# Format Check Baseline Drift

## Issue

`pnpm format:check` currently fails on files that were not touched by the agent docs sync run, including prompt markdown files and several existing source files.

## Evidence

- `pnpm format:check` reports Prettier warnings in 29 existing files.
- `pnpm exec prettier --check AGENTS.md prompts/prompts_metadata.json` passes.
- `git diff --check` passes.
- `pnpm check` passes with lint, typecheck, build, and 288 tests.

## Proposed Fix

Run a dedicated formatting cleanup in a separate review so the broad Prettier-only churn is isolated from functional or documentation changes.

## Why Held Back

The selected prompt only allows a small agent documentation sync, and formatting 29 unrelated files would expand the run beyond the intended scope.
