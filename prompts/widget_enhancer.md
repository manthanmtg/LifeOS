# Dashboard Widget Enhancer Prompt

## Objective

Select a random module and ensure its dashboard widget (`Widget.tsx`) is a high-fidelity, "LifeOS Premium" summary of the module's state. It must be perfectly in sync with the data and capabilities of the module's `AdminView.tsx` and provide immediate, meaningful value to the user at a glance.

## Workflow

### 1. Module Selection

- Pick a random module from `src/modules/` (excluding `_template`).
- Identify its `Widget.tsx` and its main data entry/view (usually `AdminView.tsx` or similar).

### 2. Synchronization & UX Audit

- **Data Parity**: Does the widget reflect the most important data points available in the module?
- **User Value**: From a user's perspective, does the widget show what they need to see _right now_? (e.g., for `expenses`, current month total; for `habits`, today's progress).
- **Visual Polish**: Does it use the "LifeOS Premium" aesthetic (glassmorphism, semantic colors, Lucide icons, smooth transitions)?
- **Empty States**: Does it handle "no data" or "loading" states gracefully with shimmer/skeletons?
- **Navigation**: Does the outer `WidgetCard` route to the correct module via `href`? Do not add internal quick actions.

### 3. Enhancement Pass (One Small Improvement)

- Make **one targeted improvement** per run. Don't redesign the whole widget.
- Examples of single improvements: add a loading skeleton, fix a missing semantic color, add one meaningful metric, improve empty state copy.
- Use `framer-motion` for subtle animations.
- Use semantic colors (`success`, `warning`, `danger`, `accent`).
- Respect the Widget Contract: no internal `<button>`, `<input>`, form, or standalone link elements inside widgets. The whole card is the action.
- If the widget is already polished, check up to 2 more modules. If all are good, **no-op** — log "all widgets look great" and stop.

### 4. No-Op Protocol

- If the widget already follows the Widget Contract, has proper loading states, uses semantic colors, and shows useful data — **stop**.
- If improving the widget would require changing the API or backend data, log it to `issues_to_look/` instead of making the change.

### 5. Verify & Commit

- Run `pnpm check` — zero regressions.
- Create a descriptive, lowercase commit message (e.g., `feat(binge): add loading skeleton to dashboard widget`).
- Commit and push or create PR as clarified by user.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
