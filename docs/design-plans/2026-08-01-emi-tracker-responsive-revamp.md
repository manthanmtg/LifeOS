# EMI Tracker Responsive Recovery and Visual Revamp

**Date:** 2026-08-01

**Status:** Ready for implementation

**Primary route:** `/admin/emi-tracker`

**Scope:** Corrective UI/UX revamp of the implemented Payoff Observatory

**Supersedes:** The responsive shell, portfolio composition, and visual styling
sections of `2026-07-30-emi-tracker-ui-overhaul.md`. The earlier document remains
the source for retained financial capabilities and information architecture.

## Goal

Turn the current EMI Tracker into a calm, modern financial workspace that is
easy to scan, works inside the actual LifeOS admin shell, and never collapses
when its components are placed in narrow columns.

The completed screen must answer these questions without scrolling through
decorative or empty UI:

1. What is the outstanding balance?
2. What payment is due next?
3. What is the monthly commitment?
4. Which loan needs attention?
5. How does an extra payment change the payoff date and interest?

This is a presentation and interaction correction. Preserve the data model,
financial calculations, CRUD behavior, exports, URL state, and dashboard widget
contract.

## Current State

### What is actually wrong

The attached screenshot shows a deterministic responsive-layout failure, not a
bad data record.

`AdminView.tsx` changes the page to a fixed `320px` loan sidebar at the `xl`
viewport breakpoint:

```text
xl:grid-cols-[320px_minmax(0,1fr)]
```

Inside that sidebar, `PortfolioHero.tsx` also reacts to the `xl` viewport and
changes itself to this two-column layout:

```text
xl:grid-cols-[1fr_280px]
```

The child does not know it is only about 320px wide. After padding and the 24px
gap, the first column has effectively no usable width. `break-words` on the
large amount then allows the formatted currency value to wrap one character at
a time. The same viewport-versus-container assumption appears in the selected
loan workspace and can produce a second set of cramped layouts at intermediate
desktop widths.

The LifeOS shell makes this easier to trigger:

- The desktop navigation consumes `256px`.
- The admin page adds `32px` gutters per side at `lg`.
- The content wrapper is capped at `max-w-7xl`.
- A `1280px` browser therefore does not provide a `1280px` module canvas.

The earlier design plan treated browser breakpoints as if they represented the
module's available width. They do not.

### UX and visual problems visible in the screenshot

- The total balance is unreadable because the amount wraps vertically.
- `Total outstanding` and `Next EMI` overlap.
- The summary panel becomes roughly 1,000px tall and pushes the loan list below
  the fold.
- The no-selection workspace reserves at least `560px` for a large dashed empty
  panel even though three active loans exist.
- The first useful action after `Add loan`, selecting an existing loan, is not
  visible in the first viewport.
- Summary cards are nested inside a summary card, producing weak hierarchy.
- Large radii, translucent surfaces, blurred color spots, and repeated shadows
  make an operational finance tool feel decorative and soft.
- Nearly every control and panel uses the same rounded-card treatment, so
  filters, metrics, navigation, forms, charts, and records compete equally.
- `Interest saved: 0` receives the same prominence as the next payment even
  when it has no useful portfolio-level story.
- Amounts use `break-words`, which is unsafe for financial values and account
  identifiers.

### Existing behavior to preserve

- `GET /api/content?module_type=emi_loan` remains the source of loan data.
- Create and edit continue through `/api/content` and `/api/content/[id]`.
- Loan selection and section state remain URL-backed with `loan` and `section`
  query parameters.
- The five destinations remain Overview, Insights, Schedule, Activity, and
  Documents.
- Amortization, prepayment, floating-rate adjustments, processing fees,
  payments, documents, CSV/PDF export, and mixed-currency behavior remain.
- `emi-utils.ts` stays the financial calculation boundary.
- `emi-view-model.ts` stays the presentation calculation boundary.
- The module uses shared LifeOS settings and semantic theme tokens.
- The dashboard widget keeps one hero metric plus one highlight within the
  280px widget contract.

## Requirements

### Responsive layout

- At no supported width may a financial amount wrap one character per line.
- The document must not scroll horizontally at 320px, 375px, 390px, 768px,
  1024px, 1280px, 1440px, 1536px, or 1728px browser widths.
- Portfolio mode, when no `loan` query parameter is selected, must use the full
  module width. It must not render a loan navigator beside an empty workspace.
- Selected-loan mode must be a single detail view until the available desktop
  canvas is wide enough for a useful navigator and at least a 760px workspace.
- The persistent navigator must not contain `PortfolioHero`.
- Below the persistent-navigator breakpoint, selecting a loan replaces the
  portfolio view and provides an obvious `Back to loans` action.
