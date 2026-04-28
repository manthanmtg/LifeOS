---
id: random-module-enhancer-prompt
title: Random Module Enhancer Prompt
category: feature-quality
enabled: true
autonomousSafe: true
---
# Random Module Enhancer Prompt

## Objective

Pick exactly one random module from `src/modules/` (excluding `_template`) and make it genuinely better — cleaner code, tighter UI, and a smoother experience. The primary focus is incremental, practical improvement. Smart features (metrics, quick actions, trends, automations) are welcome when they add real value, but they're a bonus, not the goal.

## Workflow

### 1. Audit

- **Pick a module**: Randomly select ONE module directory.
- **Read everything**: Understand every file, every feature, every data point it handles.
- **Spot problems**: Monolithic files (>300 lines), messy state, `any` types, missing loading states, hardcoded colors, cramped or wasteful layouts, confusing labels, bad mobile experience.
- **Spot opportunities**: Look for places where a smart addition would genuinely help — a trend line on data that changes over time, a quick-action shortcut for a frequent task outside dashboard widgets, or a summary metric that saves scrolling. Only flag these if they'd actually be useful.
- **Map all features**: List every existing capability. Nothing gets dropped — features can move or get reorganized, but they must all remain accessible.

### 2. Refactor

- **Break up large files**: Extract logical sub-components (`[Module]Metrics`, `[Module]List`, `[Module]Card`, etc.) when a file is doing too much.
- **Share common patterns**: If the module builds something generic (viewer, carousel, reusable card), move it to `src/components/ui/`.
- **Fix render purity**: Move `new Date()`, `Date.now()`, and similar calls out of the render path into `useMemo`/`useEffect` or module-level constants.
- **Tighten types**: Replace `any` with proper interfaces.

### 3. Improve the UI

- **Compact, not cramped**: High information density without wasted space. Reduce oversized padding, unnecessary large text, and visual bloat.
- **Responsive**: Must work well on mobile — proper touch targets, adaptive grids, no horizontal overflow.
- **Consistent styling**: Use the semantic color system (`accent`, `success`, `warning`, `danger`, `zinc-*` neutrals). No hardcoded Tailwind color names. Follow the rules in `AGENTS.md`.
- **Smooth interactions**: Use `framer-motion` for meaningful transitions (list reordering, modals, tab switches). Add loading skeletons where data is fetched.
- **Clear language**: Labels and empty states should be human and direct, not jargon-heavy or theatrical.

### 4. Verify

- **Playwright MCP**: If possible, use the Playwright MCP to verify visually that nothing is messed up by taking screenshots or performing other programmatic visual verification.
- **Build check**: Run `pnpm check` — zero lint, type, or test regressions.
- **Add tests if missing**: Cover critical user flows and complex logic with Vitest.
- **Responsive check**: Verify all breakpoints look right.

### 5. Commit

- **Descriptive message**: Summarize what changed and why. List specific refactors, UI fixes, and any new capabilities.

## Scope Guardrail

**One small slice per run.** Do NOT rewrite an entire module in a single pass. Pick the **one weakest aspect** (e.g., one messy component, one missing loading state, one bad mobile layout) and fix that. The module gets better over many runs, not one.

## No-Op Protocol

Before making changes, ask:

1. Is this module already in good shape? (Clean types, good UI, responsive, tested)
2. Would my change touch more than ~100 lines of diff?
3. Am I unsure whether this change is safe?

If yes to any of these, **do NOT change code.** Instead, log what you found and what you'd recommend in `issues_to_look/YYYY-MM-DD_<module-slug>.md` and stop.

## Principles

- **Keep it simple**: Don't add complexity for its own sake. Every change should have a clear reason.
- **No feature regression**: Everything the old version did, the new version does — just better.
- **Useful data**: If the module tracks data, surface it meaningfully. Don't add metrics or charts just to fill space.
- **Smart where it counts**: Trends, sparklines, quick actions outside widgets, and automations are great — when they solve a real problem. Don't add them just to look clever.
- **Frictionless actions**: Common tasks should be fast and obvious. Feedback should be immediate.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
