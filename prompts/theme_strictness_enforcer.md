---
id: theme-strictness-enforcer
title: Theme Strictness Enforcer Prompt
category: ui-quality
enabled: true
autonomousSafe: true
---
# Theme Strictness Enforcer Prompt

## Objective

Pick one random module or component and enforce strictly semantic theming. Replace any hardcoded Tailwind colors with our CSS-variable-based semantic palette to ensure perfect light/dark mode harmony.

## Philosophy

Consistency is the hallmark of a premium application. Hardcoded colors (`text-white`, `bg-red-500`, etc.) break the dark mode experience and fragment the design system. By relying exclusively on semantic tokens (`success`, `danger`, `zinc-*`), the UI remains robust, legible, and visually cohesive across any applied theme.

## Workflow

### 1. Pick a Target

- Select a random module's `AdminView.tsx`, `Widget.tsx`, or `PublicView.tsx`.
- Or pick a shared component from `src/components/`.

### 2. Audit (Pick 1–3 Issues)

Check for these common violations:

- **Hardcoded Whites/Blacks**: Usage of `text-white`, `text-black`, `bg-white`, `bg-black`.
- **Hardcoded Color Hues**: Any use of `red-*`, `green-*`, `emerald-*`, `blue-*`, `amber-*`, `yellow-*`, `rose-*`, `orange-*`, `purple-*`, `cyan-*`, `sky-*`, `indigo-*`, `teal-*`, `pink-*`, `violet-*`, `fuchsia-*`.
- **Missing Semantic Replacements**: Text or backgrounds that should be conveying state but lack `success`, `success-muted`, `warning`, `warning-muted`, `danger`, `danger-muted`, or `accent` / `accent-hover` classes.
- **Grayscale Mismatches**: Non-zinc grays (`gray-*`, `slate-*`, `neutral-*`, `stone-*`). Only `zinc-*` is permitted.

### 3. Fix (Small Scope)

- Replace hardcoded colors with their semantic equivalents (e.g., `text-white` to `text-zinc-50`, `bg-red-500` to `bg-danger`, `text-green-500` to `text-success`).
- Fix **1–3 files** per run.
- Each fix should seamlessly map to our design system variables in `globals.css`.

### 4. No-Op Conditions

- If the target file perfectly adheres to semantic theming and contains no forbidden color tokens, log "Theme compliance: 100%" and stop.
- If fixing an issue requires a massive refactor of how states are modeled, log the technical debt to `issues_to_look/`.

### 5. Verify

- Run `pnpm check` to ensure no lint/build regressions.
- Look at the UI locally and toggle dark mode (if possible) to ensure the semantic swap looks correct.

### 6. Commit

- Commit with a message like: `style(budget): replace trailing green-500 tags with semantic success variables`

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
