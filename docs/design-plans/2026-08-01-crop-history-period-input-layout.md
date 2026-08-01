# Crop History Compact Period Inputs — Implementation Plan

**Date:** 2026-08-01
**Status:** Ready for user review
**Change type:** UI bugfix and focused responsive-layout refinement
**Primary surface:** `/admin/crop-history` spreadsheet tab

## Goal

Fix the Crop History spreadsheet’s Period Inputs row so long labels, units,
values, and year-over-year badges never collide. Keep each period column
compact instead of allowing a small number of periods to expand across the
entire viewport.

The selected presentation is a two-tier metric cell: the field name and unit
appear on the first line, while the value and optional change badge appear on
the second line.

```text
Avg Price       ₹/50kg bag
3,800              ↗ +8.6%
```

## Current State

The behavior is owned by
`src/modules/crop-history/SpreadsheetTab.tsx`.

- The table uses `w-full` and `whitespace-nowrap` near line 582. When the table
  has only a few periods, `w-full` distributes the available viewport width
  through those columns, making them much wider than their content requires.
- Period headers and cells specify only `min-w-[150px] md:min-w-[180px]`
  around lines 598, 655, 742, 799, 888, and 942. There is no compact table
  width policy to counter the table-level `w-full` behavior.
- A summary-field row uses one horizontal `flex justify-between` line around
  lines 814–855. The label reserves 64/96px and the value reserves 96px, while
  the year-over-year badge consumes additional width.
- The unit is rendered once beside the field name around lines 823–827 and a
  second time inside the formatted value around lines 848–851.
- The table-wide `whitespace-nowrap` rule and visible overflow allow long
  strings such as `3,800 ₹/50kg bag` to paint outside the value’s allocated
  width and collide with the label or sticky column.
- Sticky first-column cells use `z-10`. The supplied screenshots show scrolled
  period content painting at the edge of the Period Inputs cell, so the
  spreadsheet also needs an explicit local stacking context and a stronger,
  consistent sticky-column layer.
- `src/modules/crop-history/__tests__` contains module, formula, settings,
  insights, and widget coverage, but no direct SpreadsheetTab layout or
  rendering test.
- The crop configuration and persisted record formats already separate field
  names, units, and numeric values. No API, schema, or data migration is needed.

## Requirements

### Functional requirements

- Render each summary field as two visual lines inside its period cell.
- First line: field name on the left and its unit on the right.
- Second line in view mode: locale-formatted numeric value on the left and the
  existing year-over-year badge on the right.
- Second line in edit mode: numeric input on the left and the same optional
  year-over-year badge on the right.
- Render the unit exactly once per period/field cell.
- Preserve current value parsing, editing, saving, zero-value display,
  year-over-year calculation, colors, and hover behavior.
- Preserve the internal horizontal spreadsheet scroller when there are more
  periods than the viewport can contain.
- Keep the sticky Metric / Area column opaque and above all scrolling period
  content.

### Layout requirements

- Replace the table’s viewport-filling width with content-driven width so a
  one-, two-, or three-period table does not stretch columns merely to fill the
  card.
- Retain the existing 150px small-screen and 180px `md` period-column minimums.
  Do not increase these minimums to solve the overlap.
- Allow a period column to grow only when another unchanged row has genuinely
  wider non-truncatable content; do not impose a large fixed column width.
- Keep the Crop History card and header full width. Only the inner table should
  size to its content.
- Use `min-w-0`, `overflow-hidden`, and targeted truncation inside the summary
  cell so text cannot force or paint beyond its intended layout track.
- Keep numeric figures monospaced/tabular through the existing `font-mono`
  styling.

### Accessibility and theme requirements

- Keep the full field name and unit discoverable with a `title` on truncated
  text.
- Add an explicit accessible name to each edit input in the form
  `"<field name> for <period>"`; the visible label and input are otherwise
  separated by the table structure.
- Do not rely on color alone for trend direction; retain the existing
  TrendingUp/TrendingDown icon and signed percentage text.
- Use only the repository’s semantic `success`, `danger`, and `zinc` tokens.
- Verify readable contrast and non-overlap in both a light and dark LifeOS
  theme.

