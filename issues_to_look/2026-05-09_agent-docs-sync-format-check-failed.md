---
sourcePrompt: agent_docs_sync_prompt.md
status: open
createdAt: 2026-05-09T00:47:01.180Z
---

# Agent Docs Sync Blocked By Baseline Formatting

## What Happened

The agent docs sync run found a small documentation drift: `src/proxy.ts`
protects the `/api/maintenance` API namespace, but the middleware guidance in
`AGENTS.md` does not list it.

Before committing that docs update, `pnpm format:check` failed on 61 files that
were outside the run's diff, including existing prompt files, module READMEs,
tests, and source files.

## Proposed Fix

Run a focused formatting cleanup as its own change, or decide whether the
repository should continue requiring full-repo `pnpm format:check` during
autonomous prompt runs.

After baseline formatting is clean, re-apply the small `AGENTS.md` middleware
sync for `/api/maintenance`.

## Why This Run Held Back

Formatting all 61 files would be a broad unrelated diff, and committing the docs
update while the selected prompt's verification command fails would violate the
prompt run contract.
