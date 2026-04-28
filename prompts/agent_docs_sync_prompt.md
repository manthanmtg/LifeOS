---
id: agent-docs-sync-prompt
title: Agent Docs Sync Prompt
category: documentation
enabled: true
autonomousSafe: true
---
# Agent Docs Sync Prompt

## Objective

Keep `AGENTS.md` and `CLAUDE.md` accurate as the LifeOS project evolves. This prompt audits recent code, config, and workflow changes, then makes one small documentation sync if agent guidance has drifted.

## Philosophy

Agent docs are operational controls, not marketing docs. They should describe current commands, architecture, conventions, and known hazards precisely enough that future autonomous runs make safer choices.

## Workflow

### 1. Read the Run Contract

- Read `prompts/README.md` first.
- Follow `AGENTS.md` as the source of truth for repository-wide agent guidance.
- Treat `CLAUDE.md` as Claude-specific orientation that should point to, not duplicate, the full guidance in `AGENTS.md`.

### 2. Audit for Drift

Check one small area per run:

- **Commands**: Compare `package.json` scripts with the commands documented in `AGENTS.md`.
- **Architecture**: Check whether module, API, auth, data-layer, or widget guidance still matches the current code.
- **Tooling**: Check current framework/library versions in `package.json` against documented architecture notes.
- **Prompt workflow**: Check whether prompt automation rules in `prompts/` are reflected in agent-facing guidance when relevant.
- **CLAUDE handoff**: Confirm `CLAUDE.md` still points Claude agents to the right canonical files and does not contain stale duplicated rules.

### 3. Fix One Documentation Gap

- Update **only `AGENTS.md`, `CLAUDE.md`, or both**.
- Keep the diff small and factual. Do not rewrite whole sections.
- Prefer updating `AGENTS.md` for canonical project guidance.
- Prefer updating `CLAUDE.md` only when Claude-specific orientation or cross-links are stale.
- If the docs already match the code, no-op and log "agent docs are current".

### 4. No-Op Conditions

- If fixing the drift requires deciding a new policy, log the question in `issues_to_look/` instead of inventing one.
- If the apparent drift is caused by unmerged branch work, do not document it as canonical yet. Log a note or wait until it lands.
- If `AGENTS.md` and `CLAUDE.md` are already accurate for the audited area, stop.

### 5. Verify

- Run `pnpm format:check`.
- If any code-adjacent examples changed, run `pnpm check`.
- Confirm all links and referenced file paths exist.

### 6. Commit

- Commit with a message like: `docs(agents): sync agent guidance with current scripts`.
- In the commit body, list the audited area and the specific drift fixed.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to `issues_to_look/resolved/`.
