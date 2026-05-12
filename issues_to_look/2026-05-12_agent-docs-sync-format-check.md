---
sourcePrompt: agent_docs_sync_prompt.md
status: open
createdAt: 2026-05-12T02:47:00.000Z
---

# Agent Docs Sync Still Blocked By Baseline Formatting

## What Happened

The 2026-05-12 random selector run selected `prompts/agent_docs_sync_prompt.md` and confirmed the known drift: `src/proxy.ts` protects `/api/maintenance`, but `AGENTS.md` does not list that API family in the Auth & Middleware summary.

The attempted one-line docs update was reverted because the required `pnpm format:check` verification still fails on pre-existing formatting drift across unrelated files.

## Proposed Fix

Either clean the repository-wide Prettier baseline in a dedicated formatting-only branch, or adjust the autonomous prompt verification contract so documentation-only runs can verify only their changed files.

After that baseline decision, re-apply the `/api/maintenance` middleware guidance update in `AGENTS.md`.

## Why This Run Held Back

Shipping the docs update while the selected prompt's required verification command fails would violate `prompts/README.md` and `prompts/agent_docs_sync_prompt.md`.