- The first mobile portfolio viewport must contain the header, total balance,
  next EMI context, filter controls, and the start of the loan list.
- The first desktop portfolio viewport must contain at least two loan entries
  when data exists at a 900px viewport height.
- The selected-loan header, balance, payoff runway, and section selector must
  remain visible and coherent at 200% browser zoom.

### Information hierarchy

- Use one dominant portfolio value: total outstanding for a single-currency
  portfolio, or a truthful multi-currency label and breakdown when currencies
  differ.
- Give Next EMI and Monthly commitment secondary emphasis.
- Show Active loans and principal progress as supporting facts.
- Move Interest saved out of the portfolio hero. It belongs in simulation and
  loan insights where its cause is understandable.
- Do not show an instructional empty canvas when loans exist.
- Keep one primary action in the page header: `Add loan`.
- Use actual loan rows/cards as the next most visually prominent interaction.

### Visual system

- Direction: quiet modern fintech ledger, precise and work-focused.
- Use unframed page bands and separators for page-level sections.
- Use cards only for repeated loan records, dialogs, and genuinely framed tools
  such as a chart or simulator.
- Do not place metric cards inside a larger metric card.
- Standard panel/card radius is `rounded-lg` (8px). Compact controls may use
  `rounded-md`; status badges may remain pills.
- Remove blurred decorative circles, decorative gradients, and atmospheric
  shadows from EMI components.
- Use one subtle elevation level for dialogs only. Ordinary page content uses
  borders and surface contrast, not large shadows.
- Use semantic tokens only: `accent`, `accent-hover`, `success`,
  `success-muted`, `warning`, `warning-muted`, `danger`, `danger-muted`, and
  `zinc-*`.
- Continue using Lucide icons. Icon-only buttons require an accessible name and
  tooltip.
- Use the existing font family. Use tabular or monospaced figures for money,
  percentages, dates in data columns, and payment counts.
- Letter spacing must remain normal except for existing small uppercase labels;
  do not use negative tracking.
- Motion is limited to opacity/transform feedback lasting 150-200ms and must
  respect `prefers-reduced-motion`.

### Financial value rendering

- Remove `break-words` from every primary currency value.
- Primary amounts use `whitespace-nowrap`, `tabular-nums`, and a stable fixed
  type step. Do not use viewport-width font scaling.
- Add a small presentation helper that chooses among fixed classes based on the
  formatted string length, for example `text-4xl`, `text-3xl`, or `text-2xl`.
  This helper affects type size only and never changes the value.
- Secondary values use `text-lg` or `text-xl` and may not shrink below readable
  body size.
- If an exact value is too long even at the smallest supported fixed size, keep
  it on one line in a full-width metric row and expose the same exact value in
  its accessible name. Do not silently abbreviate or truncate money.
- Currency symbols and numbers must stay together.

### Interaction and accessibility

- Every interactive target is at least 44x44 CSS pixels.
- Keyboard focus order follows visual order.
- Selected loans use `aria-current`; selected sections use tab semantics on
  larger screens.
- Color is never the only state indicator. Keep labels/icons for active,
  overdue, warning, and closed states.
- Mobile section navigation must not depend on a horizontally clipped tab row.
  Use an accessible menu/select showing the active section below `sm`; render
  the full underline tab row at `sm` and above.
- Loading continues to use rich skeletons. Async actions disable duplicate
  submission and show inline status.
- Errors retain a recovery action and forms retain entered values.
- Destructive actions remain confirmed.
- Charts keep a text summary and exact values available to screen readers.

## Assumptions

- The screenshot reflects the current committed implementation on branch
  `feature/emi-tracker-payoff-observatory`, not an unrelated browser extension
  or stale build.
- The user wants a corrective implementation plan now because
  `/planner-no-questions` was explicitly invoked; this document does not modify
  application code.
- Existing calculations and stored data are trusted. No financial formula or
  schema migration is part of this revamp.
- The LifeOS shell remains `w-64` on desktop with the current page gutters and
  `max-w-7xl` cap.
- Existing themes remap the zinc and semantic token scales. The revamp must look
  correct in every theme without EMI-specific raw colors.
- The current five-section information architecture is useful and remains.
- A persistent desktop loan navigator is valuable only when it does not reduce
  the detail workspace below approximately 760px.
- The dashboard widget is not the source of the attached defect and receives
  only a consistency audit.

## Proposed Design

### 1. Two explicit page modes

The page composition must depend on whether a loan is selected. Do not use one
DOM composition for both modes and hide a large empty half.

#### Portfolio mode: no selected loan

Use the entire module width:

