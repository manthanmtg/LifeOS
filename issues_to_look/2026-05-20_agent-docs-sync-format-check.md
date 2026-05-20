# Agent Docs Sync Format Check Blocker

## Prompt

`prompts/agent_docs_sync_prompt.md`

## What happened

The agent docs audit found a small wording drift in `AGENTS.md`: `src/proxy.ts`
protects the reserved `/api/maintenance` prefix, but there is no corresponding
route under `src/app/api/maintenance`.

The proposed documentation fix was reverted because prompt verification failed.
`pnpm format:check` reported existing Prettier issues across many tracked files,
including prompt files, issue notes, and source files unrelated to this run.

## Proposed fix

After the repository-wide formatting backlog is addressed, update the auth
guidance in `AGENTS.md` to describe `/api/maintenance` as a reserved protected
prefix rather than an implemented API family.

## Why this was held back

The random prompt contract requires stopping when verification fails. The
formatting failure was pre-existing and broad enough that fixing it in this
documentation prompt would not be a small, reviewable change.
