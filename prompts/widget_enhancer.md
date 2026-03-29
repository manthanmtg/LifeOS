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
- **Quick Actions**: Does it offer "one-tap" actions if appropriate (e.g., "Log Expense", "Check Habit")?

### 3. Enhancement Pass

- If the widget is "out of sync" or lacks "wow" factor, enhance it.
- Use `framer-motion` for subtle animations.
- Use semantic colors (`success`, `warning`, `danger`, `accent`).
- **CRITICAL**: If the widget is already "perfect", **pick another random module** and repeat.

### 4. Reporting & Submission

- If all modules checked are already optimal, report that everything seems fine.
- Otherwise, submit the enhanced widget with a clear explanation of what was improved.

### 5. Commit & Push

- Create a descriptive, lowercase commit message following the `AGENTS.md` guidelines (e.g., `feat(binge): enhance dashboard widget with quick progress actions`).
- Commit the changes and push to the remote branch. or create PR as clarified by user.