```text
+-----------------------------------------------------------------------+
| EMI Tracker                                      [ + Add loan ]       |
| Know what remains. Finish sooner.                                     |
+-----------------------------------------------------------------------+
| TOTAL OUTSTANDING     | NEXT EMI       | MONTHLY       | PROGRESS     |
| Rs 12,27,261.13       | Rs 11,221      | Rs 35,400     | 62% paid     |
| 3 active loans        | Tiago - Aug 5  | 3 active      | [---------]  |
+-----------------------------------------------------------------------+
| [ Search by loan or lender              ] [Active 3][Closed 0][All 3] |
+-----------------------------------------------------------------------+
| Home loan record      | Car loan record      | Personal loan record   |
| balance, next due     | balance, next due    | balance, next due      |
+-----------------------------------------------------------------------+
```

The summary is one flat band with internal separators. It is not a card
containing three more cards. The loan list begins immediately after a compact
filter toolbar.

On phones, the same structure becomes:

```text
+--------------------------------------+
| EMI Tracker               [ + Add ]  |
| Know what remains. Finish sooner.    |
|                                      |
| TOTAL OUTSTANDING                    |
| Rs 12,27,261.13                      |
| 62% of principal paid  [----------]  |
|                                      |
| NEXT EMI          MONTHLY            |
| Rs 11,221         Rs 35,400          |
| Tiago - Aug 5     3 active loans     |
|                                      |
| [ Search loans...                 ]  |
| [Active 3] [Closed 0] [All 3]        |
|                                      |
| Tiago loan                    >       |
| Rs 4,12,000 left - due Aug 5         |
+--------------------------------------+
```

#### Selected-loan mode

On small and ordinary desktop canvases, show only the selected loan workspace.
The sticky header contains `Back to loans`, loan identity, and Edit.

On genuinely wide canvases, render a compact navigator beside the workspace:

```text
+----------------------+-----------------------------------------------+
| Search loans         | Tiago loan                         [Edit loan]|
| Active | Closed | All| HDFC - Car - Active                           |
|                      +-----------------------------------------------+
| > Tiago              | BALANCE LEFT                                  |
|   Rs 4,12,000        | Rs 4,12,000       62% principal paid          |
|   Due Aug 5          | [Start----Today----------Payoff]               |
|                      | Next EMI | Monthly | Rate | Interest left      |
|   Home loan          +-----------------------------------------------+
|   Rs 8,15,261        | Overview  Insights  Schedule  Activity  Docs  |
|   Due Aug 11         +-----------------------------------------------+
|                      | Current section content                       |
+----------------------+-----------------------------------------------+
```

The navigator contains only search, status filters, and compact loan records.
It never contains the portfolio summary. The workspace uses the remaining
width and owns all selected-loan metrics.

### 2. Breakpoint ownership

Use the following behavior as the implementation contract:

| Browser/canvas state  | Composition                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base through `lg`     | Portfolio and selected loan are separate full-width views. Loan cards are one column, becoming two only when full-width space permits.                                                   |
| `xl` browser width    | Continue single-view selected-loan mode because the LifeOS sidebar and gutters leave less space than the viewport suggests. Full-width detail panels may use their own responsive grids. |
| `2xl` browser width   | Enable the persistent navigator with `288px minmax(0, 1fr)`. The resulting detail workspace is approximately 900px in the current shell.                                                 |
| Any fixed-width child | Do not apply a viewport breakpoint that assumes the child is full width. Use a stacked layout or a width-local variant supplied by its parent.                                           |

Required class-level changes:

- Change the selected shell from `xl:grid-cols-[320px_...]` to a `2xl` split
  with a 288px navigator.
- Change portfolio/detail hide-show classes from `xl` to `2xl` where they are
  tied to master/detail navigation, including the `Back to loans` control.
- Keep `PortfolioHero` out of selected mode entirely.
- Remove `2xl:grid-cols-[360px_minmax(0,1040px)]`; the page wrapper already owns
  its maximum width and the detail column should fill available space.
- Do not add a second max-width inside the module.

If the implementer chooses container queries instead of the conservative `2xl`
split, the query must be attached to the module content container and must
prove both a 288px navigator and a minimum 760px detail column. A viewport-only
`xl` reintroduction is not acceptable.

### 3. Portfolio summary band

Refactor `PortfolioHero` into a full-width summary band used only in portfolio
mode.

Single-currency hierarchy:

- Eyebrow: `Total outstanding`.
- Hero value: exact formatted amount, no wrapping.
- Supporting line: active-loan count.
- Progress: one slim principal-paid bar with text percentage.
- Secondary fact: `Next EMI`, exact amount, loan title, and localized short
  date.
- Secondary fact: `Monthly commitment`, exact amount and active-loan count.

Mixed-currency hierarchy:

- Hero: `<N> currencies tracked`.
- Render one compact, full-width row per currency with outstanding and monthly
  commitment.