### Compatibility requirements

- Do not change `FieldDef`, `CropConfig`, `CropRecord`, `PeriodData`, API
  payloads, MongoDB documents, formula evaluation, or settings storage.
- Do not change the ordering or semantics of periods.
- Keep the current rightmost-period auto-scroll behavior.
- Keep source fields, totals, calculated fields, and notes behavior unchanged;
  only table sizing and sticky layering may affect those rows.

## Assumptions

- “Avg Price above and another below” means the field identity is the top line
  and its value is the bottom line.
- The unit belongs on the top metadata line, opposite the field name. This
  leaves the bottom line available for the value and trend badge and avoids
  repeating the unit.
- Period columns should remain content-sized with the existing 150/180px
  minimums, not receive a new hard maximum. This avoids unnecessary stretching
  while still allowing genuinely long content elsewhere in the table to remain
  usable.
- Horizontal scrolling inside this spreadsheet is intentional for many
  periods; the fix should reduce unnecessary scrolling but not replace the
  spreadsheet with a mobile card list.
- Existing behavior that displays an em dash for numeric zero remains
  unchanged because this task is visual rather than a data-semantics change.
- No standalone shared component is necessary for one specialized row. The
  markup remains local to `SpreadsheetTab.tsx` to avoid premature abstraction.

## Approaches Considered

### Selected: two-tier cell plus content-sized table

Place `field name + unit` above `value/input + YoY badge`, remove the duplicate
unit from the value, and change the inner table from viewport-filling to
content-sized. This addresses both observed problems without making every
period wider.

### Rejected: increase period columns to 260–300px

This would stop most collisions but would create more horizontal scrolling and
directly conflict with the requirement to avoid unnecessary width.

### Rejected: keep one line and truncate the value

Truncating the primary numeric value would make the spreadsheet compact but
would hide the most important data. The label can tolerate bounded truncation
with a tooltip; the number should remain visible.

## Proposed Design

### 1. Content-driven table width

In `SpreadsheetTab.tsx`, replace the table’s `w-full` class with `w-max` while
retaining `text-left text-sm whitespace-nowrap`. The surrounding
`overflow-x-auto` element remains full width and continues to own horizontal
scrolling.

Do not add `min-w-full`, because that would reintroduce viewport-driven column
stretching when only a few periods exist. The unused portion of the spreadsheet
card should show the existing card background.

Retain the current `min-w-[150px] md:min-w-[180px]` period-cell classes. The
browser’s table layout can then use those compact minimums and grow a column
only for content that truly requires it.

### 2. Two-tier summary-field cell

Replace the horizontal summary-field wrapper with a vertical stack using the
existing spacing scale:

1. The outer field wrapper remains the hover target and uses `px-3 py-2`.
2. The top row uses `flex min-w-0 items-center justify-between gap-2`.
3. The field name uses `min-w-0 truncate text-xs text-success/70` and keeps a
   title containing the full field name and unit.
4. The optional unit is a separate, smaller, muted element. Give it bounded
   width plus truncation rather than allowing it to force the column wider.
5. The bottom row uses `mt-1 flex min-w-0 items-center justify-between gap-2`.
6. In view mode, render only `formatNum(val)` in the numeric element. Do not
   append `f.unit` a second time.
7. Keep the number readable and dominant with `font-mono text-success`; use
   overflow protection only for pathological values, with the full formatted
   value available through `title`.
8. Keep `YoYBadge` as a `shrink-0` sibling on the right side of the bottom row.
9. In edit mode, change the input from a fixed `w-24` to a flexible
   `min-w-0 flex-1` control so it shares the second line with the badge without
   increasing the column width.
10. Add an `aria-label` to the input using the field name and period in the
    exact form `Avg Price for 2026-27`.

### 3. Sticky-column containment

Add `relative isolate` to the horizontal scroll container. Use a simple local
layer scale:

- Ordinary period content: default/`z-0`.
- Sticky body cells, including Period Inputs: `z-20`.
- Sticky table header cell: `z-30`.

Keep each sticky cell’s existing opaque semantic background. This ensures that
period content scrolls beneath the Metric / Area column rather than painting
over its edge.

