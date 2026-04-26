# Prompt Run Contract

These prompts are intended for small, autonomous LifeOS improvements. Every prompt run must follow this contract before applying prompt-specific instructions.

## Required Setup

1. Read `AGENTS.md` and follow repository instructions.
2. Check `git status --short` before editing.
3. If the worktree has unrelated changes, do not stage or revert them.
4. Pick one small, reviewable change. Prefer no-op plus an `issues_to_look/` note when unsure.

## Safety Rules

- Do not rewrite whole modules during autonomous runs.
- Do not add internal widget buttons, forms, inputs, or standalone links. Dashboard widgets route only through `WidgetCard`'s `href`.
- Do not use forbidden hardcoded Tailwind color tokens. Use semantic colors and `zinc-*` neutrals from `AGENTS.md`.
- Match nearby UI patterns before adding new visual treatment.
- Do not create new modules unless a human explicitly asks for that module.

## Verification

After code changes, run:

```bash
pnpm check
```

If TypeScript or build verification runs out of memory, retry once with:

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm check
```

If verification still fails, revert only your own changes, log the failure in `issues_to_look/`, and stop.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to `issues_to_look/resolved/`.