- Do not sum unrelated currencies.
- Next EMI keeps its own currency.
- Progress is shown per currency only when space permits; otherwise omit the
  aggregate progress rather than imply conversion.

Visual treatment:

- One top and bottom border or one `rounded-lg` outer surface, not nested
  cards.
- Internal metrics use separators at desktop and spacing at mobile.
- Remove both blurred decorative circles.
- Remove portfolio hero shadow.
- Use `bg-zinc-900/40` or the nearest existing theme-aware surface, with a
  single `border-zinc-800` boundary.
- Use `text-zinc-500` for labels and `text-zinc-50` for values.
- Use `warning` only when the next EMI is due soon or overdue; an ordinary
  upcoming payment remains neutral/accent.

### 4. Filters and loan collection

Extract the search and status controls from `AdminView` into `LoanFilters.tsx`
so portfolio mode and the wide selected navigator share one behavior.

`LoanFilters` contract:

```ts
interface LoanFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  status: PortfolioStatusFilter;
  onStatusChange: (status: PortfolioStatusFilter) => void;
  counts: { active: number; closed: number; all: number };
  density?: "toolbar" | "navigator";
}
```

- `toolbar` places search and status controls on one row when space permits.
- `navigator` stacks them in the 288px column.
- The three status choices are a segmented control with one shared boundary,
  not three floating pills.
- Inputs remain at least 44px high and use 16px text on mobile.

Add a display variant to `LoanList` and `LoanCard`:

```ts
type LoanListVariant = "portfolio" | "navigator";
```

Portfolio records:

- One column on mobile, two columns at `md`, and three only when the portfolio
  mode has enough full-width space.
- 8px radius, 1px border, no lift animation, no large shadow.
- Header: title, status label, chevron.
- Primary: balance left.
- Secondary: next due amount/date and lender/category.
- Footer: one progress bar and percentage. Remove the three-column mini-table
  of paid/rate/EMI from the portfolio card; it is too dense for the selection
  task.

Navigator records:

- Compact row with title, exact balance, nearest due date, and a slim progress
  line.
- Omit category, rate, and monthly EMI unless needed to distinguish duplicate
  titles.
- Selected state uses a 2px accent leading border plus `aria-current`.
- Keep each row at least 72px high with a 44px minimum interactive target.

### 5. Selected-loan workspace

Simplify `LoanDetails` into three visual layers:

1. Identity toolbar.
2. Payoff summary and facts.
3. Section navigation and content.

Identity toolbar:

- Mobile/tablet: sticky, with `Back to loans`, wrapping loan name, and an Edit
  action.
- Wide split: static, with loan title, lender/category/status, and Edit.
- Do not truncate the loan title to one line at 200% zoom. Allow two lines and
  keep actions in their own fixed-width area.

Payoff summary:

- Use one `rounded-lg` surface.
- Keep Balance left and Payoff Runway as the dominant story.
- Replace four nested fact cards with a flat definition list separated by
  borders: Next EMI, Monthly EMI, Rate, Interest left.
- Values use tabular figures and no word breaking.
- On mobile, facts form a two-column grid only if both columns remain at least
  140px; otherwise stack.

Section navigation:

- Below `sm`, use one 44px section menu button showing the current section and
  a chevron. The popup/menu lists all five sections and marks the current one.
- At `sm` and above, use a conventional underline tab row with no pill
  container.
- Preserve `role="tablist"`, `role="tab"`, `aria-selected`, and the URL-backed
  `section` value for the tab row.
- The mobile menu updates the same URL state and announces the selected view.

### 6. Section content cleanup

The revamp must apply the same hierarchy across all five sections instead of
fixing only the first screenshot.

#### Overview

- Keep extra-payment simulation as the main framed tool.
- Present the extra payment input, presets, and result comparison in one
  `rounded-lg` tool surface.
- Show baseline versus simulated payoff and interest as labeled rows, not
  nested colored cards.
- Keep the chart in one plot frame below the result.
- Loan terms become a collapsible definition list with row separators.
- Keep exact values and current calculations unchanged.

#### Insights

- Use one repayment-composition visualization and one balance trend.
- Avoid multiple equally weighted chart cards.
- Use direct labels and a short screen-reader summary.
- Cost figures are a simple definition list/table, not a grid of cards.

#### Schedule

- Keep cards on phones and the table at `md` and above.
- Mobile schedule cards use 8px radius and no lift/shadow animation.
- Desktop table keeps a visible header, tabular figures, and row separators.
- Export actions remain icon plus text commands and wrap without overlap.

#### Activity

- Keep Payments and Rate history as a segmented local control.
- Payment and rate records use timeline/list rows, not cards nested in an outer
  card.
