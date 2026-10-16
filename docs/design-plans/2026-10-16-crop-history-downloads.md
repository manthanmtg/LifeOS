# Crop History Downloads — Implementation Plan

**Date:** 2026-10-16
**Status:** Implementation-ready design; application code is unchanged
**Change type:** Feature with focused save/loading safeguards
**Primary surface:** `/admin/crop-history`, Spreadsheet tab

## Goal

Let an administrator download the selected crop's saved history as a real Excel
workbook, a PDF report, or a standalone HTML report. All three formats must use
the same inputs, calculated results, units, selected periods, and period order.

This plan follows the proposed Download menu and format-specific options dialog.
It covers UI, local export helpers, one dependency, tests, and module documentation.
It requires no new API, database collection, schema, environment variable, or job.

## Current State

- `src/modules/crop-history/AdminView.tsx` owns configuration, records, selected
  crop, and custom period ordering. It fetches
  `/api/content?module_type=crop_history` and passes the selected crop's records
  to `SpreadsheetTab`.
- Initial loading waits for settings only. Record loading has no explicit state;
  the initial fetch ignores HTTP failure and its catch is empty. Refresh has a
  separate fetch implementation. Export must distinguish loading, failure, and
  a successfully loaded empty result.
- `src/app/api/content/route.ts` returns the complete matching collection without
  pagination, sorted by descending creation time. It validates the admin cookie
  for access to private records. Browser export can use already loaded data.
- Content POST returns the created document in `data`, including its `_id`.
  PUT `/api/content/[id]` returns `data: { success: true }`, not the updated
  document. A subsequent records refresh supplies the canonical updated payload.
- `SpreadsheetTab.tsx` owns `localData` and `localPeriods`. Edits and added periods
  remain local until saved. Changing to View mode does not save them. There is
  currently no dirty-state comparison.
- The toolbar contains View / Edit, Save All, and Add Period. Its enclosing card
  has `overflow-hidden`; a menu rendered inside that card can be clipped.
- `handleSaveAll` calls `handleSavePeriod` repeatedly. The inner function resets
  `isSaving` and refreshes records after every period; its errors are swallowed.
  The records effect then replaces all local edits. A batch can therefore expose
  an incorrect idle state or overwrite other unsaved periods during refresh.
  Limit the accompanying save repair to what is needed for reliable export state.
- Configuration defines arbitrary source fields, summary fields, calculated
  fields, units, and constants. Records contain numeric maps and optional notes.
  A configured `text` field still has numeric persistence and UI behavior.
- `FormulaEngine.ts` evaluates calculated fields in configured order. Invalid
  formulas and division by zero resolve to zero through
  `evaluateAllCalculatedFields`; export must preserve this contract.
- Spreadsheet formula context includes configured areas/fields, numeric coercion,
  period summary values, and constants. Calculated percentages are percentage
  points: a result of `25` is displayed as `25%`.
- Source totals are displayed only with more than one area. Source and summary
  cells display zero/missing inputs as a dash; export should distinguish actual
  numeric zero from an absent input instead of losing that information.
- `Dialog.tsx` supplies focus trapping, Escape, backdrop close, and focus restore.
  It does not portal its own content. There is no shared dropdown component.
- `package.json` includes Next.js 16.1.6, React 19.2.3, jsPDF 4.2.x,
  jspdf-autotable 5.0.x, and Vitest 4.0.x. There is no XLSX writer or bundled font.
- `src/modules/emi-tracker/lib/emi-utils.ts` demonstrates client-side lazy PDF
  generation. `src/lib/expense-spaces/report-pdf.ts` is server-only and replaces
  the rupee symbol with `INR`; do not import that renderer into the client.
- Existing `SpreadsheetTab.test.tsx` covers summary layout and input names.
  `AdminView.test.tsx` is a basic rendering smoke test. Formula tests already
  cover the evaluator independently.

## Requirements

1. Add a visible Download button beside View / Edit, with exactly these choices:
   Download as Excel, Download as PDF, Download as HTML.
2. Each choice opens a dialog with all saved periods selected by default,
   optional selection of specific periods, and Include notes enabled by default.
3. Export the active crop only, using saved records and current successfully
   saved configuration. Include all configured areas and fields.
4. Preserve custom period order. A period selection is a filter on that order,
   not a request to sort periods chronologically.
5. Include per-area inputs, existing source totals, period inputs, calculated
   results, and optional notes. Do not invent aggregate revenue/yield metrics.
6. Produce `.xlsx`, `.pdf`, and UTF-8 `.html` files with matching MIME types and
   safe, descriptive filenames.
