# EMI Tracker UI Overhaul — Design and Implementation Handoff

**Date:** 2026-07-30  
**Status:** Ready for user review and later implementation  
**Working title:** Payoff Observatory  
**Primary route:** `/admin/emi-tracker`  
**Audience:** The implementation agent who will overhaul the existing module

## Overview

Rebuild the EMI Tracker as a mobile-first debt command center that feels calm,
precise, and premium. The overhaul must make the most important financial
questions answerable at a glance:

1. How much debt remains?
2. What is due next?
3. How far through each loan am I?
4. What changes if I pay more each month?
5. Where are my payments, rate changes, documents, and amortization details?

The signature interaction is a **Payoff Runway**: a clear timeline from the
loan start date to its projected payoff date. When the extra-payment simulator
changes, the projected payoff marker and savings update together. This gives
the module a memorable visual idea rooted in useful financial behavior rather
than decoration.

The current MongoDB content model, `emi_loan` schema, amortization utilities,
API routes, exports, settings, and widget contract remain intact. This is a
complete information-architecture, responsive-layout, interaction, copy, and
visual-system overhaul—not a backend rewrite.

## Key Decisions

- **Use the “Payoff Observatory” direction** because it is distinctive,
  product-specific, and compatible with every LifeOS theme.
- **Treat mobile as a true master/detail flow.** The portfolio and a selected
  loan are separate views on small screens; the detail view must never sit
  below the entire loan list.
- **Use a persistent loan navigator only at `xl` and above.** The LifeOS admin
  shell already consumes horizontal space, so a desktop split at `lg` is too
  cramped.
- **Replace the four-card-everywhere pattern with visual hierarchy.** Use one
  dominant hero, one compact metric strip, and progressively disclosed detail.
- **Make the Payoff Runway the hero visualization.** Charts support it; they do
  not compete with it.
- **Reduce six detail tabs to five clearer destinations:** Overview, Insights,
  Schedule, Activity, and Documents. Payments and rate changes live together
  in Activity.
- **Use responsive cards for amortization on phones.** Keep the data table for
  tablet/desktop; do not force users to pan horizontally to read monthly rows.
- **Use responsive sheets/dialogs for create and add flows.** On mobile they
  rise from the bottom or occupy the screen; on desktop they become centered
  panels.
- **Use plain financial language.** Replace phrases such as “Deploy Asset,”
  “Loan Narrative,” and “Configure your debt instrument” with “Add loan,”
  “Loan name,” and “Loan details.”
- **Use existing semantic theme tokens only.** No hardcoded Tailwind hue
  families, raw component hex values, or new font dependency.
- **Keep all existing financial capabilities.** The redesign may regroup them,
  but must not remove payments, prepayments, rate adjustments, documents,
  exports, analysis, or simulator behavior.

## Current-State Audit

### What already works

- The module is decomposed into focused components rather than one monolith.
- Schedule calculation lives in `src/modules/emi-tracker/lib/emi-utils.ts`.
- Data is already represented by a stable `EmiLoan` contract.
- Portfolio cards include balance, next due date, EMI, rate, tenure, and
  payoff progress.
- The module includes a simulator, analysis charts, CSV/PDF exports, payment
  logging, documents, and rate adjustments.
- Shared LifeOS skeleton, toast, confirmation, theme, icon, and modal patterns
  are available.
- The dashboard widget already follows the 280px widget contract.

### Mobile problems to solve

1. **The master/detail layout is stacked rather than navigated.** In
   `AdminView.tsx`, the loan list renders before the selected loan detail.
   After tapping a loan on a phone, the user must scroll past the list to find
   the result.
2. **Portfolio metrics consume too much vertical space.** Four full cards
   become four stacked blocks before the loan list.
3. **Six tabs rely on horizontal scrolling.** The active destination can be
   partially off-screen, and the interaction reads like a squeezed desktop
   toolbar.
4. **The amortization schedule is a desktop table in a horizontal scroller.**
   This preserves data but makes comparison and scanning difficult on a phone.
5. **Important actions are hover-only.** Delete controls in payments,
   documents, and rate adjustments use `opacity-0 group-hover:opacity-100`,
   which makes them undiscoverable on touch devices.
6. **Controls are too small.** Many labels, badges, buttons, and inputs use
   9–12px text and compact padding. Mobile inputs should use at least 16px text
   to remain legible and avoid browser zoom behavior.
7. **Charts are desktop-first.** Donut legends, axis labels, tooltips, and
   300–400px fixed heights create dense, low-context mobile panels.
8. **There is no clear mobile back path.** Selecting a loan is local component
   state, so browser and in-app back navigation do not express portfolio →
   loan hierarchy.
9. **Long forms are presented as one large panel.** The loan form is visually
   heavy and has no progressive disclosure or mobile-specific action
   placement.
10. **Fixed and hover motion is overused.** List item entrances, pulsing active
    tab icons, card lifting, blur, shadows, and multiple chart animations
    compete for attention.

### Desktop problems to solve

1. **The hierarchy is flat.** Portfolio metrics, loan cards, headers, key
   metrics, tabs, charts, and technical data all use similar glass cards,
   border weight, radius, and shadow.
2. **The module adds padding inside an already padded admin shell.** This
   reduces useful width and makes the `lg` master/detail split cramped.
3. **There is no dominant story.** Balance, progress, next EMI, payoff date,
   interest, and simulator results have similar emphasis.
4. **Two donut charts are visually repetitive.** They require legends and do
   not communicate repayment progress as directly as a timeline, comparison
   bar, or payoff curve.
5. **Copy feels theatrical instead of trustworthy.** “New Portfolio Asset,”
   “Deploy Asset,” “Structural Overhead,” and similar language slow
   comprehension.
6. **Cards use excessive blur and decorative shadows.** The result feels
   visually busy rather than premium.
7. **Mixed currency is underspecified.** A portfolio with multiple currencies
   should never imply that unlike currencies were summed.
8. **The settings icon has no behavior.** A visible inactive action reduces
   trust and should be removed until it has a real destination.

### Functional issues to correct while redesigning

- `LoanForm.tsx` creates `lender` without a setter, so the lender is not
  editable in the form.
- The form hardcodes `interest_type: "floating"` even though the schema
  supports fixed and floating loans.
- The form hardcodes `processing_fee_financed: false` and does not expose
  existing processing-fee fields.
- The due-day input permits `31`, while `EmiLoanSchema` accepts only `1–28`.
- Fetch and update failures often log to the console without showing a
  recoverable user-facing state.
- Destructive record actions have no confirmation or undo affordance.
- Chart files use raw hex colors rather than the repository’s semantic theme
  tokens.

## Design Goals and Success Measures

### Product goals

- Make debt status understandable in under five seconds.
- Make the next due payment unmistakable but not alarming.
- Make prepayment exploration satisfying, immediate, and reversible.
- Make records easy to add with one hand on a phone.
- Make detailed tables and charts available without dominating the default
  experience.

### Measurable UX outcomes

- At 360px wide, the page has no horizontal document scroll.
- On mobile, tapping a loan opens its detail view immediately; the user does
  not scroll past the portfolio list.
