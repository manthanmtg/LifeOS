# Agent Docs Sync Blocked By Existing Formatting Drift

## Context

The random selector chose `prompts/agent_docs_sync_prompt.md` on 2026-05-09.

## Audited Area

Auth middleware guidance in `AGENTS.md` was compared with `src/proxy.ts`.

## Finding

`src/proxy.ts` protects `/api/maintenance` as an admin-only API family, while the `AGENTS.md` middleware summary omits that path.

## Proposed Fix

Add `/api/maintenance` to the protected API families listed in the `AGENTS.md` Auth & Middleware section.

## Why Held Back

The required `pnpm format:check` verification failed on pre-existing formatting issues across unrelated files. Per the prompt run contract, the documentation change was reverted and this note was logged instead of shipping a change without passing required verification.