### 4. Data flow and behavior

No data-flow changes are required:

1. `records` continue to populate `localData` through the existing effect.
2. The summary cell continues to read
   `localData[period]?.summary_data?.[f.id]`.
3. Edit input changes continue through `handleSummaryChange()`.
4. Save operations continue through `handleSavePeriod()` and
   `handleSaveAll()`.
5. `YoYBadge` continues to compare the current value with the immediately
   preceding period.

## Files To Change

| File                                                               | Action | Detailed Change                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/crop-history/SpreadsheetTab.tsx`                      | Modify | Make the table content-sized, convert summary fields to the two-tier label/value layout, remove duplicated unit rendering, make edit inputs flex safely, add accessible input names, and strengthen sticky-column layering.                                                                         |
| `src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx`       | Create | Render representative summary fields and verify two-tier semantic grouping, one unit per cell, formatted values, trend badges, edit-mode input labels, and the compact table-width contract. Include a local `framer-motion` Reorder mock so global test infrastructure does not need modification. |
| `docs/design-plans/2026-08-01-crop-history-period-input-layout.md` | Add    | Record the implementation-ready design, assumptions, tests, risks, and rollback path.                                                                                                                                                                                                               |

No files should be deleted.

## Implementation Phases

### Phase 1: Add a failing layout regression test

- Create
  `src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx`.
- Provide minimal `Reorder.Group` and `Reorder.Item` test doubles that render
  their requested `as` elements and strip motion-only props.
- Render `SpreadsheetTab` with:
  - one crop;
  - an `Avg Price` summary field using the unit `₹/50kg bag`;
  - at least two periods so a year-over-year badge can render;
  - representative values such as 3,800 and 7,800;
  - no source areas, because this regression is isolated to Period Inputs.
- Assert that each period cell contains one `Avg Price`, one unit, and one
  formatted value, rather than repeating the unit beside the value.
- Assert that the label group and value group occupy distinct DOM wrappers,
  encoding the two-tier layout contract.
- Assert that the table is content-sized (`w-max`) and does not retain
  `w-full`.
- Toggle Edit mode and assert that each numeric input has an accessible name
  containing both the field name and period.
- Run the focused test and confirm it fails against the current single-line,
  duplicate-unit markup before editing production code.

### Phase 2: Implement the compact Period Inputs layout

- Modify the table width class in `SpreadsheetTab.tsx` from `w-full` to
  `w-max`.
- Replace the summary field’s single horizontal row with the two-tier structure
  described above.
- Remove `f.unit` from the view-mode formatted value string.
- Render the unit once in the top row and constrain both top-row text elements
  with `min-w-0`/truncation.
- Make the view value, edit input, and badge coexist within the second row
  without fixed-width overflow.
- Add the period-aware `aria-label` to the edit input.
- Run the focused test until it passes.

### Phase 3: Correct sticky layering

- Add `relative isolate` to the existing `overflow-x-auto scroll-smooth`
  container.
- Raise the sticky Metric / Area header to `z-30`.
- Raise every sticky first-column body cell to `z-20` for consistent behavior
  across source, totals, Period Inputs, calculated, and notes rows.
- Preserve opaque semantic backgrounds on those cells.
- Re-run the focused test and inspect the DOM class contract if the test covers
  layering.

### Phase 4: Verify behavior and visual quality

- Run `pnpm test src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx`.
- Run `pnpm check` as required by the repository’s quality contract.
- Start the app with `pnpm dev` and verify `/admin/crop-history` using
  Playwright.
- At a 1440px-wide desktop viewport:
  - confirm a small number of periods stays compact instead of dividing the
    whole card width;
  - confirm the name/unit line sits above the value/badge line;
  - confirm every value and percentage badge remains readable;
  - horizontally scroll and confirm no content paints over the sticky column.
- At a 375px-wide mobile viewport:
  - confirm period columns retain the compact 150px minimum;
  - confirm horizontal scrolling is confined to the spreadsheet container;
  - verify both view and edit modes;
  - confirm the numeric input remains usable and does not trigger overlap.
- Repeat the visual check in one light and one dark theme.

## Testing Plan

| Test                       | File or Command                                                        | Purpose                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Component regression       | `src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx`           | Prove the unit renders once, label and value are separated, values and YoY badges render, and edit inputs are accessible. |
| Focused test run           | `pnpm test src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx` | Exercise the affected component quickly during red/green implementation.                                                  |
| Full repository validation | `pnpm check`                                                           | Verify lint, TypeScript, production build, and all Vitest tests.                                                          |
| Desktop visual QA          | Playwright at `/admin/crop-history`, 1440px wide                       | Verify compact content-driven columns, two-tier hierarchy, scrolling, and sticky layering.                                |
| Mobile visual QA           | Playwright at `/admin/crop-history`, 375px wide                        | Verify the 150px period minimum, internal scrolling, view/edit layouts, and no text collision.                            |
| Theme visual QA            | Playwright in one light and one dark theme                             | Verify semantic color contrast, dividers, sticky backgrounds, and badge readability.                                      |

## Edge Cases

- **No unit:** Omit the unit element without leaving an empty alignment gap; the
  field name can use the available top-row width.
- **Long field name:** Truncate only the visible top-line label and expose the
  complete name through `title`.
- **Long unit:** Bound and truncate the unit rather than widening every period;
  expose the complete unit through `title`.
- **Large or negative value:** Keep locale formatting and protect the second
  row from overflow. The value remains available through `title` if visual
  truncation becomes unavoidable.
- **Zero or missing value:** Preserve the current em-dash rendering and omit
  the YoY badge.
- **Previous value is zero:** Preserve `YoYBadge` behavior and render no badge
  rather than an infinite percentage.
- **One period:** Keep one compact period column and leave the rest of the card
  as neutral background; do not stretch the column to fill the card.
- **Many periods:** Keep the existing internal horizontal scroller and
  rightmost-period initial position.
- **Edit mode with a badge:** Let the input flex into available width while the
  badge stays visible and non-shrinking.
- **Browser zoom or larger text:** The vertical hierarchy should grow in height
  rather than overlap horizontally; truncated metadata retains a title.

## Risks And Mitigations

- **Risk: `w-max` exposes wider content from another table row.** The existing
  period minimums remain intact, and only genuinely wider content may expand a
  column. Visual QA with representative source, totals, calculated, and notes
  data will catch unexpected expansion.
- **Risk: a very long unit still compresses the field name.** Bound and
  truncate both metadata elements independently and expose full text via
  titles.
- **Risk: the two-line layout increases row height.** The increase is limited
  to the Period Inputs rows and is preferable to increasing every column’s
  width. Use compact 4/8px spacing and do not add decorative padding.
- **Risk: stronger sticky z-index values cover header or focus visuals.** Keep
  the layer scale local with `isolate`, put the sticky header above sticky body
  cells, and verify focus rings in Edit mode.
- **Risk: removing the repeated unit makes the value ambiguous when scanned in
  isolation.** The unit remains directly above the value in the same bounded
  cell, matching the intended label/value hierarchy.

## Rollout And Rollback

This is a client-side presentation change with no schema, API, or stored-data
migration. It can ship normally after automated and visual verification; no
feature flag is required.

Rollback is a single-file UI revert plus removal of the dedicated regression
test. Existing crop-history records remain compatible before and after the
change.

## Non-Goals

- Redesigning source-field, totals, calculated-field, or notes content.
- Changing the 150/180px period-column minimums.
- Changing numeric precision, locale, currency semantics, or zero-value
  behavior.
- Changing crop settings, units stored in configuration, formulas, APIs, or
  MongoDB records.
- Replacing the spreadsheet with responsive cards or removing intentional
  horizontal scrolling for many periods.
- Refactoring the full 984-line SpreadsheetTab component beyond the focused
  layout change.

## Implementer Handoff Checklist

- [x] Requirement is unambiguous or assumptions are explicit.
- [x] Files to change are named.
- [x] Phases are ordered.
- [x] Tests and commands are listed.
- [x] Accessibility and theme requirements are explicit.
- [x] Edge cases are defined without placeholders.
- [x] Risks and rollback notes are covered.
- [x] No API, schema, storage, or migration work is required.
