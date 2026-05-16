# Agent docs sync blocked by existing formatting drift

## Context

The `agent_docs_sync_prompt.md` run audited command and tooling guidance in `AGENTS.md` and `CLAUDE.md`. The documented scripts and framework notes matched the current repository state, so no agent documentation change was needed.

## Blocker

The prompt requires `pnpm format:check`, but that command currently fails on existing files that were not touched by this run. The failure listed broad Prettier drift across `issues_to_look/`, `prompts/`, and multiple `src/` files.

## Proposed fix

Run a dedicated formatting cleanup in a separate branch, or narrow the prompt verification rule so documentation-only no-op runs can verify only the files touched by the run.

## Why held back

Formatting 70+ unrelated files would make this autonomous documentation run too large for quick review and would violate the small-change scope in `prompts/README.md`.