7. Disable export during loading, failed loading, saves/deletes/settings saves,
   or unsaved edits. Explain the reason visibly. No save is triggered by Download.
8. Keep generation failures in the dialog with a retry action. Never download a
   partial file or silently omit periods, unsupported PDF text, or invalid data.
9. Support keyboard navigation, focus restoration, desktop/mobile layouts, and
   the application's semantic color tokens.
10. Lazy-load the chosen serializer. Generate files locally without uploading
    crop data or storing generated files on the server.

## Assumptions

- Version one downloads one crop from the Spreadsheet tab. Multi-crop exports,
  Analytics charts, and export buttons in other tabs are out of scope.
- Saved-only export is the intended behavior. Drafts block export even in View
  mode; opening the dialog does not save, discard, or change records.
- All configured areas are included; users select periods, not areas or fields.
- Calculations use the current saved configuration, as the application does.
  Historical formula versions cannot be reconstructed from existing records.
- Excel contains computed numeric values, not executable Excel formulas. Custom
  formula syntax does not have a reliable one-to-one Excel translation.
- Keep the existing `en-IN`/INR presentation convention. Do not add currency or
  locale settings as part of this feature.
- PDF version one follows the existing built-in-font approach: English/basic
  Latin text and an explicit common-punctuation conversion described below.
  Other scripts remain intact in Excel and HTML. PDF rejects unsupported text
  with an actionable alternative instead of emitting broken glyphs. Full PDF
  multilingual typography is a separate feature.
- A conservative maximum of 100,000 matrix cells per export bounds synchronous
  browser work. This is a proposed product limit, not a measured browser limit;
  show a request to select fewer periods and never truncate. Test the boundary.
- Filename dates use the user's local calendar date; report metadata also records
  the exact export timestamp and timezone. Tests inject a fixed timestamp.

## Proposed Design

### UI and interaction

```text
Coffee Records · 6 periods       [View | Edit] [↓ Download ▾]
                                                Download as Excel
                                                Download as PDF
                                                Download as HTML

┌ Download Coffee as Excel ───────────────────────────┐
│ Periods                                            │
│ (●) All periods  (6)   ( ) Select periods            │
│                                                    │
│ [✓] Include notes                                  │
│ Coffee · 6 periods · 4 areas                        │
│ Saved records only                                 │
│                              [Cancel] [Download Excel] │
└────────────────────────────────────────────────────┘
```

Create `CropDownloadMenu.tsx` and `CropDownloadDialog.tsx` under the module's
`components/` directory. `SpreadsheetTab` owns the selected format and dialog
open state. Dialog state is reset on each open and when the active crop changes.

- Menu button uses `Download` and `ChevronDown` Lucide icons. Menu items use
  `FileSpreadsheet`, `FileText`, and `Code` with explicit text labels.
- Use a portal to `document.body` for both menu and dialog. The card clips
  overflow and its ancestor is animated with transforms.
- Position the menu with fixed coordinates from the trigger rectangle; clamp
  it to the viewport and flip upward when space below is insufficient. Recompute
  on resize and captured scroll events. Remove listeners on close.
- Implement `aria-haspopup="menu"`, `aria-expanded`, a named menu, menuitems,
  ArrowUp/ArrowDown, Home/End, Enter/Space, Escape, and outside-click dismissal.
  Tab closes the menu without trapping focus. Escape restores trigger focus.
- When an item opens the dialog, close the menu and focus the persistent Download
  trigger before mounting `Dialog`; this gives its existing restore behavior a
  connected target. Initial dialog focus goes to the All periods radio.
- Selecting Select periods reveals a labelled, scrollable checkbox list in
  displayed period order. It initially checks all periods. Include Select all
  and Clear controls; zero selection disables download and shows guidance.
- The footer action is named Download Excel/PDF/HTML, changing to Preparing…
  with an `aria-live` status during generation. Disable configuration controls
  and prevent duplicate requests while preparing. Cancel/Escape may still close
  the dialog; invalidate the request so a late completion cannot download.
- On success, trigger the download, close the dialog, and use the existing toast
  with “Download started.” Do not claim the browser finished saving the file.
- On failure, retain options and show a `role="alert"` message and Try again.
  Do not expose payloads, record IDs, stack traces, or raw library errors.
- Use the existing `Button`, `Dialog`, and `cn()` patterns. Use semantic colors.
  Toolbar actions wrap below the title on narrow screens. Modal body scrolls
  within `max-height: calc(100dvh - 2rem)` and keeps its footer reachable.

### Record readiness, dirty state, and save safety