- Every interactive target is at least 44×44 CSS pixels, even though WCAG 2.2
  Level AA permits a smaller minimum in some cases.
- No mobile form control renders text below 16px.
- The first mobile portfolio viewport includes the module header, primary debt
  summary, next-due context, and the start of the loan list.
- The first mobile loan-detail viewport includes the back action, loan
  identity, outstanding balance, progress, and next EMI.
- At 1280px and wider, the loan navigator and selected loan workspace are
  visible simultaneously.
- Long loan names, lender names, currency labels, and formatted amounts do not
  overlap at 200% zoom.
- All functionality remains operable with a keyboard and understandable
  without color.
- `prefers-reduced-motion` removes nonessential translations, scaling, and
  chart entrance animation.

### Standards baseline

- Follow WCAG 2.2 reflow guidance so ordinary content remains usable at a
  320px-wide equivalent without two-dimensional scrolling:
  <https://www.w3.org/WAI/WCAG22/Understanding/reflow>
- Use a 44×44 target standard for primary controls, exceeding the WCAG 2.2
  Level AA minimum and matching the enhanced target-size guidance:
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced>
- Maintain 4.5:1 contrast for normal text and 3:1 for large text and meaningful
  graphical controls.

## Visual Direction Options Considered

### Option A — Payoff Observatory (recommended)

**Character:** Calm, premium, editorial fintech; dark or light depending on the
active LifeOS theme; precise data typography; restrained atmospheric depth.

**Signature:** A live Payoff Runway connecting loan start, today, baseline
payoff, and simulated payoff.

**Strengths:**

- Distinctive without fighting the global theme system.
- Makes financial progress the visual identity.
- Works on mobile using the same information hierarchy.
- Reduces decorative glass while keeping a premium feel.
- Supports data density through progressive disclosure.

**Trade-off:** Requires careful view-model and responsive work; it cannot be
achieved by swapping Tailwind classes alone.

### Option B — Kinetic Ledger

**Character:** High-contrast, dense, utilitarian, terminal-inspired financial
dashboard with strong grid lines and monospaced figures.

**Strengths:**

- Excellent for expert users and large datasets.
- Highly scannable on desktop.
- Visually bold with minimal effects.

**Trade-off:** Too severe and cramped for a personal LifeOS module; mobile
would feel like a compressed analyst terminal.

### Option C — Soft Wealth

**Character:** Airy, light-first, rounded, reassuring personal-finance
experience with generous white space and friendly illustrations.

**Strengths:**

- Welcoming and simple.
- Strong fit for first-time financial users.
- Naturally mobile-friendly.

**Trade-off:** Less compatible with the broad LifeOS theme catalog and less
appropriate for detailed schedules, rate history, and analytical workflows.

## Selected Concept: Payoff Observatory

### The memorable idea

The user should remember that the loan’s finish line visibly moves when they
change their payment. The **Payoff Runway** is not a decorative progress bar:

- The left edge is the loan start.
- A solid paid segment reaches the “Today” marker.
- The standard remaining segment reaches the baseline payoff date.
- When simulation is active, an accent marker moves earlier on the runway.
- The removed portion is labeled with months saved.
- A compact text summary repeats the meaning for screen readers and users who
  do not interpret charts visually.

### Tone

- Confident, quiet, precise, and encouraging.
- Never celebratory about taking debt.
- Positive states communicate progress rather than moral judgment.
- Warning states are reserved for an upcoming or overdue payment.
- Plain language wins over financial theater.

### Surface hierarchy

Use three surface levels:

1. **Canvas:** `bg-zinc-950`, inherited from the admin shell.
2. **Primary surfaces:** `bg-zinc-900/70` or theme-equivalent, one-pixel
   `border-zinc-800`, little or no blur.
3. **Inset controls/data wells:** `bg-zinc-950/35`, subtle inner border.

Blur is reserved for sticky mobile headers, sheets, and modal scrims. Shadows
are reserved for the primary hero and active floating surfaces.

## Information Architecture

### Portfolio view

1. Module toolbar
2. Portfolio Hero
3. Search and status filters
4. Loan navigator/list
5. Exactly one terminal state: content, empty, error, or loading

### Loan workspace

1. Mobile back header / desktop loan identity header
2. Loan Payoff Hero and Runway
3. Compact facts strip
4. Section navigation
5. Active section content

### Five loan sections

| Section       | Contents                                                             |
| ------------- | -------------------------------------------------------------------- |
| **Overview**  | Payoff simulator, baseline vs simulated result, technical loan facts |
| **Insights**  | Repayment trend, principal/interest composition, useful ratios       |
| **Schedule**  | Desktop/tablet amortization table, mobile monthly cards, exports     |
| **Activity**  | Payments/prepayments and floating-rate adjustments                   |
| **Documents** | Sanction letter, NOC, interest certificates, and other files         |

### URL behavior

Use query parameters to express durable workspace state:

```text
/admin/emi-tracker
/admin/emi-tracker?loan=<content-id>
/admin/emi-tracker?loan=<content-id>&section=insights
```

- Selecting a loan pushes the `loan` query parameter.
- Switching a section replaces `section` so section changes do not spam
  browser history.
- On mobile, browser Back from a selected loan returns to the portfolio and
  restores search/filter/scroll position.
- On desktop, removing `loan` returns to the portfolio invitation panel while
  keeping the navigator visible.
- Invalid or missing loan IDs fall back to the portfolio and show a compact
  “Loan not found” notice instead of a blank workspace.

## Responsive Layout Specification

| Width           | Layout behavior                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **320–479px**   | One active view at a time. 16px side gutters. Portfolio hero is compact. Sticky mobile view header. Full-width bottom-sheet forms. Schedule uses cards only.      |
| **480–767px**   | Same navigation model with 20px gutters. Hero can place two secondary facts side by side.                                                                         |
| **768–1023px**  | One active view at a time with 24px gutters and wider content cards. Entry sheets and the loan editor become centered dialogs. Schedule uses the full data table. |
| **1024–1279px** | Keep a single workspace column because the LifeOS sidebar reduces usable width. The portfolio loan list uses a two-column card grid.                              |
| **1280–1535px** | Desktop master/detail: 320px sticky loan navigator plus flexible workspace. 24px gap. Portfolio Hero spans the workspace header.                                  |
| **1536px+**     | Desktop master/detail: 360px navigator and a capped 920–1040px workspace. Prevent financial content from stretching indefinitely.                                 |

### Breakpoint rules

- Do not use the current `lg` split for master/detail; begin at `xl`.
- Remove the nested `max-w-[1600px]` and redundant `p-4 md:p-8` from
  `AdminView.tsx`; the admin layout already owns the page container.
- Use `min-w-0` on the workspace and every grid child that contains formatted
  money or charts.
- Never hide required functionality at a breakpoint.
- Sticky areas must account for the admin header and must not create nested
  scroll containers.
- Mobile bottom sheets must include safe-area padding using
  `env(safe-area-inset-bottom)`.

## Layout Wireframes

### Mobile portfolio, 390px

