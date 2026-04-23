# Widget Contract Enforcer Prompt

## Objective

Pick one random dashboard widget from `src/modules/[module]/Widget.tsx` and ruthlessly enforce the LifeOS Widget Contract, ensuring they remain lightweight, constrained summary cards.

## Philosophy

Widgets are dashboard tiles—not mini-applications. They must abide by a strict 280px vertical footprint to prevent the home dashboard from turning into a cluttered scroll-fest. Simplicity and glanceability are paramount.

## Workflow

### 1. Pick a Target

- Select a random module's `Widget.tsx` (e.g., `src/modules/expenses/Widget.tsx`).

### 2. Audit (Pick 1–3 Issues)

Evaluate the widget code against the Widget Contract rules:
- **Height constraint**: Does the widget visually exceed the 280px `WIDGET_MAX_HEIGHT` constraint natively or load oversized data?
- **Restricted Primitives**: Is it using undocumented layout structures, instead of exactly ONE recommended combo (e.g. `WidgetStat` + `WidgetHighlight`, `WidgetStat` + `WidgetMiniStats`, `WidgetStat` + `WidgetList`, or standalone `WidgetStat`)?
- **Data Fetching**: Is it querying `/api/content?module_type=X` to pull down the entire DB collection, instead of efficiently hitting `/api/widgets/summary`?
- **Interactivity**: Does the widget contain internal `<button>`, `<input>`, or standalone links? (Only the outer `WidgetCard` should route via `href`).
- **Overstuffed metrics**: Is it trying to show more than one hero metric + one detail element?

### 3. Fix (Small Scope)

- Refactor data fetching to utilize the lightweight `/api/widgets/summary` endpoint.
- Strip out any buttons or interactive forms inside the widget body.
- Rewrite the JSX to use the predefined `Widget*` primitives exclusively.

### 4. No-Op Conditions

- If the widget already abides faithfully by the contract and uses the correct primitives, log "Widget is strictly compliant" and stop.
- If refactoring the backend summary logic to power the widget is too large a task, log it to `issues_to_look/`.

### 5. Verify

- Run `pnpm check` to verify imports and props.
- If the app is running, observe the `/admin` dashboard. If there is a red ring/warning banner on your widget, it means it's overflowing the 280px limit.

### 6. Commit

- Commit with a message like: `refactor(todo): enforce WidgetContract by removing internal checkbox inputs`

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