In `AdminView`, consolidate initial and refresh loading through one validated
request path. Maintain `recordsStatus: "loading" | "ready" | "error"` and
`recordsError`. Require an OK response and an array `data` shape, use an abort
signal/request sequence to ignore stale completions, and keep existing records
on refresh failure while disabling export. Provide a Retry action. Render
`AdminModuleSkeleton` on the initial record/settings load; a refresh must not
unmount the editor or discard its drafts.

Destructure `error` from `useModuleSettings` and block export on settings failure
as well as `settingsSaving`. The hook updates optimistically and does not roll
back failures, so “not saving” alone is insufficient. Show a clear save/reload
message when configuration is not trustworthy. Add literal skeleton options to
the four dynamic tab imports in this file while touching their loading behavior.

Pass `exportBlockedReason: string | null` to `SpreadsheetTab`; it represents
record/settings readiness. Local mutation/dirty state adds its own reason.
Evaluate guards again at generation time, not just at menu-open time.
Change its `onRefresh` contract from `() => void` to
`() => Promise<CropExportRecord[]>`, where `CropExportRecord` is the record
projection defined below. Resolve with the validated refreshed records or reject
after setting the parent error state. Action handlers await and catch this result;
initial loading also catches rejection. Update component test mocks accordingly.

Add pure helpers in `lib/export-data.ts` for comparing a saved record with a
draft period. Compare numeric maps using sorted union keys and API-style numeric
string coercion. A missing/undefined value normalizes to `null`; a present empty
string normalizes to zero, matching API coercion. Keep missing and explicit zero
distinct because they export differently. Treat non-finite/invalid draft values
as dirty and invalid, never as clean zero. Compare notes after trimming, matching
API normalization. Include unknown stored numeric keys in
comparison so hidden data is not accidentally treated as clean. Compare only
periods belonging to the selected crop; ignore database IDs/timestamps as values.
Any added unsaved period is dirty even if all its inputs are empty. Reverting an
edit to its saved value clears dirty state. Reordering alone is handled through
the settings save state rather than this content comparison.

Make the following narrowly scoped save changes in `SpreadsheetTab`:

1. Separate persistence from action state. A `persistPeriod(period, draft)` helper
   returns `{ id: string, period: string }` or throws; it never toggles action
   state, shows toasts, or refreshes independently. POST validates the returned
   `data._id` and document payload. PUT validates `data.success === true` and
   retains the existing ID. Do not expect PUT to return a document or change the
   API response contract. The awaited refresh supplies canonical saved payloads.
2. Individual-save and Save All handlers own one busy interval. Capture immutable
   draft snapshots at the start. Disable all source/summary/note editing, crop
   switching, period addition/reordering/deletion, and additional save actions
   during the mutation. Keep the same lock active through the awaited refresh.
3. Save All persists each captured period sequentially, records failures, and
   refreshes once after the loop. Show accurate complete/partial failure feedback.
   Keep failed and untouched dirty periods local after refresh. Do not let a
   success for one period clear another period's dirty state.
4. Replace unconditional `setLocalData(newData)` on records updates with a merge
   against the previous saved baseline. Replace clean periods and acknowledged
   successful saves with refreshed saved data; preserve other dirty/new periods.
   Update the baseline from refreshed records. On active-crop changes reset to
   that crop's records, preserving the current crop-switching behavior.
5. A refresh failure leaves export blocked. Retain acknowledged POST IDs from
   save responses in the local draft so retry cannot create duplicate records.
   Failed/ambiguous POST responses require reload/reconciliation before retry;
   do not automatically retry POST because the server may already have saved it.
6. Hold the mutation lock during deletion and its refresh too. Remove local data
   only on confirmed persisted deletion or deletion of a never-saved local period.

For any dirty period, show “Save your changes before downloading.” No automatic
save-and-download action is added.

### Shared report model

Define the export types and pure builder in `lib/export-data.ts`. Use type-only
imports for `CropConfig` and `AreaDef` from `AdminView`; use
`Pick<CropRecord, "_id" | "payload">` for records so existing tests and the
spreadsheet contract do not acquire a required `created_at` field.

```ts
type CropExportFormat = "xlsx" | "pdf" | "html";
type CropExportRecord = Pick<CropRecord, "_id" | "payload">;

interface CropExportOptions {
  periods: string[];
  includeNotes: boolean;
}

interface CropExportRow {
  section: "area" | "total" | "summary" | "calculated" | "notes";
  group: string;
  label: string;
  unit: string;
  format: "number" | "currency" | "percentage" | "text";
  values: Array<number | string | null>;
}

interface CropExportReport {
  cropId: string;
  cropName: string;
  generatedAt: string;
  localDate: string;
  timeZone: string;
  areaCount: number;
  periods: string[];
  rows: CropExportRow[];
}

function buildCropExportReport(input: {
  crop: CropConfig;
  areas: AreaDef[];
  records: CropExportRecord[];
  orderedPeriods: string[];
  options: CropExportOptions;
  now: Date;
  timeZone: string;
}): CropExportReport;
```