```text
┌──────────────────────────────────────┐
│ EMI Tracker                  [+ Add] │
│ Know what remains. Finish sooner.    │
├──────────────────────────────────────┤
│ TOTAL OUTSTANDING                    │
│ ₹42,84,120                           │
│ ━━━━━━━━━━━━━━━●────────  38% paid  │
│                                      │
│ Next EMI         Monthly commitment  │
│ ₹43,391 · 5 Aug  ₹63,391             │
├──────────────────────────────────────┤
│ [ Search loans…                 ]    │
│ [Active 3] [Closed 1] [All 4]       │
├──────────────────────────────────────┤
│ HOME LOAN                  ACTIVE    │
│ HDFC · Home                         >│
│ ₹38,41,800 left                      │
│ Due 5 Aug · ₹43,391                  │
│ ━━━━━━━━━━━━━────────────  31%       │
├──────────────────────────────────────┤
│ CAR LOAN                   ACTIVE    │
│ ...                                  │
└──────────────────────────────────────┘
```

### Mobile loan detail, 390px

```text
┌──────────────────────────────────────┐
│ [‹ Loans]      Home loan       [Edit]│
├──────────────────────────────────────┤
│ BALANCE LEFT                         │
│ ₹38,41,800                           │
│ 31% of principal repaid              │
│                                      │
│ Start       Today        Payoff       │
│ ●━━━━━━━━━━━━●──────────────○         │
│ Jan 2024    Jul 2026      Dec 2043    │
│                                      │
│ NEXT EMI                    RATE      │
│ ₹43,391 · 5 Aug             8.5%      │
├──────────────────────────────────────┤
│ Overview Insights Schedule Activity  │
│ Documents                            │
├──────────────────────────────────────┤
│ WHAT IF I PAY MORE?                  │
│ Extra each month            ₹10,000  │
│ [0]──────●────────────────[₹86,782]  │
│ [Reset] [+5%] [+10%] [+25%]          │
│                                      │
│ Finish 29 months earlier             │
│ Save ₹4,82,910 in interest           │
└──────────────────────────────────────┘
```

### Desktop, 1440px

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ EMI Tracker  Know what remains. Finish sooner.                    [+ Add]   │
├────────────────────────┬────────────────────────────────────────────────────┤
│ TOTAL OUTSTANDING      │ HOME LOAN · HDFC                              [Edit]│
│ ₹42,84,120             │                                                    │
│ 38% paid               │ ₹38,41,800 balance left                            │
│ Next: ₹43,391 · 5 Aug  │ ●━━━━━━━━━━━━●──────────────○ Dec 2043             │
│                        │ Start        Today       Baseline payoff            │
│ [Search loans…]        │                                                    │
│ [Active] [Closed] [All]│ Next EMI     Monthly EMI   Rate      Interest left │
│                        │ ₹43,391       ₹43,391      8.5%      ₹31,26,000     │
│ ┌────────────────────┐ │                                                    │
│ │ Home loan          │ │ [Overview] [Insights] [Schedule] [Activity] [Docs]│
│ │ ₹38,41,800 left    │ ├────────────────────────────────────────────────────┤
│ │ Due 5 Aug          │ │ PAYOFF SIMULATOR           BASELINE VS FASTER      │
│ └────────────────────┘ │ Extra monthly ₹10,000      Payoff: Dec 2043→Jul 2041│
│ ┌────────────────────┐ │ [slider + preset chips]    Interest saved ₹4,82,910│
│ │ Car loan           │ │                                                    │
│ └────────────────────┘ │ [responsive payoff comparison chart]               │
└────────────────────────┴────────────────────────────────────────────────────┘
```

## Detailed Screen Design

### 1. Module toolbar

**Purpose:** Establish context and expose the one primary action.

**Content:**

- H1: `EMI Tracker`
- Supporting copy: `Know what remains. Finish sooner.`
- Primary action: `Add loan`
- Use `Plus` from Lucide.

**Behavior:**

- On mobile, keep the toolbar compact and sticky only while the portfolio is
  visible.
- On a loan detail view, replace the title with a back control and loan name.
- Do not show a nonfunctional settings button.
- The Add button is text + icon, not icon-only.

### 2. Portfolio Hero

Replace `EMIMetrics.tsx` with one composed hero.

**Single-currency state:**

- Eyebrow: `Total outstanding`
- Hero value: formatted outstanding balance
- Debt progress track: principal paid vs principal remaining across active
  loans
- Secondary facts:
  - `Next EMI`: amount, date, and loan title
  - `Monthly commitment`: sum of current monthly EMI values for active loans
  - `Interest saved`: value from existing prepayment calculations
  - `Active loans`: count

**Mixed-currency state:**

- Hero text: `<N> currencies tracked`
- Render one line per currency with the amount and currency code.
- Do not calculate or imply a converted total.
- Render monthly commitment per currency; never sum unlike currencies.
- Next EMI keeps its own loan currency.

**Visual behavior:**

- Use a broad horizontal hero on desktop.
- On mobile, show the hero value, progress, next EMI, and monthly commitment;
  move interest saved and active count into a compact two-column footer.
- Use a subtle accent glow or gradient only behind the progress track and
  next-due marker.
- No decorative oversized icons.

### 3. Search and filter controls

**Controls:**

- Search input with visible label for screen readers and placeholder
  `Search by loan or lender`.
- Status segmented control: `Active`, `Closed`, `All`.
- Include counts inside labels when available, such as `Active 3`.
- Archived loans appear only under All. A separate archive filter is outside
  this overhaul.

**Behavior:**

- Search and status filtering happen locally.
- Empty filtered state says:
  - Title: `No matching loans`
  - Body: `Try another search or show all loans.`
  - Action: `Clear filters`
- Preserve query and status when entering a loan and returning.

### 4. Loan card

**Hierarchy:**

1. Loan name and status badge
2. Lender and category
3. Outstanding balance
4. Next EMI amount and due date
5. Progress track
6. Rate and monthly EMI as compact metadata

**Mobile rules:**

- Entire card remains a button.
- Minimum height approximately 148px; no nested buttons inside it.
- A chevron communicates navigation.
- Text may wrap to two lines; do not truncate essential loan names at one line.
- Use 14px body and 12px metadata; never 9–10px.

**Desktop selected state:**

- Use an accent left rail, stronger surface, and `aria-current="true"`.
- Do not rely on glow alone.
- Focus state is visually stronger than hover.

### 5. Loan header and Payoff Hero

Replace the separate large `LoanHeader` plus four equal `LoanKeyMetrics` cards
with one cohesive composition.

**Header row:**

- Mobile: `Back to loans`, loan name, and `Edit`.
- Desktop: loan name, lender, category, status, and `Edit loan`.
- Do not ship an overflow or settings control until it has a real action.

**Hero content:**

- Hero value: outstanding balance
- Supporting label: percentage of principal repaid
- Payoff Runway
- Baseline payoff date
- Compact facts:
  - Next EMI amount + due date
  - Monthly EMI
  - Current annual interest rate
  - Remaining interest

**Runway states:**

- Active, no simulation: start → today → baseline payoff.
- Active, simulation: start → today → simulated payoff → baseline payoff.
- Closed: full success track with closed date.
- Future start date: start marker is ahead of today; explain `Loan has not
started`.
- Invalid schedule/warning: show a warning callout from
  `ScheduleResult.warnings` and omit misleading progress.

### 6. Section navigation

Use `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and
associated tab panels.

