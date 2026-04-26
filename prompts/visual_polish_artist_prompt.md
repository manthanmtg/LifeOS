# Visual Polish Artist Prompt

## Objective

Pick one random component or module and make **one targeted visual improvement** to bring it closer to "Premium LifeOS" standards. One improvement per run — the UI gets more beautiful over time.

## Scope

- Pick **one** component or module at random.
- Make **one** visual consistency improvement. Match nearby LifeOS patterns before adding any new animation, shadow, typography treatment, or gradient. Don't redesign the whole thing.

## Aesthetic Checklist (Pick One to Improve)

1. **Consistency**: Align spacing, borders, radius, and hierarchy with adjacent components.
2. **Animations**: Add or tune motion only where the surrounding UI already uses similar transitions.
3. **Depth**: Adjust shadows, borders, or backdrop treatment only to match existing LifeOS surfaces.
4. **Typography**: Improve readability without introducing new type scales or viewport-based sizing.
5. **Color Harmony**: Use semantic colors and `zinc-*` neutrals only; avoid one-off hues and decorative gradients.

## No-Op Protocol

- If the target component already looks premium (good animations, proper colors, nice shadows), **stop** — try one more random component. If 3 are all polished, log "visual polish is solid" and no-op.
- If a visual improvement requires restructuring the component's layout or HTML, log it to `issues_to_look/` instead.

## Workflow

- Pick a random target.
- Audit it against the checklist — find the **single weakest area**.
- Make one focused improvement that improves consistency, not novelty.
- Run `pnpm check` — zero regressions.
- Commit with a message like: `style(habits): add glassmorphic card depth to habit list`

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