Builder rules:

- Filter defensively to `crop.id`. Index periods once, rejecting duplicate records
  for the same crop/period instead of silently choosing a conflicting record.
- Deduplicate requested periods, require each to exist in the saved set, and
  filter `orderedPeriods` by this selection. Require every saved period to have
  an ordering entry; an inconsistent snapshot triggers a reload error.
- Rows are ordered as configured area × source field, then source totals if
  `areas.length > 1`, then summary fields, calculated fields, and optional notes.
  Flatten each metric to a separate row with Group, Metric, and Unit columns.
- A missing source or summary input is `null`; an explicitly stored zero is `0`.
  Formula inputs still coerce missing values to zero. Preserve numeric precision
  in the model; formatting belongs to serializers.
- Source totals sum only configured areas. Build formula context exactly as the
  spreadsheet does, including configured fields, summary overrides, constants,
  and sequential calculated fields; call `evaluateAllCalculatedFields` once per
  period. Do not create a second evaluator or change `FormulaEngine.ts`.
- Current configured fields/areas define visibility. Ignore removed fields/areas
  in the report, as the spreadsheet does. Keep notes even with no numeric fields.
- Reject non-finite inputs/constants/totals, malformed numeric values, invalid
  timestamps, duplicate configuration IDs, and inconsistent row lengths with
  actionable errors. Zero returned by the existing formula engine is not a new
  export validation error.
- Reject empty selection, no report rows, and more than 100,000 body cells
  (`rows.length * (3 + periods.length)`). The dialog should show the size error
  and allow a smaller selection. Do not silently discard excess data.
- Raw percentages and currency stay numeric. Do not infer currency from a unit
  string: summary inputs with `₹/50kg bag` remain numbers with that unit label.
- Build a fresh report on click and give the same immutable report to exactly one
  serializer. Do not reread mutable component state halfway through generation.

### Excel