**Destinations:**

- Overview
- Insights
- Schedule
- Activity
- Documents

**Desktop:**

- Inline tab rail under the Payoff Hero.
- Active state uses accent text, a clear underline/rail, and stronger weight.
- No pulsing icon.

**Mobile:**

- Use a non-sticky, two-row wrapped segmented rail.
- The first row should prioritize Overview, Insights, and Schedule.
- Do not require horizontal scrolling to reach Documents.

### 7. Overview and payoff simulator

The default section is outcome-first.

**Simulator controls:**

- Heading: `What if I pay more?`
- Numeric field: `Extra each month`
- Range control from 0 to `2 × monthly_emi`
- Presets calculated from EMI:
  - `+5%`
  - `+10%`
  - `+25%`
  - `+50%`
- Reset action shown only when the amount is nonzero.
- The numeric field and range remain synchronized.
- Clamp invalid or negative input to zero on blur.

**Results:**

- `Finish <N> months earlier`
- `Save <amount> in interest`
- Baseline payoff date → simulated payoff date
- Baseline total interest → simulated total interest
- If there is no improvement, say `This amount does not change the projected
payoff yet.`

**Chart:**

- Show baseline and simulated closing balance curves in one chart.
- Use direct labels or a small near-chart legend.
- Mobile chart height: 220–240px.
- Desktop chart height: 300–340px.
- Tooltip works on focus, hover, and tap.
- Provide an accessible text summary immediately before or after the chart.
- Disable entrance animation under reduced motion.

**Technical facts:**

- Move interest type, processing fee, recast strategy, start date, tenure, and
  due day into a collapsible `Loan terms` panel below the simulator.
- Keep the panel collapsed by default on mobile and expanded on wide desktop.

### 8. Insights

Replace the two donuts and one dense cumulative chart with three clearer views:

1. **Repayment composition bar**
   - Principal paid
   - Principal remaining
   - Interest paid
   - Interest remaining
   - Direct labels and accessible percentages

2. **Balance over time**
   - Primary line/area: closing balance
   - Secondary dashed line: cumulative interest
   - Time axis uses dates or years, not only `M12`, `M24`
   - Sampling remains for long tenures

3. **Cost summary**
   - Principal amount
   - Total projected interest
   - Interest as percentage of principal
   - Total projected repayment

**Copy changes:**

- `Efficiency Ratio` → `Principal-to-interest ratio`
- `Structural Overhead` → `Interest cost`
- `Loan Status Distribution` → `Paid and remaining`
- `Cumulative Liability Breakdown` → `Balance over time`

**Chart styling:**

- Replace raw hex values with `var(--color-accent)`,
  `var(--color-success)`, `var(--color-warning)`,
  `var(--color-danger)`, and zinc CSS variables.
- Reduce gridline contrast.
- Do not use color as the only identifier; labels and patterns/line styles must
  distinguish series.
- Provide a concise screen-reader summary and a compact data table or hidden
  semantic summary for key values.

### 9. Schedule

**Shared header:**

- Heading: `Amortization schedule`
- Summary: `<N> payments · <start> to <payoff>`
- Actions: `Export CSV` and `Export PDF`
- On mobile, put exports in an overflow menu labeled `Export schedule`.

**Desktop/tablet table:**

- Sticky header.
- Columns:
  - Payment
  - Due
  - Status
  - EMI
  - Principal
  - Interest
  - Extra
  - Balance
- Right-align numeric columns and use tabular figures.
- Keep zebra contrast extremely subtle.
- Highlight the next payment with a semantic marker and `aria-label`.
- Paid rows remain readable; do not reduce the whole row to 60% opacity.
- Keep the totals row visible after the table or in a summary footer.

**Mobile card list:**

- Group rows by year.
- Each card shows:
  - Month and date
  - Paid/upcoming status
  - EMI amount
  - Principal + interest split
  - Extra payment when nonzero
  - Closing balance
- Tapping a card toggles an expanded row containing opening balance and annual
  rate.
- Render an initial window (for example 24 months) with `Show more` to avoid
  hundreds of DOM nodes.
- The mobile schedule must not use horizontal scrolling.

### 10. Activity

Combine payments and rate changes under one section with a nested segmented
control:

- `Payments`
- `Rate history`

The nested control stays in local component state and is not added to the URL.

#### Payments

- Header: total records plus `Add payment`.
- Use a vertical timeline grouped by year/month.
- Each row shows amount, EMI/prepayment label, date, note, and receipt link.
- Prepayments use accent emphasis and a `TrendingDown` or `ArrowDownToLine`
  icon.
- Every row has a visible 44px overflow action on touch devices.
- Delete uses `ConfirmDialog`; after success, show a Toast with a clear result.
- If true undo would require delayed persistence, do not fake it. Use
  confirmation plus success feedback.

#### Rate history

- Show current rate prominently.
- Render a chronological stepped timeline.
- Each row shows previous rate → new rate, effective date, and note when
  derivable.
- `Add rate change` is disabled or hidden for fixed-rate loans, with text:
  `Rate history is available for floating-rate loans.`
- Delete uses the same confirmation pattern as payments.

#### Add forms

- Mobile: bottom sheet with drag handle, sticky title, visible Close action,
  scrollable body, and sticky submit area.
- Desktop: centered dialog with a maximum width of 560px.
- Inputs use visible labels, 16px type on mobile, correct input modes, and
  inline validation.
- Submit button shows `Saving…`, is disabled while saving, and retains its
  width.

### 11. Documents

**Default view:**

- Section header: `Documents` and `Add document`.
- Filter chips: All, Sanction letters, Certificates, NOCs, Other.
- Document cards use a simple file icon, title, type, issued date, and open
  action.
- The overflow action is always available on touch.

**Add flow:**

- Title
- Type
- Issued date
- File picker or URL
- Show selected file name and readable size if available.
- Preserve current data-URL behavior; do not imply cloud upload.
- Replace `alert("Failed to read file")` with an inline error and Toast.

**Empty state:**

- Title: `Keep loan documents together`
- Body: `Add sanction letters, certificates, receipts, or your NOC.`
- Action: `Add first document`

### 12. Loan editor

Replace the large one-page form with progressive disclosure.

#### Mobile

Use a full-height bottom sheet/full-screen dialog with three steps:

1. **Loan**
   - Loan name
   - Lender
   - Category
   - Currency
   - Principal

2. **Terms**
   - Fixed/floating interest type
   - Annual interest rate
   - Tenure
   - Start date
   - Due day, constrained to 1–28
   - Monthly EMI with calculated suggestion

3. **Review**
   - Recast strategy with plain-language explanation
   - Processing fee mode: amount or percent
   - Processing fee value for the selected mode
   - Processing fee financed toggle
   - Live summary: EMI, total interest, total payable, payoff date
   - Submit

