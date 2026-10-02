# Expense Space PDF Report Design

## Goal

Let an administrator create a polished, downloadable PDF report for one selected Expense Space. The report always contains the complete ledger for that space, regardless of the active UI tab, list filters, or pagination state.

After report generation, the UI presents Download and Share actions without persisting a report or modifying Expense Space data.

## Scope

### Included

- A Download action beside Add Expense in the Expense Space ledger toolbar.
- An accessible report-generation modal with idle, generating, ready, and error states.
- An authenticated endpoint that loads the selected Expense Space and all of its entries, then returns a PDF response.
- A multi-page A4 PDF with:
  - Report title, space identity, currency, date range, and generated timestamp.
  - Key metrics: lifetime spend, expense count, average expense, and budget status where applicable.
  - Full itemized ledger first, sorted newest-first and continued over as many pages as needed.
  - Category and subcategory breakdowns on later pages.
  - Top payees, payment method totals, and monthly spend summary after the breakdowns.
  - Repeating footer with page number and report generation date.
- Download through a temporary browser object URL and native file sharing where `navigator.share` and `navigator.canShare` support a PDF file.

### Excluded

- Saving reports to MongoDB, attaching them to the Docs tab, or scheduling reports.
- Cross-space reports and currency conversion.
- Changing existing expense entry creation, editing, filtering, pagination, or analytics behavior.
- Custom report date ranges. The report intentionally covers all entries in the selected space.

## Architecture

### Server route

Add `GET /api/expense-spaces/[spaceId]/report`.

The route uses the existing Expense Spaces admin guard and Mongo connection pattern. It loads the parent `expense_space` document by `_id`, queries every matching `expense_space_entry` document by `space_key`, and sorts entries by date descending with stable secondary ordering. It must return 401 for an unauthenticated request and 404 when the parent space does not exist.

The route derives category and subcategory names from the selected parent taxonomy. Deleted or historic taxonomy references render as `Unknown category` / `Unknown subcategory`, matching the existing analytics resilience approach. It builds the report’s aggregate data from this complete server-side set so browser list filters and pages have no influence.

`jspdf` and `jspdf-autotable`, already present in the project dependencies, generate the PDF in the route’s Node runtime. The response uses `application/pdf` and an RFC-compatible attachment filename derived from a safely sanitized space name and current date. The route never writes to the database.

### Report generator

Create a server-only report generator under `src/lib/expense-spaces/`. It accepts a narrow report-data model rather than Mongo documents directly. Its responsibilities are limited to:

- Building the document hierarchy, spacing, typography, and semantic neutral/accent palette.
- Formatting monetary figures with the selected space currency and configured Indian/Western number format.
- Drawing header, metrics, tables, category shares, and footer consistently across pages.
- Adding new pages safely before an element would overflow.

The route remains responsible for authorization, data loading, data normalization, and HTTP response construction. This separation makes the generator unit-testable without MongoDB or Next request mocks.

### Client interaction

Add a focused `ExpenseSpaceReportDialog` client component, rendered by the existing Expense Space workspace/ledger composition. The Download toolbar action opens the dialog; it does not generate a report immediately.

The dialog uses the project’s shared `Dialog` accessibility shell. The primary Create PDF button receives initial focus, becomes disabled while generating, and provides visible in-context progress. On success, the client holds the returned `Blob` and a temporary object URL for the modal lifetime. It offers:

- Download PDF: an anchor download using the generated filename.
- Share: creates a `File` from the PDF and invokes native sharing only when both `navigator.share` and `navigator.canShare({ files: [file] })` are available. Unsupported environments show a clear disabled state that directs users to Download.

Object URLs are revoked after a new report replaces the old one and when the dialog closes or unmounts. Errors leave the modal open and offer a retry action without losing context.

## PDF Layout

The document uses A4 portrait pages with a quiet, editorial financial-report visual system: a small accent rule, strong hierarchy, neutral table backgrounds, tabular figures, generous page margins, and no color-only meaning.

1. Page one begins with the space name, currency, generation timestamp, covered date range, and a compact metrics strip. It then starts the complete ledger table.
2. The ledger always precedes analysis. Its columns are Date, Description, Paid to, Category, Subcategory, Payment method, and Amount. Long text wraps; amounts align right; rows repeat their header on later ledger pages.
3. After the final ledger page, category and subcategory tables show total, transaction count, and share of spend.
4. Later pages contain the top payees, payment method totals, and monthly spend table. A report with no entries still renders a complete cover/summary page and a clear empty-ledger note.
5. Every page has a footer showing the generated date and `Page n of n`.

## Error Handling and Limits

- Authentication and missing-space errors use existing API response conventions.
- Invalid IDs must not query data and return the normal not-found/validation response.
- The generator must tolerate an empty ledger, missing optional payment methods, optional budget, and taxonomy references that no longer exist.
- Generation errors are logged through the Expense Spaces route logging convention and become a user-friendly modal error.
- The initial implementation produces the report synchronously. If practical profiling later shows very large ledgers exceed request or memory budgets, report jobs are a separate future feature; the UI/API contract is designed so that addition remains possible.

## Testing and Verification

- Route tests: authentication, missing space, correct content type/disposition, all selected-space entries included despite pagination-scale volume, and no entries from another space.
- Generator tests: stable ledger ordering, metrics and breakdown data inclusion, empty ledger, missing taxonomy fallback, and Indian/Western monetary formatting.
- Component tests: modal opens from Download, generation loading state, error/retry state, Download availability after success, share support/unsupported behavior, and focus restoration after close.
- Visual QA: generate a representative multi-page PDF fixture, render every page to PNG with Poppler, and inspect header/footer continuity, wrapped columns, page breaks, table alignment, and empty-state layout.
- UI QA: verify desktop and mobile placement beside Add Expense, keyboard use, and no horizontal overflow.

## Rollout

The capability is additive and has no data migration or configuration. It is protected by the existing Expense Spaces admin authorization boundary, and it does not alter any existing API payload or stored records.