Use the browser document-workbook API from ExcelJS, added as a production
dependency with `pnpm add exceljs@4.4.0` during implementation. Load it only from
`export-xlsx.ts`, itself imported after the user requests Excel. Verify the
production browser bundle before release; do not add filesystem APIs or a global
Node polyfill. ExcelJS documents browser support, typed cells, worksheet views,
and in-memory XLSX writing in its [official README](https://github.com/exceljs/exceljs#readme).

`renderCropExportXlsx(report): Promise<Blob>` creates one worksheet named
`Crop History` (a stable legal name regardless of crop punctuation). Put title
in row 1, generated timestamp/timezone in row 2, dimensions in row 3, a blank
row 4, and headers `Group | Metric | Unit | <periods…>` in row 5. Data begins at
row 6. Freeze the first three columns and first five rows.

Use numeric cells for numbers and literal string cells for all labels and notes;
never create formula or hyperlink cell objects from user text. Retain full
numeric precision and use display formats: numbers `#,##0.#`, currency
`"INR "#,##0`, percentage `0.#"%"` (literal percent, so 25 stays 25%). Native
Excel grouping may differ from `en-IN`; values must remain numeric. Empty inputs
are blank, not zero. Wrap labels/notes, emphasize section boundaries, and set
practical widths (Group 22, Metric 28, Unit 18, periods 20). Add no chart,
autofilter across mixed sections, or grand totals over percentages/prices.

Return MIME
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Copy the
writer buffer to an owned `Uint8Array`/`ArrayBuffer` before creating the Blob to
avoid browser/Node Buffer type mismatches.

### PDF

`renderCropExportPdf(report): Promise<Blob>` uses the existing jsPDF and
AutoTable packages via dynamic imports. Render a real text/table PDF, not a
screenshot and not a print-dialog shortcut.

- A4 landscape, millimetres, 12mm margins, 9pt table text, high-contrast neutral
  styling. Repeat title/short metadata above every page and reserve footer space.
- Use the same Group, Metric, Unit, and period columns. Fixed widths of 30, 40,
  24, and 34mm respectively prevent columns shrinking to unreadable sizes.
- Enable `horizontalPageBreak`, repeat columns `[0, 1, 2]`, repeat headings on
  every page, and allow vertical pagination. AutoTable documents these controls
  in its [official options reference](https://github.com/simonbengtsson/jsPDF-AutoTable#options).
- Wrap labels and notes rather than ellipsizing them. Allow an unusually tall
  row to continue across pages. Put the full crop title in a wrapping first-page
  heading; continuation headings use a bounded prefix plus page numbering so
  long titles cannot collide with the table. Full title remains on page one.
- Add Page X of Y in a final pass after pagination. Use report creation metadata,
  not a separately sampled timestamp.
- Match spreadsheet numeric precision: at most one fractional digit for number
  and percentage displays and zero fractional digits for INR calculated values.
  Include units in the Unit column, not repeated in every value.
- Use `INR` for currency and replace `₹` in unit labels with `INR`. Convert curly
  quotes to straight quotes, en/em dashes to `-`, nonbreaking spaces to ordinary
  spaces, and ellipses to `...`. Permit printable ASCII plus line breaks/tabs
  after conversion. Validate all exported text before allocating PDF pages.
- If other characters remain, fail with “This PDF format cannot render some
  characters in these records. Download as Excel or HTML to preserve the text.”
  Do not replace them with `?` or remove notes silently. This deliberate first
  version limit avoids the built-in font's glyph corruption; custom fonts are
  required for wider coverage according to [jsPDF's font documentation](https://github.com/parallax/jsPDF#use-of-unicode-characters--utf-8).
- Return MIME `application/pdf` using `doc.output("arraybuffer")`.

### HTML

`renderCropExportHtml(report): Blob` writes a complete document with doctype,
UTF-8 charset, viewport metadata, a descriptive title, inline CSS, and a semantic
table with caption, column headers, and row labels. Use the same row order and
numeric formatting as PDF, retaining Unicode text and `₹` where appropriate.

Escape `&`, `<`, `>`, double quotes, and apostrophes in every dynamic string,
including title, periods, area/field labels, units, and notes. Use notes as text
with `white-space: pre-wrap`; never insert raw HTML. No scripts, remote styles,
images, fonts, external links, or hidden serialized record/config payloads.
Set a restrictive metadata CSP (`default-src 'none'; style-src 'unsafe-inline';
base-uri 'none'; form-action 'none'`).

Embed a light neutral report palette through document-local CSS variables.
Use a horizontal scroller on screens and a separate print layout: print sections
repeat the three descriptor columns with at most four period columns per table.
This avoids relying on browsers to horizontally paginate a wide HTML table.
Show only the screen matrix on screen and only print sections when printing;
both are built from the same report. Wrap long notes and headers. Use
`@page { size: A4 landscape; margin: 12mm; }` and repeated table header groups.
Return `text/html;charset=utf-8`.

### Download dispatch and lifecycle

Add `createCropExportFile(report, format): Promise<{ blob: Blob; filename: string }>`
in `lib/export-download.ts`. It imports only the selected serializer; no eager
barrel import of all serializers. Use
`crop-history-<crop-slug>-<local-YYYY-MM-DD>.<extension>`. Normalize the crop name,
strip path separators/control characters, retain only ASCII letters/digits and
hyphens for the slug, cap it at 60 characters, and fall back to `crop` when empty.
Do not use the crop name as a file path or HTML identifier.

After success, create an object URL and click an attached temporary anchor with
`download`. Remove the anchor immediately and revoke its URL after a 30-second
grace period (not synchronously before the browser consumes it). Test cleanup
with fake timers. Exported files are not cached in localStorage or uploaded.

Maintain a generation token in the dialog. Invalidate it on cancel, unmount,
crop change, or a report-input/settings/readiness change; only the current token
may initiate a download or update UI. Renderers never trigger downloads themselves.
Closing does not forcibly terminate synchronous library work; it suppresses its
side effects. Ordinary validation errors are displayed; unexpected exceptions
may log an error category and format, never crop records or notes.

## Files To Change

| File                                                             | Action     | Detailed Change                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/crop-history/AdminView.tsx`                         | Modify     | Unify validated record loading, track readiness/errors, expose retry and export block reason, account for settings errors, add tab skeleton options.            |
| `src/modules/crop-history/SpreadsheetTab.tsx`                    | Modify     | Add menu/dialog integration, dirty guard, stable batch mutation lock, save acknowledgements and draft-preserving refresh merge. Preserve table layout/formulas. |
| `src/modules/crop-history/components/CropDownloadMenu.tsx`       | Add        | Portaled, positioned, keyboard-accessible format menu with stable trigger focus.                                                                                |
| `src/modules/crop-history/components/CropDownloadDialog.tsx`     | Add        | Period selection, notes option, readiness guards, generation/error state, cancellation token, download action.                                                  |
| `src/modules/crop-history/lib/export-data.ts`                    | Add        | Export types, report builder, dirty comparison/merge helpers, display formatting and filename-safe date metadata helpers.                                       |
| `src/modules/crop-history/lib/export-xlsx.ts`                    | Add        | ExcelJS workbook serializer returning a Blob.                                                                                                                   |
| `src/modules/crop-history/lib/export-pdf.ts`                     | Add        | PDF serializer, text validation/conversion, readable pagination and footers.                                                                                    |
| `src/modules/crop-history/lib/export-html.ts`                    | Add        | Escaped standalone screen/print HTML serializer.                                                                                                                |
| `src/modules/crop-history/lib/export-download.ts`                | Add        | Format dispatcher, filename construction, object URL/anchor lifecycle.                                                                                          |
| `src/modules/crop-history/__tests__/AdminView.test.tsx`          | Modify     | Loading/error/retry/settings guards and stale request protection.                                                                                               |
| `src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx`     | Modify     | Dirty state, save/batch failures, refresh preservation, export wiring; retain existing layout assertions.                                                       |
| `src/modules/crop-history/__tests__/CropDownloadMenu.test.tsx`   | Add        | Menu keyboard, dismissal, positioning, and focus handoff.                                                                                                       |
| `src/modules/crop-history/__tests__/CropDownloadDialog.test.tsx` | Add        | Selection defaults/filtering, empty selection, errors/retry, double-click guard, cancellation and crop changes.                                                 |
| `src/modules/crop-history/__tests__/export-data.test.ts`         | Add        | Report correctness, formula parity, ordering, numeric/dirty semantics, validation boundaries.                                                                   |
| `src/modules/crop-history/__tests__/export-xlsx.test.ts`         | Add        | Read generated workbook back and verify types, values, columns, formats, notes and frozen panes.                                                                |
| `src/modules/crop-history/__tests__/export-pdf.test.ts`          | Add        | Real PDF generation plus table options, pagination fixtures, text normalization/rejection.                                                                      |
| `src/modules/crop-history/__tests__/export-html.test.ts`         | Add        | Parse generated HTML; verify escaped content, offline document, notes toggle and print sections.                                                                |
| `src/modules/crop-history/__tests__/export-download.test.ts`     | Add        | Dispatch, extensions/MIME, safe filename, one download, delayed URL cleanup.                                                                                    |
| `src/modules/crop-history/README.md`                             | Modify     | Describe formats, scope, saved-only rule, percentage/value behavior, size and PDF character limits.                                                             |
| `src/modules/crop-history/DocsTab.tsx`                           | Modify     | Add Downloading records section with periods, notes, save-first guidance, format differences and PDF limitation.                                                |
| `package.json`                                                   | Modify     | Add pinned ExcelJS production dependency only.                                                                                                                  |
| `pnpm-lock.yaml`                                                 | Modify     | Update through pnpm for the selected dependency.                                                                                                                |
| `docs/design-plans/2026-10-16-crop-history-downloads.md`         | Add/update | This design and subsequent implementation validation notes.                                                                                                     |

No files are deleted. No change is planned to `FormulaEngine.ts`, shared Dialog,
analytics, widgets, public routes, API handlers, authentication, or schemas.

## Implementation Phases

### Phase 1: Establish correct snapshots and export data

1. Add `export-data.ts` types and meaningful unit fixtures with two areas, custom
   period order, numeric zero/missing values, constants, weighted averages,
   dependent calculated fields, INR output, 25% output, and notes.
2. Implement the report builder and dirty comparison/refresh merge helpers.
   Verify these against the existing engine and screen semantics without changing
   the evaluator. Include frozen-input tests to catch accidental mutation.
3. Add failure cases for duplicate periods, wrong-crop records, invalid numeric
   data, no periods, removed fields, and the proposed cell limit.

### Phase 2: Make readiness and saved-only state reliable

1. Update `AdminView` loading and error flow, settings guards, and skeletons.
2. Update `SpreadsheetTab` baseline comparison and the focused save/refresh flow
   exactly as specified above. Keep unrelated crop-switch/discard UX unchanged.
3. Add tests for reverted edits, notes whitespace, new blank periods, failed saves,
   one-period save while another remains dirty, partial Save All, refresh failure,
   retained POST IDs, and uninterrupted busy state. Verify no draft loss.

### Phase 3: Implement serializers and dispatch

1. Add ExcelJS and lockfile changes. Implement `export-xlsx.ts` and verify actual
   workbook round-trip values and cell types before UI integration.
2. Implement `export-html.ts` with injection fixtures and print-section tests.
3. Implement `export-pdf.ts` using existing libraries, including character
   preflight, long labels/notes, wide-table and multi-page fixtures.
4. Implement `export-download.ts`. Test MIME/extension pairs and resource cleanup.
   Verify dependencies are imported only on the relevant export action.

### Phase 4: Connect the accessible download flow

1. Add and test `CropDownloadMenu` and `CropDownloadDialog` using shared primitives.
2. Wire the toolbar to current saved records, ordered periods, and readiness/dirty
   reasons. Apply generation invalidation and focus behavior.
3. Preserve all existing spreadsheet layout contracts. Test keyboard operation,
   errors/retry, cancellation, selecting periods and excluding notes.
4. Update the module README and Docs tab with the actual behavior and limitations.

### Phase 5: Verify outputs, layout, and release readiness

1. Run the focused module tests and changed-file formatting, then `pnpm check`.
2. Start `pnpm dev` if needed and verify `/admin/crop-history` with Playwright
   MCP as required by `AGENTS.md`. Use existing credentials without printing them.
3. Capture desktop (1440px) and mobile (375px) screenshots in light and dark
   themes: toolbar, menu, dialog, generation state, dirty warning, and error.
4. Verify menu/dialog are not clipped and focus returns correctly. Check initial
   loading, crop switches, Save All, and the existing dashboard for regressions.
5. Download all three formats from the same fixture and compare selected periods,
   notes, units, totals and calculated values. Open the XLSX in a compatible viewer,
   render PDF pages, and open HTML offline with network disabled. Check PDF page
   two and the final page, not only the first page. Inspect HTML print preview.
6. Repeat with 12 periods, 20 areas, several metrics, a 2,000-character note, long
   labels and negative/fractional values. Verify no clipping or missing periods.
   Test unsupported PDF text and confirm Excel/HTML preserve it.
7. Verify the production build and a download using the built app, to catch
   browser bundling incompatibilities that jsdom tests cannot reveal. Stop only
   servers started for this work and record any unavailable verification clearly.

## Testing Plan

| Test                       | File or Command                                                                                                                  | Purpose                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared report model        | `src/modules/crop-history/__tests__/export-data.test.ts`                                                                         | Compare expected values/order, formula parity, percent semantics, blanks versus zeros, no mutation, validation and dirty merge.                                     |
| Workbook round trip        | `src/modules/crop-history/__tests__/export-xlsx.test.ts`                                                                         | Load generated bytes through ExcelJS and inspect numeric types, 25 shown as 25%, notes strings beginning `=`, absence of formula/hyperlink cells, and frozen panes. |
| HTML structure/security    | `src/modules/crop-history/__tests__/export-html.test.ts`                                                                         | DOMParser preserves Unicode/multiline notes, renders attack strings as text, contains no scripts or remote assets, and covers every period in print sections.       |
| PDF behavior               | `src/modules/crop-history/__tests__/export-pdf.test.ts`                                                                          | Validate text conversion, unsupported-character failure, repeated columns/headers and a real `%PDF-` artifact. Mocks alone do not prove rendering.                  |
| Menu/dialog behavior       | `src/modules/crop-history/__tests__/CropDownloadMenu.test.tsx`, `src/modules/crop-history/__tests__/CropDownloadDialog.test.tsx` | Keyboard/focus, options, blocked states, retries, ignored stale results and one download per action.                                                                |
| Parent/editor integration  | `src/modules/crop-history/__tests__/AdminView.test.tsx`, `src/modules/crop-history/__tests__/SpreadsheetTab.test.tsx`            | Record/settings failure, unsaved edits, partial saves, preserved drafts and no stale download. Reset settings cache between tests.                                  |
| Browser download lifecycle | `src/modules/crop-history/__tests__/export-download.test.ts`                                                                     | Safe filenames, file types, temporary anchor removal and delayed URL revocation.                                                                                    |
| Focused suite              | `pnpm test src/modules/crop-history`                                                                                             | All crop-history regression tests, including existing formula/insights/widget contracts.                                                                            |
| Formatting                 | `pnpm exec prettier --write <explicit changed files>`                                                                            | Format in-scope changes without rewriting unrelated baseline files.                                                                                                 |
| Repository gate            | `pnpm check`                                                                                                                     | Lint, types, production build and full Vitest suite.                                                                                                                |
| Visual and artifact QA     | Playwright MCP at `http://localhost:3091/admin/crop-history`, plus downloaded-file viewers                                       | Responsive behavior, portal placement, real download actions, PDF/XLSX/HTML readability and value parity.                                                           |

Use intercepted API responses or isolated test records for visual fixtures; do
not alter real crop history to manufacture test cases. Keep secrets and downloaded
private records out of committed test artifacts. Unit fixtures must be synthetic.

## Edge Cases

- **No crops/no saved periods:** Keep the existing empty state; Download is absent
  without a crop and disabled with an explanation when a crop has no saved data.
- **No areas but valid summary fields:** Export summary/calculated fields and
  notes. No fake area or total rows.
- **Notes only:** Valid if Include notes is enabled; otherwise show no fields to
  export. Missing notes are blank, not the string `undefined`.
- **Missing input versus zero:** Blank raw input cells, numeric zero for explicit
  zeros, and existing zero-coercion for formulas. State this intentional
  presentation difference from the screen's dash convention in the README.
- **Division by zero/invalid formula:** Preserve the evaluator's zero fallback;
  do not invent new NaN cells or different formula semantics per format.
- **Custom periods:** Treat as opaque strings. Selection uses checkboxes rather
  than date inputs, and filenames never use raw period labels.
- **Duplicate records or stale period selection:** Block with reload guidance;
  no silent first/last record choice or partial export.
- **Save failure or pending reorder:** Block until saved/reloaded configuration
  and records are trustworthy. Failed drafts remain visible.
- **Unicode names/notes:** Excel/HTML preserve text. PDF validates its explicitly
  limited text repertoire and gives the alternative-format message.
- **Malicious text:** HTML escapes it; Excel stores it as literal strings; PDF
  draws text only. Formula-like notes are never executable spreadsheet formulas.
- **Very large export:** Ask for fewer periods at the cell limit; never cut rows.
- **Close/navigate during generation:** Ignore late results, issue no download,
  and release URLs if any were allocated. React state updates must not run after
  unmount.
- **Another administrator edits data remotely:** Export the last successfully
  loaded snapshot, labelled with generation time. No live cross-session locking
  or guaranteed server-at-click snapshot is introduced.

## Risks And Mitigations

- **Save-flow regression:** The export guard depends on trustworthy drafts and
  busy state. Keep changes local, cover partial failure/refresh races, and retain
  existing table regression tests.
- **Large client dependency:** ExcelJS increases the Excel download chunk. Load
  on demand, verify the actual browser build, and avoid loading it for PDF/HTML.
- **PDF font limitations:** Explicit ASCII/common-punctuation preflight prevents
  corrupt output. Excel/HTML retain full text; broader PDF font support requires
  a deliberate later design with script coverage and shaping tests.
- **Wide/long reports:** Fixed PDF widths with pagination and separate HTML print
  sections preserve legibility. Visual inspection of every generated page in a
  representative multi-page report is a release requirement.
- **Historical recalculation:** Config is not versioned. Explain that exports
  reflect current formulas and do not claim audit-grade historical formulas.
- **Browser resource pressure:** Cell count guard and lazy serializers bound
  ordinary work. Do not add a worker/job system without measured need.
- **Existing repository failures:** Record exact commands/errors separately from
  this feature's tests; do not broaden into unrelated repairs to obtain green CI.

## Rollout And Rollback

Ship through the normal application deployment after unit, production-build,
visual, and artifact verification. No feature flag, DB migration, new secret,
permission grant, or API rollout is required. The download flow only reads data;
normal explicit save/delete actions retain their existing APIs.

Rollback removes the new toolbar/menu/dialog and export helpers, reverts the
feature's local loading/save changes as a coherent unit, and removes ExcelJS
through pnpm with the corresponding lockfile update. Do not revert unrelated
changes. Existing records remain compatible and previously downloaded files
remain valid. No stored data needs reversal.

## Non-Goals

- Multi-crop workbooks, chart exports, dashboard buttons, scheduled reports,
  email/share integrations, or server-side file persistence.
- Exporting unsaved drafts, automatic saving, changing crop-switch discard UX,
  or implementing concurrent editing/version conflicts.
- Recalculating Excel formulas, historical configuration versioning, restoring
  reports into the app, or exporting removed/hidden fields as a backup.
- Replacing the formula engine, adding text-field persistence, altering
  analytics, or redesigning the spreadsheet/table.
- Full multilingual PDF typography, arbitrary theme replication in downloaded
  documents, or new global reporting infrastructure.

## Implementer Handoff Checklist

- [x] Requirements and conservative assumptions are explicit.
- [x] Every planned file and responsibility is named.
- [x] UI, function contracts, data flow, and failure behavior are specified.
- [x] Save/loading prerequisites precede export UI integration.
- [x] Numeric, percentage, currency, escaping and PDF character rules are defined.
- [x] Phases are ordered, with concrete tests and verification commands.
- [x] Accessibility, mobile, privacy, performance and backward compatibility are covered.
- [x] Rollout, rollback, risks, edge cases and non-goals are recorded.
- [x] This planning change contains no application implementation or dependency installation.