The Back action preserves entered values. Dismissing a dirty form requires
confirmation.

Only the selected processing-fee field is submitted. Choosing amount clears
`processing_fee_percent`; choosing percent clears `processing_fee_amount`.

#### Desktop

- Use a centered, maximum 960px dialog.
- Left column contains the current step.
- Right column is a sticky live summary card.
- Step navigation remains visible.
- Avoid a full-screen takeover.

#### Field and copy rules

| Current                        | Replacement                      |
| ------------------------------ | -------------------------------- |
| Loan Narrative                 | Loan name                        |
| New Portfolio Asset            | Add loan                         |
| Refine Loan Details            | Edit loan                        |
| Configure your debt instrument | Enter the terms from your lender |
| Monthly Installment (EMI)      | Monthly EMI                      |
| Auto-Calculate Suggestion      | Use suggested EMI                |
| Strategy                       | If the rate changes              |
| Adjust Tenure                  | Keep EMI, change payoff date     |
| Adjust EMI                     | Keep payoff date, change EMI     |
| Deploy Asset                   | Add loan                         |
| Apply Updates                  | Save changes                     |
| Synchronizing…                 | Saving…                          |

#### Validation

- Use the same constraints as `EmiLoanSchema`.
- Show errors under the related field after blur or submit.
- Focus the first invalid field on submit.
- Preserve server errors in an alert region above the current step.
- Do not silently replace a user-entered EMI with a suggestion unless the EMI
  field is blank.

### 13. Loading, empty, error, and feedback states

#### Loading

- Keep `AdminModuleSkeleton` for route-level loading.
- Add module-specific composition skeletons:
  - Portfolio hero skeleton
  - Three loan card skeletons
  - Loan Payoff Hero skeleton
  - Chart skeleton that reserves final height
- Avoid list entrance animations after skeleton replacement.

#### Portfolio empty state

- Headline: `A clearer path out of debt starts here`
- Body: `Add a loan to track balances, payments, interest, and your projected
payoff date.`
- Action: `Add your first loan`
- Use a CSS/Lucide composition, not a generated illustration.

#### Fetch error

- Headline: `Loans could not be loaded`
- Body: `Check your connection and try again.`
- Action: `Retry`
- Retain previously loaded data during a background refresh failure and show a
  nonblocking Toast instead of blanking the workspace.

#### Save error

- Keep the sheet/dialog open.
- Show a field-specific error when the server returns validation detail.
- Otherwise show `Changes were not saved. Try again.`

#### Success feedback

- `Loan added`
- `Loan updated`
- `Payment logged`
- `Rate change added`
- `Document saved`
- Destructive actions use past-tense confirmation after success.

## Design System

### Color

Use only the LifeOS semantic tokens:

- Accent: `accent`, `accent-hover`
- Positive progress: `success`, `success-muted`
- Due soon: `warning`, `warning-muted`
- Error/overdue/destructive: `danger`, `danger-muted`
- Neutral surfaces/text: `zinc-50` through `zinc-950`

Rules:

- Never use raw hex in components.
- Never introduce `green-*`, `red-*`, `amber-*`, `blue-*`, or other
  hardcoded hue classes.
- Never use `text-white` or `text-black`.
- Every semantic color also has a text label, icon, position, or pattern.
- Charts read CSS variables at render time so all 14 themes and light mode
  remain coherent.

### Typography

Retain the app’s existing typography:

- `font-sans` for headings, labels, and prose.
- `font-mono` only for money values, rates, dates in dense rows, and chart
  tooltips.
- Use `tabular-nums` for every changing financial value.

Suggested scale:

| Role          |       Mobile |      Desktop |
| ------------- | -----------: | -----------: |
| Hero amount   |  32px / 1.05 |  40–48px / 1 |
| Page title    |   24px / 1.2 |  30px / 1.15 |
| Section title |   18px / 1.3 |   20px / 1.3 |
| Card title    |      15–16px |      15–16px |
| Body          |      14–16px |      14–16px |
| Metadata      | 12px minimum | 12px minimum |
| Form control  | 16px minimum |      14–16px |

Avoid broad use of uppercase and letter spacing. Reserve uppercase for short
eyebrows such as `TOTAL OUTSTANDING`; ordinary labels use sentence case.

### Spacing

Use the repository’s 4/8px rhythm:

- Page gutters: 16 / 20 / 24px by viewport.
- Section gap: 24px mobile, 32px desktop.
- Card padding: 16px compact, 20–24px standard, 28–32px hero.
- Control height: 44px minimum.
- Touch-target gap: 8px minimum.

### Radius

- Controls and chips: 10–12px.
- Standard cards: 16–20px.
- Hero/dialog: 24px.
- Avoid inconsistent one-off radii such as 40px on ordinary panels.

### Iconography

- Lucide React only.
- Standard stroke width and sizes: 16, 18, 20, 24px.
- Icon-only actions require an accessible name and a 44px hit area.
- Remove the inline custom credit-card SVG in `PaymentList.tsx`; import the
  Lucide icon.

## Motion System

Motion communicates hierarchy and cause/effect.

### Tokens

- Fast feedback: 120–160ms.
- Standard state change: 180–240ms.
- Sheet/dialog entrance: 260–320ms.
- Exit duration: approximately 70% of entrance duration.
- Use transform and opacity only.

### Approved motion

- Mobile portfolio → loan: 12–16px directional slide + fade.
- Sheet/dialog: slide from bottom on mobile; scale/fade on desktop.
- Payoff Runway marker: spring or eased transform when simulation changes.
- Number results: subtle crossfade, not a slot-machine effect.
- Press feedback: scale to 0.98 without shifting layout.

### Remove

- Pulsing active-tab icon.
- Decorative card-by-card entrance animation on long lists.
- Simultaneous chart animations with 1500–2000ms durations.
- Hover lift on every surface.
- Oversized icon scaling in empty states.

### Reduced motion

- Remove translations and scaling.
- Use instant or 100ms opacity changes.
- Disable chart drawing animations.
- Keep all state changes and content fully available.

## Accessibility Requirements

- Use semantic headings with one H1.
- All forms use `label` + `htmlFor`; no placeholder-only labels.
- Tabs implement the complete tab pattern and arrow-key navigation if custom.
- Selected loan uses `aria-current`.
- Progress visuals expose `role="progressbar"` with
  `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- The Payoff Runway has a concise text alternative:
  `31% repaid. Baseline payoff December 2043. With ₹10,000 extra monthly,
projected payoff July 2041, 29 months earlier.`
- Toasts use `role="status"` or `role="alert"` and do not steal focus.
- Dialogs have `role="dialog"`, `aria-modal`, labelled title, Escape close,
  focus containment, and focus return to the trigger.
- Do not hide destructive actions until hover.
- Tooltips are not the only place exact chart values appear.
- Support keyboard, mouse, touch, 200% zoom, and `prefers-reduced-motion`.
- Test high-contrast/focus-visible behavior in at least one dark and one light
  theme.

## State and Data Flow

### Preserve

- `GET /api/content?module_type=emi_loan`
- `POST /api/content`
- `PUT /api/content/[id]`
- `GET /api/widgets/summary?module_type=emi_loan`
- `EmiLoanSchema`
- `computeSchedule`, `getOutstandingAsOf`, CSV/PDF export helpers
- Module settings and formatting behavior

### Add presentation state

```ts
type PortfolioStatusFilter = "active" | "closed" | "all";
type LoanSection =
  | "overview"
  | "insights"
  | "schedule"
  | "activity"
  | "documents";
