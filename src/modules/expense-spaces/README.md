# Expense Spaces

Expense Spaces is a private LifeOS module for independent project and
life-event ledgers. A renovation, pet, trip, or estate can keep its own
currency, budget, category tree, entries, and analytics without changing the
existing day-to-day Expenses module.

## Registration and storage

- Admin route: `/admin/expense-spaces`
- Registry slug: `expense-spaces`
- Parent discriminator: `expense_space`
- Entry discriminator: `expense_space_entry`
- Visibility: always private (`is_public: false`)
- Storage: the shared MongoDB `content` collection

Each parent receives an immutable UUID `payload.space_key`. Entries refer to
that key rather than the parent's MongoDB `_id`, so an export/import may replace
MongoDB IDs without breaking the relationship. Category and subcategory IDs
are UUIDs for the same reason.

The content collection includes this child-ledger index:

```js
{ module_type: 1, "payload.space_key": 1, "payload.date": -1 }
```

## Parent contract

An expense space owns:

- a unique normalized name and optional description;
- a three-letter currency and Western or Indian number format;
- an optional total or monthly budget;
- active or archived status;
- stable categories with nested stable subcategories.

New spaces start with an active `Other` category. Currency becomes immutable
after the first entry because changing it would relabel historical amounts
without an exchange rate. Space updates use `updated_at` as an optimistic
concurrency token; stale writes return `409`.

Used taxonomy values may be renamed or archived, but not removed. Unused values
may be removed. Historical entries and analytics continue to resolve archived
values by ID.

## Entry contract

Every entry requires a positive amount, strict `YYYY-MM-DD` calendar date,
description, paid-to value, and active category. Subcategory is optional but,
when supplied, must belong to the selected category. Payment method, reference,
notes, tags, and receipt URL are optional.

The server derives `space_key` and the immutable currency snapshot from the
parent. It verifies parent ownership on every entry read, update, and delete.
Archived spaces remain readable but reject entry mutations until restored.

## API routes

All routes require an authenticated administrator. Middleware protects the
entire `/api/expense-spaces` family and route handlers repeat the authorization
check for defense in depth.

| Route                                             | Methods                | Purpose                                                       |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| `/api/expense-spaces`                             | `GET`, `POST`          | Filtered compact list and space creation                      |
| `/api/expense-spaces/[spaceId]`                   | `GET`, `PUT`, `DELETE` | Detail, concurrency-safe settings, confirmed cascade deletion |
| `/api/expense-spaces/[spaceId]/entries`           | `GET`, `POST`          | Filtered/paginated ledger and entry creation                  |
| `/api/expense-spaces/[spaceId]/entries/[entryId]` | `PUT`, `DELETE`        | Ownership-scoped entry mutation                               |
| `/api/expense-spaces/analytics`                   | `GET`                  | Narrow, server-side analytics projection                      |

Generic `/api/content` creation and mutation rejects both discriminators. This
prevents callers from bypassing ownership, taxonomy, archive, currency,
concurrency, and cascade rules.

Ledger query parameters include search, inclusive date bounds, category,
subcategory, paid to, payment method, sort, page, and page size. The default is
50 rows and the server caps pages at 100 rows.

## UI behavior

The overview supports active, archived, and all-space filters. Selecting a
space opens URL-backed `expenses`, `analytics`, and `settings` tabs. The ledger
uses a table on wide screens and cards on narrow screens. New categories can be
created inline during entry capture; the parent taxonomy save completes before
the entry is submitted, and a failed entry save retains the draft.

Archived spaces show their historical ledger and analytics in read-only mode.
Settings exposes restore, archive, and exact-name confirmed hard deletion.
Initial module, ledger, analytics, chart, and widget loads use rich skeletons.

## Analytics rules

Analytics are computed on the server from narrow parent and entry projections.
They include totals, transaction count, average, largest expenses, and
breakdowns by space, category, category/subcategory path, paid to, payment
method, and month.

Per-space analytics use the space's locked currency. All-spaces analytics
requires an explicit currency scope, includes active and archived history, and
displays that LifeOS performs no currency conversion. Equal category names and
paid-to values merge only after case folding and whitespace normalization;
subcategory values use their full category path. Missing taxonomy metadata is
reported under `Unknown category` or `Unknown subcategory`.

Charts have visible legends and nearby accessible data tables. Date preset,
custom range, currency, and all-spaces number-format choices are stored in the
URL.

## Dashboard widget

The widget reads only
`/api/widgets/summary?module_type=expense_space`. It shows active spaces,
current-month entries in active spaces, configured budgets, and currencies in
use. The whole card links to the module, contains no nested controls, and uses
the repository's 280px-safe widget primitives.

## Verification

Focused tests live beside schemas, domain helpers, API routes, and UI
components. Run the full repository gate before merging:

```bash
pnpm format
pnpm check
```
