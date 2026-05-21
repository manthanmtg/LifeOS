# Visual polish run failed pre-existing lint check

## Observed
`pnpm check` fails with ESLint warning in `src/modules/calculators/PublicView.tsx`:
`react-hooks/set-state-in-effect` on `setActiveCalculatorId` inside a synchronous effect.

## Impact
The failure is unrelated to the selected visual polish change (`src/modules/ideas/components/IdeaFormPanel.tsx`) and blocks the prompt’s required verification step.

## Suggested fix
Refactor the effect in `PublicView.tsx` so `setActiveCalculatorId` is set in a deferred/effect callback rather than synchronously inside the body.