type ActivityView = "payments" | "rates";
type EditorMode = "create" | "edit" | null;
```

### Suggested derived view model

Create a presentation-only helper so rendering components do not each
recalculate or reinterpret the same financial data:

```ts
interface PortfolioCurrencySummary {
  currency: string;
  outstanding: number;
  monthlyCommitment: number;
  originalPrincipal: number;
  principalPaid: number;
}

interface PortfolioViewModel {
  activeCount: number;
  closedCount: number;
  allCount: number;
  currencies: PortfolioCurrencySummary[];
  nearestDue: {
    loanId: string;
    loanTitle: string;
    currency: string;
    amount: number;
    dueDate: string;
  } | null;
  totalInterestSaved: number;
}

interface LoanWorkspaceViewModel {
  schedule: ScheduleResult;
  simulatedSchedule: ScheduleResult;
  outstanding: number;
  principalPaid: number;
  progressPercent: number;
  nextDue: ScheduleRow | null;
  currentAnnualRate: number;
  baselinePayoffDate: string | null;
  simulatedPayoffDate: string | null;
  paidInterest: number;
  remainingInterest: number;
  totalPayable: number;
  interestSaved: number;
  tenureSavedMonths: number;
}
```

Provide these pure functions:

```ts
buildPortfolioViewModel(
  loans: EmiLoan[],
  now: Date,
  decimals: number,
): PortfolioViewModel

buildLoanWorkspaceViewModel(
  loan: EmiLoan,
  extraMonthly: number,
  now: Date,
  decimals: number,
): LoanWorkspaceViewModel
```

This function belongs in `lib/emi-view-model.ts` and receives unit tests. It
uses existing calculation helpers; it does not duplicate amortization logic.

### Data mutation behavior

- Optimistic UI is not required for this overhaul.
- Disable only the relevant submit action while saving, not the entire module.
- After a successful mutation, update the selected loan in local state.
- On failure, keep the user’s form data and show recovery.
- Confirmation dialogs precede destructive changes.
- Preserve the existing create, update, and payload-update analytics actions.
- Do not add section-view analytics in this overhaul.

## File Plan

### Files to create

| File                                                                  | Responsibility                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/modules/emi-tracker/lib/emi-view-model.ts`                       | Pure portfolio/workspace presentation calculations built on existing EMI utilities |
| `src/modules/emi-tracker/components/PortfolioHero.tsx`                | Replaces the four portfolio metric cards with the composed debt hero               |
| `src/modules/emi-tracker/components/PayoffRunway.tsx`                 | Accessible start/today/simulated/baseline payoff timeline                          |
| `src/modules/emi-tracker/components/ScheduleCards.tsx`                | Mobile-first grouped amortization rows with progressive loading                    |
| `src/modules/emi-tracker/components/ActivityTab.tsx`                  | Payments/rate-history nested navigation and section composition                    |
| `src/modules/emi-tracker/components/EmiEntryDialog.tsx`               | Responsive bottom sheet / desktop dialog shell for module entry forms              |
| `src/modules/emi-tracker/components/LoanEditor.tsx`                   | Progressive three-step create/edit experience replacing the current form           |
| `src/modules/emi-tracker/components/__tests__/PortfolioHero.test.tsx` | Currency, next-due, and mixed-currency hero behavior                               |
| `src/modules/emi-tracker/components/__tests__/PayoffRunway.test.tsx`  | Progress, baseline, simulation, warning, and accessibility behavior                |
| `src/modules/emi-tracker/components/__tests__/ScheduleView.test.tsx`  | Mobile cards, desktop table, next payment, and show-more behavior                  |
| `src/modules/emi-tracker/components/__tests__/LoanEditor.test.tsx`    | Step navigation, validation, existing field preservation, and submission           |
| `src/modules/emi-tracker/__tests__/emi-view-model.test.ts`            | Pure derived financial view-model coverage                                         |

### Files to modify

| File                                                        | What changes                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/emi-tracker/AdminView.tsx`                     | New toolbar, fetch error/retry, URL-backed loan selection, status filter, mobile view transitions, `xl` master/detail shell, editor dialog |
| `src/modules/emi-tracker/components/LoanList.tsx`           | Filtered-state empty view, remove per-card entrance staggering, navigator semantics                                                        |
| `src/modules/emi-tracker/components/LoanCard.tsx`           | New hierarchy, wrapping, status, next EMI amount/date, chevron, touch sizing, selected semantics                                           |
| `src/modules/emi-tracker/components/LoanDetails.tsx`        | Five-section IA, view-model consumption, dynamic chart loading, new responsive workspace                                                   |
| `src/modules/emi-tracker/components/LoanHeader.tsx`         | Mobile back path, simplified identity, real actions only                                                                                   |
| `src/modules/emi-tracker/components/LoanKeyMetrics.tsx`     | Convert four equal cards into compact facts inside/under the Payoff Hero                                                                   |
| `src/modules/emi-tracker/components/LoanOverviewTab.tsx`    | Outcome-first simulator, presets, numeric input, comparison results, collapsible loan terms                                                |
| `src/modules/emi-tracker/components/PayoffChart.tsx`        | Baseline vs simulated balance curves, semantic chart tokens, responsive dimensions, accessible summary                                     |
| `src/modules/emi-tracker/components/LoanAnalysis.tsx`       | Replace duplicate donuts with composition bar, balance trend, and cost summary; plain copy                                                 |
| `src/modules/emi-tracker/components/ScheduleTable.tsx`      | Responsive composition with `ScheduleCards`, accessible table, sticky header, export menu                                                  |
| `src/modules/emi-tracker/components/PaymentList.tsx`        | Timeline layout, dialog-based add flow, visible actions, Lucide icon, confirmations/toasts                                                 |
| `src/modules/emi-tracker/components/RateAdjustmentList.tsx` | Rate timeline, fixed-loan state, dialog add flow, visible actions, confirmations/toasts                                                    |
| `src/modules/emi-tracker/components/DocumentList.tsx`       | Filterable document cards, dialog add flow, inline upload errors, visible actions                                                          |
| `src/modules/emi-tracker/Widget.tsx`                        | Small visual refresh only; keep one hero metric + one highlight and 280px contract                                                         |
| `src/modules/emi-tracker/__tests__/AdminView.test.tsx`      | Fetch error, filters, mobile master/detail behavior, URL state, editor open/close                                                          |
| `src/modules/emi-tracker/README.md`                         | Updated IA, components, mobile behavior, and validation notes                                                                              |
| `src/modules/emi-tracker/info.md`                           | Plain-language feature/help copy matching the redesigned module                                                                            |

### Files to remove after replacement

| File                                                | Reason                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `src/modules/emi-tracker/components/EMIMetrics.tsx` | Replaced by `PortfolioHero.tsx`                                  |
| `src/modules/emi-tracker/components/LoanForm.tsx`   | Replaced by `LoanEditor.tsx` after all tests and imports migrate |

### Files to verify but not redesign

| File                                       | Verification                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/modules/emi-tracker/types.ts`         | Existing payload contract is sufficient; only add presentation types if they are module-wide |
| `src/modules/emi-tracker/lib/emi-utils.ts` | Reuse calculations and exports; change only proven calculation defects                       |
| `src/lib/schemas.ts`                       | Ensure editor constraints match `EmiLoanSchema`; do not change the schema                    |
| `src/app/admin/layout.tsx`                 | Confirm module gutters and sticky offsets work inside the shell; no global layout rewrite    |
| `src/app/globals.css`                      | Use existing tokens; add no EMI-specific global colors                                       |
| `src/components/ui/ConfirmDialog.tsx`      | Reuse for delete/dirty-dismiss confirmation                                                  |
| `src/components/ui/Toast.tsx`              | Reuse for save/error feedback                                                                |