- Add forms remain progressively disclosed and retain validation/error state.
- Fixed-rate loans keep the explanatory rate-history state.

#### Documents

- Filter controls use the same compact segmented/menu language.
- Document items are repeated 8px cards or rows with visible open/delete
  actions.
- Keep empty, upload error, loading, and confirmation states.

### 7. Dialogs and loan editor

- Preserve the current three-step LoanEditor fields and payload behavior.
- Reduce radii from 16-24px to the module's 8px control/panel standard.
- Keep mobile input text at 16px and every input/control at least 44px high.
- Keep the live summary visible on desktop, but render it as a flat sticky
  definition list rather than a card full of cards.
- Keep the mobile dialog as a bottom/full-height sheet if that matches the
  existing shared behavior; desktop is a centered dialog.
- Keep sticky action placement, unsaved-state protection if present, inline
  validation, and focus management.
- Close remains a Lucide X icon button with `aria-label="Close loan editor"`
  and a tooltip.

### 8. Empty, loading, and error states

- Initial load returns `AdminModuleSkeleton` as today.
- Add an EMI-specific portfolio skeleton only if the shared module skeleton
  causes substantial layout shift; otherwise reuse the shared skeleton.
- Zero loans: compact empty state below the summary with `Add your first loan`.
- Filtered zero state: `No matching loans`, `Try another search or show all
loans`, and `Clear filters`.
- Existing loans with no selected loan: render portfolio mode. Never render the
  old `Select a loan to open the payoff workspace` panel.
- Invalid loan ID: preserve the current fallback and warning, then show
  portfolio mode.
- Fetch error: keep Retry and do not discard already loaded loans.
- Save error: keep the editor or current view open with user input intact.

### 9. Dashboard widget

The widget is already within the repository contract. Limit changes to a
visual audit:

- Keep `WidgetStat + WidgetHighlight` only.
- Keep `/api/widgets/summary` data access.
- Keep the whole card as the navigation target and add no controls.
- Ensure a long outstanding amount does not overflow the 280px tile.
- Remove only EMI-specific animation if it conflicts with reduced motion; do
  not redesign `WidgetCard` globally.

## Files To Change

### Create

| File                                                                | Responsibility                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/modules/emi-tracker/components/LoanFilters.tsx`                | Shared search and status controls with toolbar/navigator density |
| `src/modules/emi-tracker/components/__tests__/LoanFilters.test.tsx` | Search, status, counts, keyboard, and selected-state behavior    |

Do not create an EMI-specific design system or global stylesheet. Existing
Tailwind tokens and `cn()` are sufficient.

### Modify first: root-cause and page composition

| File                                                   | Required change                                                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/emi-tracker/AdminView.tsx`                | Render distinct portfolio and selected modes; move the persistent split to `2xl`; remove the dashed no-selection workspace; compose `LoanFilters`; preserve URL/filter state |
| `src/modules/emi-tracker/components/PortfolioHero.tsx` | Full-width summary band only; remove nested viewport split, nested metric cards, blur spots, shadow, interest-saved tile, and unsafe amount wrapping                         |
| `src/modules/emi-tracker/components/LoanList.tsx`      | Add portfolio/navigator variants and matching skeleton/empty layouts                                                                                                         |
| `src/modules/emi-tracker/components/LoanCard.tsx`      | Add density variant; simplify information; use stable exact money rendering and restrained selected/hover states                                                             |
| `src/modules/emi-tracker/components/LoanDetails.tsx`   | Align back/header behavior with the `2xl` master/detail breakpoint; flatten fact cards; add mobile section menu and desktop underline tabs; remove unsafe amount wrapping    |

### Modify second: module-wide visual consistency

