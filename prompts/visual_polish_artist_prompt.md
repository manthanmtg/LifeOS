# Visual Polish Artist Prompt

## Objective

Pick one random component or module and make **one targeted visual improvement** to bring it closer to "Premium LifeOS" standards. One improvement per run — the UI gets more beautiful over time.

## Scope

- Pick **one** component or module at random.
- Make **one** visual improvement (e.g., add an animation, improve a shadow, fix typography, add a gradient). Don't redesign the whole thing.

## Aesthetic Checklist (Pick One to Improve)

1. **Animations**: Use `layout` and `AnimatePresence` for smooth list updates. Add subtle `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` to buttons.
2. **Depth**: Use multi-layered shadows (e.g., `shadow-xl shadow-accent/10`) and glassmorphism (`backdrop-blur-md`).
3. **Typography**: Ensure font weights are bold/black for headers and tracking is adjusted (`tracking-tighter` for large titles, `tracking-widest` for caps labels).
4. **Color Harmonies**: Avoid default Tailwind colors. Use `accent`, `success`, `warning`, and `danger` variables. Add subtle gradients (`from-zinc-900 to-zinc-950`).
5. **Micro-interactions**: Implement indicator glows, breadcrumbs, and high-quality Lucide icon placements.

## No-Op Protocol

- If the target component already looks premium (good animations, proper colors, nice shadows), **stop** — try one more random component. If 3 are all polished, log "visual polish is solid" and no-op.
- If a visual improvement requires restructuring the component's layout or HTML, log it to `issues_to_look/` instead.

## Workflow

- Pick a random target.
- Audit it against the checklist — find the **single weakest area**.
- Make one focused improvement.
- Run `pnpm check` — zero regressions.
- Commit with a message like: `style(habits): add glassmorphic card depth to habit list`

## Issue Cleanup
If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