## Implementation Phases

### Phase 1 — Regression safety and view models

**Dependencies:** None

1. Add failing tests for `buildPortfolioViewModel` and
   `buildLoanWorkspaceViewModel`.
2. Implement both pure view-model helpers using existing schedule utilities.
3. Add test fixtures covering:
   - Active loan
   - Closed loan
   - Fixed-rate loan
   - Floating-rate loan with adjustments
   - Prepayment
   - Extra monthly simulation
   - Schedule warning
   - Mixed currency portfolio summary
4. Expand AdminView tests to lock in existing create, update, and selection
   behavior before changing composition.
5. Commit this phase separately as calculation/presentation foundation.

**Exit check:** Financial values match the existing utilities for zero extra
payment, and simulated values change only when extra payment changes.

### Phase 2 — Responsive portfolio shell

**Dependencies:** Phase 1

1. Replace nested module padding/container styles.
2. Add the module toolbar.
3. Build `PortfolioHero`.
4. Add status filtering and filtered empty states.
5. Rebuild `LoanCard` and `LoanList`.
6. Add a user-visible fetch failure with Retry.
7. Implement URL-backed selected-loan state.
8. Implement mobile portfolio/detail view switching and scroll restoration.
9. Switch to side-by-side navigation only at `xl`.

**Exit check:** At 360px, selecting a loan replaces the portfolio view. At
1280px, the navigator and workspace are both visible.

### Phase 3 — Loan Payoff Hero and navigation

**Dependencies:** Phases 1–2

1. Build `PayoffRunway` with semantic and text alternatives.
2. Recompose `LoanHeader` and `LoanKeyMetrics`.
3. Change six tabs to the five-section model.
4. Add accessible tab semantics and keyboard behavior.
5. Remove pulsing and redundant card motion.
6. Connect section state to the URL.

**Exit check:** The first mobile detail viewport answers balance, progress,
next due, and payoff. Every section is reachable without horizontal scrolling.

### Phase 4 — Simulator and insights

**Dependencies:** Phase 3

1. Add synchronized numeric/range simulator controls.
2. Add EMI-relative preset chips and reset.
3. Update the Payoff Runway from simulation.
4. Rebuild `PayoffChart` as baseline vs simulated.
5. Rebuild Insights with the composition bar, balance trend, and cost summary.
6. Replace raw chart colors with CSS theme variables.
7. Add accessible summaries and reduced-motion handling.
8. Lazy-load chart-heavy sections with a rich skeleton.

**Exit check:** Changing extra monthly payment visibly changes payoff date,
months saved, interest saved, runway marker, and comparison curve with no
layout shift.

### Phase 5 — Schedule, activity, and documents

**Dependencies:** Phase 3

1. Build `ScheduleCards` and progressive row disclosure.
2. Improve the desktop table and next-payment highlight.
3. Preserve CSV/PDF exports with responsive action placement.
4. Build `ActivityTab`.
5. Convert add-payment and add-rate flows to `EmiEntryDialog`.
6. Convert document add to the same responsive pattern.
7. Add visible overflow/delete controls for touch.
8. Add confirmation and Toast feedback.
9. Replace upload alerts with inline error handling.

**Exit check:** No core record-management action depends on hover, and the
schedule is fully readable at 320–390px without horizontal scrolling.

### Phase 6 — Progressive loan editor

**Dependencies:** Phases 1–3

1. Add failing tests for the three-step flow and payload preservation.
2. Build `LoanEditor` inside `EmiEntryDialog`.
3. Restore editable lender input.
4. Expose fixed/floating interest type.
5. Add optional processing-fee fields.
6. Align due-day bounds to 1–28.
7. Add the live loan summary.
8. Add dirty-dismiss confirmation and first-error focus.
9. Migrate AdminView from `LoanForm` to `LoanEditor`.
10. Remove `LoanForm.tsx` only after tests and imports prove migration is
    complete.

**Exit check:** Creating and editing preserve all pre-existing payments,
documents, adjustments, status, optional fields, and user-entered EMI.

### Phase 7 — Widget, documentation, and full polish

**Dependencies:** Phases 2–6

1. Refresh the widget typography/surface without adding content or
   interactions.
2. Update README and module info.
3. Audit copy against the replacement table.
4. Audit all controls for 44px hit areas and focus visibility.
5. Audit all component classes for forbidden hardcoded hues and raw hex.
6. Audit reduced-motion behavior.
7. Run focused tests, then the complete repository verification.
8. Complete browser visual QA in the matrix below.

**Exit check:** The full module is coherent in mobile, tablet, and desktop
layouts, light/dark themes, keyboard navigation, and reduced motion.

## Testing Strategy

### Unit tests

- Portfolio summary:
  - No loans
  - One active loan
  - Closed/archived filtering
  - One currency
  - Multiple currencies without false aggregation
- Workspace view model:
  - Baseline values
  - Extra payment
  - No-interest loan
  - Closed loan
  - Schedule warnings
  - Date boundaries
- Simulator:
  - Preset math
  - Clamping
  - Reset
  - User EMI remains authoritative
- Schedule:
  - Next row
  - Paid/upcoming labels
  - Year grouping
  - Progressive row loading
- Form:
  - Step validation
  - Lender editing
  - Fixed/floating selection
  - Due-day max 28
  - Processing fee preservation
  - Existing arrays preserved on edit

### Component and accessibility tests

- Unique H1.
- Accessible Add loan button.
- Selected loan exposes `aria-current`.
- Payoff progress exposes progressbar values and summary.
- Tab roles and selected states.
- Dialog title, modal state, Escape behavior, and focus return.
- Destructive actions are present without hover.
- Error and success messages use alert/status roles.
- Fixed-rate loans explain why rate changes are unavailable.
- Loading does not show empty-state copy.

### Visual QA matrix