| File                                                        | Required change                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/modules/emi-tracker/components/PayoffRunway.tsx`       | 8px surfaces, quieter warning/result treatment, stable labels at narrow widths            |
| `src/modules/emi-tracker/components/LoanOverviewTab.tsx`    | One simulator tool, flat comparisons, collapsible terms, no nested card grid              |
| `src/modules/emi-tracker/components/PayoffChart.tsx`        | 8px plot frame, semantic colors, responsive sizing, reduced motion and accessible summary |
| `src/modules/emi-tracker/components/LoanAnalysis.tsx`       | Clear chart hierarchy, flat cost rows, no repeated large card/shadow treatment            |
| `src/modules/emi-tracker/components/ScheduleTable.tsx`      | Flat table frame, stable export controls, no decorative shadow                            |
| `src/modules/emi-tracker/components/ScheduleCards.tsx`      | Compact 8px mobile rows/cards without lift animation                                      |
| `src/modules/emi-tracker/components/ActivityTab.tsx`        | Compact segmented control and unframed record composition                                 |
| `src/modules/emi-tracker/components/PaymentList.tsx`        | Row/timeline hierarchy, 8px controls, visible confirmed actions                           |
| `src/modules/emi-tracker/components/RateAdjustmentList.tsx` | Match Activity rows, remove nested shadows/cards                                          |
| `src/modules/emi-tracker/components/DocumentList.tsx`       | Compact filters and document rows, remove nested card styling                             |
| `src/modules/emi-tracker/components/EmiEntryDialog.tsx`     | Align desktop dialog and mobile sheet with reduced radius/elevation system                |
| `src/modules/emi-tracker/components/LoanEditor.tsx`         | Align fields, step controls, summary, errors, and footer with the new visual system       |
| `src/modules/emi-tracker/Widget.tsx`                        | Long-value and reduced-motion audit only                                                  |

### Tests and documentation

| File                                                                  | Required change                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/modules/emi-tracker/__tests__/AdminView.test.tsx`                | Portfolio mode, selected mode, removal of empty workspace, filter persistence, URL/back behavior |
| `src/modules/emi-tracker/components/__tests__/PortfolioHero.test.tsx` | Single/mixed currency hierarchy, next EMI, monthly commitment, long exact values                 |
| `src/modules/emi-tracker/components/__tests__/LoanDetails.test.tsx`   | Mobile section menu, tab behavior, two-line identity, pending and saving states                  |
| `src/modules/emi-tracker/components/__tests__/ScheduleView.test.tsx`  | Preserve mobile/desktop rendering and exports after visual cleanup                               |
| `src/modules/emi-tracker/components/__tests__/LoanEditor.test.tsx`    | Preserve all field values and validation through restyling                                       |
| `src/modules/emi-tracker/__tests__/Widget.test.ts`                    | Preserve widget contract and long-value behavior                                                 |
| `src/modules/emi-tracker/README.md`                                   | Replace current UX description with the two-mode composition and responsive breakpoint contract  |
| `src/modules/emi-tracker/info.md`                                     | Update only user-facing navigation language if the mobile section selector changes visible copy  |

### Explicitly unchanged

- `src/lib/schemas.ts`
- `src/modules/emi-tracker/types.ts`
- `src/modules/emi-tracker/lib/emi-utils.ts`
- `src/modules/emi-tracker/lib/emi-view-model.ts`, unless a presentation-only
  monthly commitment field avoids duplicated derivation
- `/api/content` routes
- `/api/widgets/summary`
- `src/app/admin/layout.tsx`
- `src/app/globals.css`
- `src/registry.ts`

## Implementation Phases

### Phase 1: Lock the responsive regression

1. Add/update AdminView tests for portfolio and selected modes.
2. Add long-amount and mixed-currency PortfolioHero fixtures.
3. Record baseline Playwright screenshots of the current defect at desktop and
   mobile widths.
4. Document the exact computed widths of module root, navigator, hero columns,
   and primary amount before changing layout.

Exit criteria:

- Tests fail for removal of the giant no-selection panel and new composition.
- The screenshot defect is reproducible and tied to the nested `xl` grids.

### Phase 2: Correct page composition

1. Extract `LoanFilters` without changing its state ownership.
2. Split AdminView rendering into portfolio mode and selected-loan mode.
3. Render PortfolioHero and LoanList full width in portfolio mode.
4. Remove the no-selection workspace.
5. Render the compact navigator only in selected mode at `2xl`.
6. Shift master/detail-specific show/hide and back-control classes to `2xl`.
7. Preserve search and status state while entering and leaving a loan.

Exit criteria:

- No nested wide PortfolioHero exists inside the fixed navigator.
- Existing loans are visible in the first desktop portfolio viewport.
- Selected-loan navigation works with browser Back and `Back to loans`.

### Phase 3: Rebuild summary and loan records

1. Flatten PortfolioHero into the summary band.
2. Add stable financial-value sizing and no-wrap behavior.
3. Add portfolio/navigator variants to LoanList and LoanCard.
4. Remove decorative blur, excessive radius, lift, and shadow styles.
5. Verify single-currency, mixed-currency, no-loan, active, closed, and archived
   data.

Exit criteria:

- Primary and secondary amounts remain readable at every target width and 200%
  zoom.
- Portfolio mode shows a clear path from summary to loan selection.

### Phase 4: Simplify selected-loan workspace

1. Flatten LoanDetails identity, hero facts, and tabs.
2. Add the mobile section menu and desktop underline tab row.
3. Apply the 8px, low-shadow visual system to Overview and Insights.
4. Verify Payoff Runway and simulator output do not change.

Exit criteria:

- The selected workspace remains at least 760px wide beside the navigator.
- No selected-loan amount, label, tab, or action overlaps at target widths.