| Viewport | Theme | State                  | Must verify                                                   |
| -------- | ----- | ---------------------- | ------------------------------------------------------------- |
| 360×800  | Dark  | Portfolio with 3 loans | No horizontal scroll; hero + first card visible; 44px actions |
| 390×844  | Dark  | Selected active loan   | Back path, runway, facts, tabs, simulator                     |
| 430×932  | Light | Add loan step 1–3      | Keyboard, sticky actions, no clipped fields                   |
| 768×1024 | Dark  | Insights and schedule  | Chart labels, full table, no squeezed content                 |
| 1024×768 | Light | Portfolio              | Single-column behavior remains intentional                    |
| 1280×800 | Dark  | Master/detail          | Sticky navigator, workspace width, no nested scroll           |
| 1440×900 | Light | Mixed currencies       | No false total; hierarchy remains clear                       |
| 1536×960 | Dark  | Long schedule/activity | Readable density; max width prevents stretching               |

Repeat the 390×844 selected-loan check with:

- `prefers-reduced-motion: reduce`
- 200% browser zoom
- Keyboard-only navigation
- A long loan name and lender
- An amount with enough digits to exercise Indian formatting
- Empty documents and empty payments
- Network/API failure

### Commands

Run focused tests during each phase, then:

```bash
pnpm lint
pnpm format
pnpm typecheck
pnpm test
pnpm build
```

Before handoff, run the repository-required aggregate check:

```bash
pnpm check
```

## Acceptance Criteria

### Portfolio

- [ ] The module has a clear H1, supporting sentence, and one Add loan CTA.
- [ ] Four equal metric cards are replaced by one Portfolio Hero.
- [ ] Mixed currencies are shown separately.
- [ ] Search and Active/Closed/All filters work and persist on mobile return.
- [ ] Loan cards are readable, focusable, and at least 44px tappable.
- [ ] Fetch errors show Retry.

### Mobile navigation

- [ ] Portfolio and selected loan are separate views below `xl`.
- [ ] Back returns to the previous portfolio scroll/filter state.
- [ ] Browser URL reflects selected loan and section.
- [ ] No section navigation depends on horizontal scrolling.
- [ ] No document-level horizontal scroll occurs at 320px.

### Loan workspace

- [ ] Outstanding balance and Payoff Runway dominate the hierarchy.
- [ ] Next EMI, monthly EMI, rate, and remaining interest are visible without
      opening another section.
- [ ] Closed, future, and warning states are explicitly designed.
- [ ] The five-section IA replaces the six current tabs.

### Simulator and charts

- [ ] Numeric input, slider, presets, and reset stay synchronized.
- [ ] Results show payoff date, months saved, and interest saved.
- [ ] Baseline and simulated payoff are compared in one chart.
- [ ] Insights use semantic tokens and clear non-donut-first visualizations.
- [ ] Charts have text summaries and reduced-motion behavior.

### Schedule and records

- [ ] Mobile schedule uses grouped cards without horizontal scrolling.
- [ ] Desktop schedule remains a precise, accessible table.
- [ ] CSV and PDF export still work.
- [ ] Payments and rates are combined under Activity.
- [ ] Add flows use responsive dialogs/sheets.
- [ ] Destructive actions are visible on touch and confirmed.
- [ ] Document upload errors are inline and recoverable.

### Editor

- [ ] Add/edit is a three-step progressive flow.
- [ ] Lender is editable.
- [ ] Interest type and processing fees are supported.
- [ ] Due day is constrained to 1–28.
- [ ] The live summary uses the same schedule logic as the saved result.
- [ ] Unsaved dismissal is confirmed.
- [ ] Existing nested arrays are preserved when editing.

### System quality

- [ ] All colors use LifeOS semantic/zinc tokens.
- [ ] No raw chart hex colors remain.
- [ ] No meaningful text is smaller than 12px; mobile controls use 16px text.
- [ ] All interactive targets are at least 44×44px.
- [ ] Keyboard, focus, screen-reader semantics, and reduced motion are covered.
- [ ] Module widget remains under the 280px contract.
- [ ] `pnpm check` passes.

## Risks and Mitigations

| Risk                                                      | Impact                               | Mitigation                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Mobile master/detail state becomes tangled with URL state | Broken back behavior or lost filters | Keep navigation state in one AdminView hook; test push/replace/back explicitly                                              |
| Derived calculations drift from existing utilities        | Incorrect financial display          | Create a pure view model that calls existing utilities; add parity tests before UI work                                     |
| Charts render incorrectly across themes                   | Low contrast or wrong colors         | Use CSS variables only and test at least one light and one dark theme                                                       |
| Progressive editor drops optional/nested fields           | Data loss on edit                    | Build payload from existing loan first, overwrite edited fields, and test array/optional-field preservation                 |
| Large schedules hurt mobile performance                   | Slow initial render and scrolling    | Render an initial card window and add explicit Show more; no row animation                                                  |
| Dialog/sheet focus handling is incomplete                 | Keyboard and screen-reader blocker   | Reuse proven repository modal conventions and add focus/Escape/return tests                                                 |
| Visual ambition adds excessive effects                    | Busy interface and jank              | Keep one signature visualization; restrict blur, shadows, and motion to hierarchy-critical surfaces                         |
| Existing dirty working tree overlaps implementation       | Accidental overwrite                 | Implementation agent must inspect `git status` and preserve unrelated/user changes before editing                           |
| Local MongoDB authentication blocks visual QA             | Incomplete browser verification      | Repair or provide valid local environment credentials before final Playwright QA; unit/component work can proceed meanwhile |

## What Is Not Changing

- No new MongoDB collection.
- No public EMI Tracker page.
- No currency conversion or exchange-rate service.
- No bank-account integration or automatic payment import.
- No notification/reminder backend.
- No change to the shared content API contract.
- No removal of CSV/PDF export.
- No new chart or component library.
- No global LifeOS typography replacement.
- No redesign of the admin sidebar or other modules.
- No interactive controls inside the dashboard widget.

## Handoff Notes for the Implementing Agent

1. Read this document completely before editing.
2. Inspect `git status`; the repository may contain unrelated user changes.
3. Start with tests and the pure view-model phase.
4. Do not try to achieve the redesign through class changes alone; the mobile
   master/detail model and information architecture are required.
5. Preserve the existing API and schema unless a failing test proves a backend
   defect.
6. Use `ConfirmDialog`, `Toast`, shared skeletons, Lucide, Framer Motion,
   Recharts, `cn()`, and existing semantic tokens.
7. Treat the Payoff Runway as the visual signature and keep all other effects
   restrained.
8. Validate incrementally at 360px and 1280px rather than waiting until the end.
9. Finish with full Playwright visual QA and `pnpm check`.

## Suggested Implementation Prompt

> Implement the EMI Tracker overhaul described in
> `docs/design-plans/2026-07-30-emi-tracker-ui-overhaul.md`. Follow the phases
> in order, use test-driven development for behavior changes, preserve all
> unrelated working-tree changes, and do not modify the API/schema unless the
> plan explicitly requires it. The Payoff Runway and mobile master/detail flow
> are non-negotiable acceptance criteria. Run focused tests after every phase,
> visually verify the specified viewport matrix, and finish with `pnpm check`.