### Phase 5: Normalize secondary workflows

1. Restyle Schedule, Activity, Documents, and editor/dialog components.
2. Preserve all validation, confirmation, upload, export, and mutation behavior.
3. Remove card nesting and decorative effects while keeping useful boundaries.
4. Audit tooltips, accessible names, focus states, and reduced motion.

Exit criteria:

- Every section follows the same hierarchy and radius/elevation rules.
- CRUD and exports work exactly as before.

### Phase 6: Verify and document

1. Run focused EMI tests during iteration.
2. Run `pnpm format` and `pnpm check` after implementation is complete.
3. Start `pnpm dev` on port 3091.
4. Use Playwright to verify the full matrix below in light and dark themes.
5. Update README/info after the implementation matches the final behavior.

Exit criteria:

- Full CI check passes.
- No console errors occur in tested flows.
- Before/after screenshots show the attached regression is gone.

## Testing Plan

### Unit and component tests

`AdminView`:

- Loading returns the shared skeleton and no empty prompt.
- No selected loan renders one portfolio summary, filters, and loan list.
- No selected loan does not render `Select a loan to open the payoff
workspace`.
- A valid selected loan renders LoanDetails.
- Invalid selected ID clears URL state and shows the recoverable warning.
- Search/status values survive selection and Back during the component session.
- Create/edit still invoke the existing API payloads and URL updates.

`PortfolioHero`:

- Single currency renders exact total, next EMI, monthly commitment, active
  count, and principal progress.
- Mixed currencies render separate exact values and no false combined total.
- Very large and zero values preserve their complete formatted string.
- Interest saved is not rendered in the portfolio band.
- Progress has correct ARIA value and text.

`LoanFilters`, `LoanList`, and `LoanCard`:

- Each status option reports its count and selected state.
- Search has an accessible label.
- Portfolio and navigator variants expose the same loan selection behavior.
- Selected navigator record uses `aria-current`.
- Closed/archived states include text, not color alone.
- Empty and filtered-empty actions invoke the correct callback.

`LoanDetails`:

- The active section is URL-controlled.
- Mobile menu and desktop tabs call the same section callback.
- Saving and pending section states remain announced.
- Back and Edit remain keyboard accessible.
- Existing section components receive unchanged data and callbacks.

Financial regression:

- Run all existing `emi-utils` and `emi-view-model` tests unchanged.
- No snapshot update may alter amortization totals merely to satisfy UI tests.

### Manual Playwright visual matrix

Use the real admin shell, not a standalone component, because the shell width is
part of the defect.

| Viewport  | State                  | Required checks                                                                                  |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| 320x740   | Portfolio              | No horizontal scroll; exact amount fits; next EMI and filters visible; loan list begins promptly |
| 390x844   | Portfolio              | Summary hierarchy, 44px targets, one-column loans, no overlaps                                   |
| 390x844   | Selected               | Sticky back/header, balance/runway, mobile section menu, edit action                             |
| 768x1024  | Portfolio              | Two-column loan layout only if values fit; no clipped filters                                    |
| 1024x768  | Selected               | Single full-width detail view because shell sidebar is present                                   |
| 1280x800  | Portfolio and selected | No premature fixed navigator; detail panels use useful width                                     |
| 1440x900  | Portfolio and selected | No amount wrapping; loan list remains above fold; no cramped nested grids                        |
| 1536x960  | Selected               | 288px navigator plus at least 760px workspace; selected row and tabs coherent                    |
| 1728x1117 | Portfolio and selected | Content remains bounded by shell; no oversized empty regions                                     |

For each state:

- Check light and dark themes.
- Check browser console errors.
- Check `document.documentElement.scrollWidth === clientWidth`.
- Check each `[data-financial-value]` element has
  `scrollWidth <= clientWidth` and a height consistent with one text line.
- Check no visible text intersects another element's bounding box.
- Check the loan list or selected workspace starts within the first viewport.
- Check keyboard Tab order and visible focus.
- Check reduced-motion mode.
- Repeat desktop portfolio and selected states at 200% browser zoom.

### Interaction smoke test

1. Load portfolio.
2. Search for a lender and change Active/Closed/All.
3. Select a loan and change all five sections.
4. Use browser Back and in-app Back.
5. Open Add loan, move through all steps, cancel, and reopen.
6. Edit a loan without changing data and cancel.
7. Run the extra-payment simulator.
8. Export schedule CSV and PDF.
9. Add then delete a test payment, rate adjustment where allowed, and document
   in a disposable test record.
10. Confirm the dashboard widget still renders within 280px.

## Edge Cases

- No loans.
- One loan and many loans.
- All loans closed.
- Archived loans visible only under All.
- Loan title or lender at schema maximum length.
- Duplicate loan titles from different lenders.
- Missing optional lender.
- Very large principal/outstanding values.
- Zero outstanding closed loan.
- Negative or overdue next-due delta shown by existing schedule behavior.
- Next EMI absent.
- One currency and multiple currencies.
- Currency code without a known symbol.
- Indian and Western number formats.
- Zero and non-zero rounding decimals.
- Very low or zero interest rate.
- Fixed and floating loans.
- Schedule warning or non-amortizing input.
- Long document titles and payment notes.
- 200% zoom and increased system text size.
- Reduced motion.
- API failure with no cached loans and with existing loans.
- Invalid `loan` or `section` query values.
- Direct deep link to a selected section.

## Risks And Mitigations

| Risk                                                       | Mitigation                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A class-only patch reintroduces the same bug elsewhere     | Change page composition so PortfolioHero cannot enter the navigator; move master/detail behavior to `2xl`; verify in the real shell |
| Full-width portfolio and selected layouts duplicate markup | Extract only shared filters and use LoanList/Card variants; keep data/state in AdminView                                            |
| Exact long values overflow after no-wrap is applied        | Use fixed length-aware type classes, full-width metric rows, and Playwright bounding-box checks                                     |
| Visual cleanup accidentally removes useful hierarchy       | Preserve all labels and values; change grouping and emphasis, not capability                                                        |
| Restyling forms causes payload regression                  | Keep LoanEditor state and submit code unchanged; run payload-preservation tests                                                     |
| Moving responsive breakpoints harms tablet navigation      | Keep selected loan as a full view with Back below `2xl`; verify URL and browser Back                                                |
| Mixed currency appears falsely summed                      | Keep separate currency rows and existing view-model behavior                                                                        |
| Theme contrast differs from the screenshot                 | Use semantic/zinc tokens only and verify light plus dark themes                                                                     |
| Chart styling diverges from global tokens                  | Read CSS variables at render time or use existing semantic chart token mapping; no raw hue classes/hex additions                    |
| Large scope becomes hard to review                         | Commit by implementation phase and require visual verification after Phases 2, 3, and 5                                             |

## Rollout And Rollback

- No database migration, API version, environment variable, or feature flag is
  required.
- Implement in phase-sized commits so the responsive shell fix can be reviewed
  before secondary visual cleanup.
- Keep calculation and schema files unchanged unless a failing regression test
  proves an unrelated defect.
- Deploy through the normal LifeOS path after `pnpm check` and Playwright visual
  verification pass.
- Rollback is a code revert of the revamp commits. Stored EMI documents remain
  compatible because payloads and routes do not change.
- If a secondary section misses visual QA, do not roll back the root layout
  correction; revert only that section's styling commit.

## Non-Goals

- Changing amortization formulas or payoff math.
- Changing the `emi_loan` schema.
- Migrating existing MongoDB documents.
- Adding currency conversion or exchange rates.
- Adding payment reminders or notification delivery.
- Adding bank integrations, automatic statement import, or reconciliation.
- Rebuilding the global LifeOS sidebar, header, themes, or admin max-width.
- Replacing the five-section information architecture.
- Adding a new chart library.
- Turning the dashboard widget into a mini application.
- Adding decorative imagery or generated assets to an operational finance
  module.

## Implementer Handoff Checklist

- [ ] Read this document and the retained capability sections of the 2026-07-30
      design before editing.
- [ ] Reproduce the attached layout failure in the real admin shell.
- [ ] Add failing composition tests before changing AdminView.
- [ ] Keep application data, API routes, schemas, and financial utilities
      unchanged.
- [ ] Split no-selection portfolio mode from selected-loan mode.
- [ ] Remove PortfolioHero from the fixed-width navigator.
- [ ] Move persistent master/detail behavior and Back visibility to the same
      `2xl` contract.
- [ ] Remove the giant dashed no-selection workspace.
- [ ] Add `LoanFilters` and portfolio/navigator loan variants.
- [ ] Remove `break-words` from financial values and apply stable exact-value
      sizing.
- [ ] Flatten nested metric cards and remove decorative blur/shadows.
- [ ] Apply the 8px visual system through all five sections and the editor.
- [ ] Preserve 44px targets, focus rings, labels, ARIA state, rich skeletons,
      error recovery, and reduced motion.
- [ ] Keep the widget within the one-stat/one-highlight 280px contract.
- [ ] Run focused EMI tests while iterating.
- [ ] Run `pnpm format` and `pnpm check` before completion.
- [ ] Verify every viewport/state in the Playwright matrix in light and dark
      themes.
- [ ] Compare before/after screenshots and confirm no text overlaps or amount
      wrapping remain.
- [ ] Update `README.md` and `info.md` to match implemented behavior.
