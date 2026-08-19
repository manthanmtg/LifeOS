# Expense Spaces Module Implementation Design

**Date:** 2026-08-19

**Status:** Decision-complete; ready for implementation

**Primary route:** `/admin/expense-spaces`

**Feature type:** New private module with UI, API, data model, analytics, indexes,
tests, and documentation

## Goal

Add an **Expense Spaces** module where one LifeOS instance can contain several
independent expense trackers, such as House Renovation, Pet Expenses, and Estate
Expenses. Each space must own its expense records, budget and currency settings,
category/subcategory tree, ledger filters, and analytics. The module must also
offer an all-spaces analytics view without mixing incompatible currencies.

This module complements the existing day-to-day `Expenses` module. It does not
replace, migrate, or reinterpret existing `expense` records.

## Current State

- `src/modules/expenses/` already provides one global expense ledger. Every
  record uses `module_type: "expense"`; categories and the monthly budget are
  shared in `system.expenseSettings`.
- `src/modules/expenses/components/types.ts` already models amount, currency,
  description, merchant, account, category, subcategory, tags, date, income or
  expense type, and recurrence. It does not contain a parent tracker identifier.
- `src/modules/expenses/tabs/AnalyticsTab.tsx` derives charts from the complete
  client-side expense array. That works for one personal ledger, but loading all
  records into every tracker view would not scale cleanly once entries are split
  across spaces.
- `src/modules/expenses/tabs/SettingsTab.tsx` stores one flat category list in
  `system.expenseSettings`; subcategories are free text and cannot be managed as
  a tracker-specific hierarchy.
- `src/lib/schemas.ts` and `SchemaRegistry` validate polymorphic `content`
  documents. `ExpenseSchema` cannot express a parent space or stable category
  identities.
- `/api/content` offers generic CRUD by `module_type`, but its GET route cannot
  paginate or filter by a parent reference, date range, payee, category, or
  subcategory.
- `src/app/api/import/route.ts` intentionally strips MongoDB `_id` values before
  inserting restored content. Parent-child relationships therefore cannot use
  a parent's MongoDB ObjectId as their durable backup identity.
- `src/app/api/bills/` demonstrates the repository's accepted pattern for
  domain-specific routes that still store records in the shared `content`
  collection.
- `src/app/api/widgets/summary/route.ts` is the compact, authenticated source
  for dashboard widgets. Widgets must not download full collections.
- `src/lib/seed.ts` currently indexes `content.module_type`, `created_at`, and
  `(module_type, is_public)`. It has no parent/date index for child records.
- `src/registry.ts`, `src/app/admin/page.tsx`, and
  `src/components/shell/AdminSidebar.tsx` are the explicit integration points
  for a new module and dashboard widget. Admin routing, command-palette entries,
  module search, settings visibility, and module backfill otherwise derive from
  the central registry.
- `src/proxy.ts` protects known private API families and applies same-origin
  CSRF checks to mutations.
- Recharts, Lucide React, Framer Motion, Vitest, and shared shimmer skeletons are
  already available. No package addition is required.

## Requirements

### Functional requirements

- Create, rename, archive, restore, and explicitly delete multiple expense
  spaces.
- Give each space its own name, optional description, currency, optional budget,
  number format, status, categories, and nested subcategories.
- Seed every new space with one active `Other` category so an expense can be
  entered immediately.
- Add, edit, and delete expenses only inside a selected space.
- Require an amount, calendar date, description, paid-to value, and category on
  every expense.
- Support an optional subcategory, payment method, reference, notes, tags, and
  receipt URL.
- Allow a category or subcategory to be created inline from the expense form as
  well as managed later from the selected space's Settings tab.
- Filter the ledger by search text, date range, category, subcategory, payee, and
  payment method; sort newest first by default; paginate results.
- Show analytics for one selected space and for all spaces.
- Provide analytics by space, category, category/subcategory path, paid to,
  payment method, and calendar month, plus transaction count, total spend,
  average expense, and largest expenses.
- Provide date presets for All time, This month, This year, and Custom.
- Keep archived spaces discoverable through an explicit filter, but make them
  read-only until restored.
- Add a compact dashboard widget linking to `/admin/expense-spaces`.

### Data integrity requirements

- Store spaces and entries as separate documents in the existing MongoDB
  `content` collection.
- Give every parent an immutable UUID `space_key` and store that key on child
  entries. API URLs still use the parent's MongoDB `_id`, but backup/import can
  regenerate `_id` values without breaking parent-child relationships.
- Use stable UUIDs for categories and subcategories. Entries reference those
  IDs; category renames must not rewrite historical entries.
- Require the entry's category to belong to its parent space and require its
  subcategory, when present, to belong to that category.
- Store entry dates as strict `YYYY-MM-DD` calendar dates. Do not create a UTC
  timestamp from a browser-local midnight.
- Store the space currency on every entry as a historical snapshot.
- Lock a space's currency after its first entry. Renaming a currency without an
  exchange rate would relabel historical amounts and is forbidden.
- Category and subcategory names must be unique case-insensitively within their
  applicable scope.
- Space names must be unique after trimming, collapsing repeated whitespace,
  and case folding so destructive confirmation and navigation labels remain
  unambiguous.
- A used category or subcategory can be archived and renamed, but not hard
  deleted. An unused value can be removed.
- A hard-deleted space must delete its child entries through the dedicated
  space endpoint. Generic `/api/content` mutations must reject
  `expense_space` and `expense_space_entry` so callers cannot bypass ownership,
  taxonomy, currency, concurrency, or cascade rules.

### Analytics requirements

- Never add values from different currencies into a single total.
- Per-space analytics use the selected space's single locked currency.
- All-spaces analytics require a currency scope. If spaces contain several
  currencies, show a selector and a visible no-conversion disclosure.
- Combined category analytics merge category names case-insensitively across
  spaces. Combined subcategory analytics group by the full
  `Category / Subcategory` path so identically named subcategories under
  different categories do not collide.
- All-spaces analytics includes active and archived spaces so archiving never
  removes historical spend from aggregate reporting.
- Paid-to analytics merge only normalized casing and repeated whitespace. They
  must not attempt fuzzy matching between distinct names.
- Archived categories, subcategories, and spaces remain represented in
  historical analytics.
- Missing referenced category metadata must fall back to `Unknown category` or
  `Unknown subcategory` instead of dropping spend.

### Non-functional requirements

- Keep the module private: both document types always use `is_public: false`,
  and no `PublicView.tsx` is added.
- Protect every `/api/expense-spaces/*` route in middleware and perform an
  explicit admin check inside route handlers for defense in depth.
- Validate request bodies, object IDs, query values, date ranges, pagination,
  category relationships, and ownership on the server.
- Use narrow MongoDB projections and server-side analytics so the browser never
  downloads all historical entries merely to render charts.
- Cap ledger pages at 100 rows; default to 50.
- Use shared rich skeletons for initial space, ledger, analytics, and widget
  loading. Do not render a blank screen or bare spinner.
- Use only zinc and semantic color tokens from `globals.css`.
- All controls require labels, visible keyboard focus, meaningful empty/error
  states, and 44px touch targets where practical. Charts require legends and
  accessible table/list equivalents.
- Log safe route-level errors without expense descriptions, payee names, notes,
  references, or receipt URLs.
- Preserve form input after a failed save and prevent duplicate submissions.

### Compatibility requirements

- Do not change the existing `expense` or `recurring_expense` schemas, APIs,
  settings, analytics, widgets, or stored records.
- Existing LifeOS installations receive the new module through the registry
  backfill in `ensureSystemConfig`.
- Backups continue to work because both new discriminators remain in the shared
  `content` collection, are registered in `SchemaRegistry`, and relate through
  the payload `space_key` that import preserves.
- No database migration is required for existing records.

## Assumptions

- “Each expense” in the request means each named tracker/space has its own
  analytics, in addition to an all-spaces view. It does not require a chart page
  for a single ledger row.
- The product name is **Expense Spaces**, the slug is `expense-spaces`, the
  parent discriminator is `expense_space`, and the child discriminator is
  `expense_space_entry`.
- The existing daily Expenses module remains useful and stays separate. No
  existing expense is automatically assigned to a new space.
- Entries represent outflow only. Income, refunds, recurring schedules, split
  transactions, reimbursements, and transfers are not part of this first
  release.
- A subcategory is optional because some categories do not need another level.
- `paid_to` is required free text. Reusing a previous spelling is encouraged by
  UI suggestions, but a separate payee-address-book subsystem is unnecessary.
- Categories and subcategories belong to exactly one space. The all-spaces view
  merges equal display names only for reporting; it does not create global
  shared taxonomy records.
- Budgets are optional and use either `total` or `monthly` cadence. This covers
  finite work such as renovation and ongoing trackers such as pet expenses
  without building a full budget engine.
- New spaces default to `USD` and western number formatting to match the
  existing Expenses defaults. The create form lets the administrator choose a
  different currency before the first entry.
- The expected scale is personal: tens of spaces and up to tens of thousands of
  entries. Server-side, narrow-projection, single-pass analytics is sufficient;
  precomputed rollups are not required.
- Hard deletion is intentionally destructive and is not automatically
  recoverable. Archiving is the default lifecycle action.

## Proposed Design

### Decision and alternatives

Use two content document types with tracker-specific authenticated routes:

```text
expense_space (parent settings and category tree)
        |
        +-- expense_space_entry (one document per expense, payload.space_key)
```

This preserves the repository's polymorphic storage model while giving ledger
queries, pagination, indexes, referential checks, and analytics a proper domain
boundary.

Rejected alternatives:

1. **Add `space_id` to the current `expense` schema.** This is initially small,
   but it couples a new workspace workflow to the existing day-to-day ledger,
   leaves categories in one global settings object, and creates migration and
   regression risk for current Expenses users.
2. **Embed every entry in the `expense_space` payload.** This makes one space
   easy to read atomically, but every expense edit rewrites a growing array,
   concurrent tabs can overwrite each other, analytics cannot use effective
   child indexes, and the document trends toward MongoDB's 16 MB limit.
3. **Use two document types through generic `/api/content` only.** This follows
   basic CRUD patterns but requires downloading all entries to filter by
   `space_id`, cannot enforce parent/category ownership, and cannot perform a
   controlled cascade delete. Dedicated routes are justified.

### Data model

Add these Zod-backed payload contracts in `src/lib/schemas.ts` and matching
TypeScript interfaces in `src/modules/expense-spaces/types.ts`. Export input
schemas that omit server-owned `space_key`, `currency`, and parent-reference
fields as applicable; dedicated routes stamp those values before validating the
stored payload schema.

#### `expense_space`

```ts
interface ExpenseSpacePayload {
  space_key: string; // immutable server-generated UUID
  name: string; // trimmed, 1..100
  description?: string; // trimmed, 1..500 when present
  currency: string; // three uppercase letters
  number_format: "western" | "indian";
  budget?: {
    amount: number; // positive
    cadence: "total" | "monthly";
  };
  status: "active" | "archived";
  categories: Array<{
    id: string; // UUID
    name: string; // trimmed, 1..80
    is_active: boolean;
    subcategories: Array<{
      id: string; // UUID
      name: string; // trimmed, 1..80
      is_active: boolean;
    }>;
  }>;
}
```

Limits:

- At most 100 categories per space.
- At most 100 subcategories per category.
- At least one category must remain active while the space is active.
- Category IDs are unique across the whole space. Subcategory IDs are also
  unique across the whole space, not merely within one category.
- Category names are unique case-insensitively within a space. Subcategory names
  are unique case-insensitively within their parent category.

#### `expense_space_entry`

```ts
interface ExpenseSpaceEntryPayload {
  space_key: string; // UUID copied from the parent
  amount: number; // positive
  currency: string; // copied from parent on create
  description: string; // trimmed, 2..200
  paid_to: string; // trimmed, 1..120
  category_id: string; // UUID owned by parent
  subcategory_id?: string; // UUID owned by selected category
  date: string; // strict YYYY-MM-DD
  payment_method?:
    | "Cash"
    | "Debit Card"
    | "Credit Card"
    | "Bank Transfer"
    | "UPI"
    | "Cheque"
    | "Other";
  reference?: string; // trimmed, 1..120
  notes?: string; // trimmed, 1..2000
  tags: string[]; // max 20, each 1..50, case-insensitive unique
  receipt_url?: string; // valid URL, max 2048
}
```

The entry API resolves the parent ID from the route and stamps the parent's
immutable `space_key` and currency server-side. Clients cannot move an entry
between spaces or relabel its currency by changing request JSON. Parent updates
also preserve the existing `space_key` regardless of request JSON.

### Category lifecycle and referential integrity

- New categories/subcategories receive UUIDs and start active.
- Renaming retains the UUID, so historical entries automatically display the
  new name.
- The Settings UI calls the parent update route with the complete validated
  payload and `expected_updated_at` from the last read.
- The route uses `_id + module_type + updated_at` as its update filter. A stale
  edit returns `409` and asks the client to reload instead of overwriting newer
  category changes from another tab.
- Before accepting a parent update, the route compares removed IDs with a
  narrow `countDocuments` query over `expense_space_entry` records. Used IDs
  must remain present and may only be renamed or archived.
- Active entry forms show active categories/subcategories. Editing an older
  entry also shows its currently selected archived values with an `Archived`
  label so the form remains valid.
- Inline creation first saves the updated parent taxonomy. Only after that
  succeeds does the form submit the entry. If the settings save fails, keep the
  expense draft and show the error.

### API contracts

All responses use `ApiSuccess`, `ApiError`, `ApiValidationError`, and
`ApiNotFound`.

| Method and route                                         | Behavior                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/expense-spaces?status=active                   | archived                                                                                                                                                                                                                                       | all` | Return spaces with compact summaries: entry count, total spend, this-month spend, and last-entry date. Monetary fields use each space's own currency. Default status is `active`. |
| `POST /api/expense-spaces`                               | Create a private parent document with a server-generated `space_key`. If categories are absent or empty, inject one active `Other` category with a server-generated UUID. Reject a case/whitespace-normalized duplicate space name with `409`. |
| `GET /api/expense-spaces/[spaceId]`                      | Return one parent plus total entry count so Settings can determine whether currency is locked.                                                                                                                                                 |
| `PUT /api/expense-spaces/[spaceId]`                      | Validate the full payload, optimistic concurrency timestamp, name uniqueness rules, used taxonomy IDs, active-category invariant, and currency lock. Return the updated parent DTO.                                                            |
| `DELETE /api/expense-spaces/[spaceId]`                   | Require body `{ confirmation: spaceName }`; delete all child entries and then the parent, return both delete counts, and reject a mismatched name. The UI promotes archive instead.                                                            |
| `GET /api/expense-spaces/[spaceId]/entries`              | Validate ownership and return a filtered, sorted page plus `page`, `pageSize`, `total`, `totalPages`, and lightweight distinct `paid_to`/`payment_method` facets scoped to the parent.                                                         |
| `POST /api/expense-spaces/[spaceId]/entries`             | Reject archived spaces; validate input and category ownership; stamp parent `space_key`/currency; create a private child document.                                                                                                             |
| `PUT /api/expense-spaces/[spaceId]/entries/[entryId]`    | Reject archived spaces; validate that the entry belongs to the route's parent; preserve `space_key` and currency; validate the replacement payload and return the updated DTO.                                                                 |
| `DELETE /api/expense-spaces/[spaceId]/entries/[entryId]` | Reject archived spaces and delete only when both parent and entry IDs match.                                                                                                                                                                   |
| `GET /api/expense-spaces/analytics`                      | Return currency-scoped, date-filtered analytics for `space_id=<id>` or `scope=all`.                                                                                                                                                            |

Ledger query parameters:

```text
page=1
page_size=50                # 1..100
search=<description/payee/reference/tag text>
date_from=YYYY-MM-DD        # inclusive
date_to=YYYY-MM-DD          # inclusive
category_id=<uuid>
subcategory_id=<uuid>
paid_to=<exact normalized label>
payment_method=<enum>
sort=date-desc|date-asc|amount-desc|amount-asc|paid-to-asc
```

Invalid dates, reversed date ranges, unknown enum values, non-owned taxonomy
IDs, invalid ObjectIds, page overflows, and an all-spaces analytics request
without a valid currency return `400`. Missing spaces or entries return `404`.
Stale parent settings return `409`.

### Analytics calculation

`GET /api/expense-spaces/analytics` accepts:

```text
scope=space&space_id=<ObjectId>
scope=all&currency=INR
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
```

When dates are omitted, the range is all time. The route loads only these child
fields: `_id`, `payload.space_key`, `amount`, `currency`, `date`, `paid_to`,
`category_id`, `subcategory_id`, `payment_method`, and `description`. It loads
only the matching parent names and taxonomy fields. A pure O(n) helper in
`src/lib/expense-spaces/analytics.ts` produces:

```ts
interface ExpenseSpaceAnalytics {
  scope: "space" | "all";
  currency: string;
  range: { from: string | null; to: string | null };
  totals: {
    amount: number;
    count: number;
    average: number;
  };
  by_space: Array<{ id: string; name: string; amount: number; count: number }>;
  by_category: Array<{ name: string; amount: number; count: number }>;
  by_subcategory: Array<{
    category: string;
    subcategory: string;
    amount: number;
    count: number;
  }>;
  by_paid_to: Array<{ name: string; amount: number; count: number }>;
  by_payment_method: Array<{ name: string; amount: number; count: number }>;
  by_month: Array<{ month: string; amount: number; count: number }>;
  largest_expenses: Array<{
    id: string;
    space_id: string; // parent document _id used for UI navigation
    space_name: string;
    description: string;
    paid_to: string;
    amount: number;
    date: string;
  }>;
}
```

Rules:

- Round display values, not stored numbers or intermediate sums.
- Sort monetary breakdowns by amount descending, then label ascending for a
  deterministic tie-break.
- Return at most 10 payees and 10 largest expenses; category and subcategory
  arrays include all spend-bearing groups, including archived groups, so totals
  remain auditable.
- Month keys are the first seven characters of validated calendar dates.
- The UI provides Recharts visuals and a semantic table/list containing the same
  exact values. Color is never the sole carrier of meaning.
- Empty data returns zero totals and empty arrays with HTTP 200.

### Admin user experience

`AdminView.tsx` coordinates URL-backed state so refresh and browser back work:

```text
/admin/expense-spaces
/admin/expense-spaces?view=analytics
/admin/expense-spaces?space=<id>&tab=expenses
/admin/expense-spaces?space=<id>&tab=analytics
/admin/expense-spaces?space=<id>&tab=settings
```

Unknown space IDs return to the overview with a non-blocking error rather than
rendering a broken workspace.

#### Module overview

- Header: `Expense Spaces`, a short explanation, `All analytics`, and
  `New expense space`.
- Active-space card grid. Each card shows name, currency, entry count, total
  spend, optional budget progress, last expense date, and an archived badge when
  the archived filter is enabled.
- Search and Active/Archived/All filter.
- Empty state explains examples such as House Renovation, Pet Expenses, and
  Estate Expenses and leads to the create dialog.
- The create dialog asks for name, optional description, currency, optional
  budget/cadence, and number format. Taxonomy starts with `Other` and is refined
  later or inline during entry.

#### Selected space workspace

- Breadcrumb/back control and selected space name.
- Summary band: lifetime spend, expense count, optional budget status, and top
  category. A `total` budget compares lifetime spend; a `monthly` budget
  compares the current calendar month. Values always use the space currency.
- Tabs: `Expenses`, `Analytics`, `Settings`.
- `Add expense` remains the sole primary action and is disabled while a space is
  archived.

#### Expense ledger and form

- Desktop uses a responsive table; small screens use stacked record cards.
- Each row/card shows date, description, paid to, category/subcategory, payment
  method when present, and amount.
- The filter toolbar collapses cleanly on mobile and announces active filter
  count. Reset returns to the default newest-first page.
- The form contains amount, date, description, paid to, category, dependent
  subcategory, payment method, reference, tags, notes, and receipt URL.
- Category and subcategory selectors include `Add category` and
  `Add subcategory` actions. Inline names are trimmed and checked
  case-insensitively before the parent save.
- `paid_to` uses a `datalist` or combobox backed by distinct values already
  returned as lightweight ledger facets; typed free text remains valid.
- Save errors appear in an `aria-live` region and do not close the form.

#### Space settings

- General: name, description, number format, optional budget, status.
- Currency: editable only while entry count is zero; otherwise disabled with an
  explanation.
- Taxonomy: nested category rows with add, rename, archive/restore, and delete
  controls. A category must be expanded before editing its subcategories.
- Used values show Archive instead of Delete. Archived values remain visible
  under a `Show archived` control.
- Danger zone: explicit hard-delete dialog requiring the exact space name. The
  default lifecycle action is Archive.

#### All-spaces analytics

- Currency selector appears first. It lists only currencies used by the current
  spaces/entries and explains that LifeOS performs no currency conversion.
- Date preset and custom date controls apply to every chart.
- A Western/Indian number-format control defaults to Western for all-space
  reporting and is stored in URL state; per-space analytics uses that space's
  configured number format.
- Summary metrics, by-space allocation, category, subcategory, paid-to, payment
  method, monthly trend, and largest-expense views use the analytics contract
  above.
- Selecting a space in the by-space view opens that space's Analytics tab with
  the current date range preserved in URL query parameters.

### Dashboard widget

Register `expense-spaces` and fetch
`/api/widgets/summary?module_type=expense_space`. Because a widget cannot safely
sum multiple currencies, use layout **B** (`WidgetStat + WidgetMiniStats`):

- Hero: number of active expense spaces.
- Mini stats: entries this month, spaces with configured budgets, and number of
  currencies in use.
- The whole card links to `/admin/expense-spaces`; it contains no buttons or
  form controls and stays within the 280px contract.

The summary route performs compact count/group queries and never returns entry
descriptions, payees, notes, or full category trees.

### Security, privacy, and observability

- Add `path.startsWith("/api/expense-spaces")` to `src/proxy.ts`.
- Route handlers call a shared `requireAdmin` helper before database access,
  including GET handlers.
- Generic `/api/content` POST rejects both domain-managed discriminator values.
  Generic `/api/content/[id]` PUT and DELETE read the existing discriminator and
  reject these values before mutation. GET behavior remains unchanged for
  authenticated administrators and backup compatibility.
- Every query for an entry includes both
  `module_type: "expense_space_entry"` and the `payload.space_key` resolved from
  the route's parent document.
- Parent queries always include `module_type: "expense_space"`.
- Server responses never trust or echo unvalidated request bodies.
- Regex search escapes user text and is capped at 100 characters to limit
  expensive patterns. Prefer anchored/exact matches for enumerated filters.
- Error logs identify the route and operation only. They do not log request
  bodies, analytic group labels, payees, descriptions, notes, or receipt URLs.
- UI analytics events, if added through the existing `trackEvent`, record only
  module/action and numeric amount; they do not use the payee or description as
  a label.

### Performance and indexing

Add this index in `ensureSystemConfig`:

```ts
{ module_type: 1, "payload.space_key": 1, "payload.date": -1 }
```

This serves selected-space ledger ordering and date-bounded analytics. Existing
`{ module_type: 1 }` remains sufficient for the small parent-space list and for
all-space currency scans at expected personal scale. Do not add more indexes
until representative query plans justify them.

Ledger list queries use projection, `.skip()`, `.limit()`, and a separate
`countDocuments`. Analytics execute on the server with a narrow projection and
single-pass reducers. Recharts code should be dynamically imported with a rich
skeleton so it is not included in the initial overview path.

## Files To Change

| File                                                                             | Action | Detailed Change                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/schemas.ts`                                                             | Modify | Add and export category, subcategory, parent input/stored, and entry input/stored schemas; add both discriminators to `SchemaRegistry`; enforce limits and uniqueness refinements.                     |
| `src/lib/__tests__/schemas.test.ts`                                              | Modify | Cover valid parent/entry payloads, impossible dates, normalization limits, duplicate names/IDs, tag uniqueness, empty active taxonomy, and invalid relationships that can be checked structurally.     |
| `src/lib/expense-spaces/validation.ts`                                           | Create | Implement normalized-name helpers, category/subcategory ownership checks, used-taxonomy deletion checks, currency-lock checks, query parsing, and safe regex escaping.                                 |
| `src/lib/expense-spaces/analytics.ts`                                            | Create | Implement pure, currency-scoped, date-scoped analytics and deterministic breakdown sorting/limits.                                                                                                     |
| `src/lib/expense-spaces/__tests__/validation.test.ts`                            | Create | Test ownership, archived selections, name normalization, removal rules, currency lock, date ranges, and search escaping.                                                                               |
| `src/lib/expense-spaces/__tests__/analytics.test.ts`                             | Create | Test per-space/all-space totals, currency isolation, merged labels, category paths, unknown IDs, payee normalization, date boundaries, sorting, limits, and empty input.                               |
| `src/lib/seed.ts`                                                                | Modify | Create the compound child space/date index after existing content indexes.                                                                                                                             |
| `src/lib/__tests__/seed.test.ts`                                                 | Modify | Expect the fourth content index and preserve existing registry/index behavior.                                                                                                                         |
| `src/app/api/content/route.ts`                                                   | Modify | Reject generic POST attempts for the two domain-managed expense-space types and direct callers to the dedicated route family.                                                                          |
| `src/app/api/content/[id]/route.ts`                                              | Modify | Reject generic PUT/DELETE attempts when the existing document is an expense space or entry; preserve generic and GET behavior for every other type.                                                    |
| `src/app/api/content/__tests__/route.test.ts`                                    | Modify | Test generic create rejection for both expense-space discriminators without changing existing content behavior.                                                                                        |
| `src/app/api/content/[id]/__tests__/route.test.ts`                               | Modify | Test generic update/delete rejection for both discriminators and unchanged behavior for other module types.                                                                                            |
| `src/registry.ts`                                                                | Modify | Register `expense-spaces` after the existing finance modules with `WalletCards`, `defaultPublic: false`, `contentType: "expense_space"`, description, and finance/project/budget tags.                 |
| `src/__tests__/registry.test.ts`                                                 | Modify | Assert the new module maps to its schema and stays private without changing the existing first-four ordering assertion.                                                                                |
| `src/components/shell/AdminSidebar.tsx`                                          | Modify | Import `WalletCards` from Lucide and add it to `IconMap`.                                                                                                                                              |
| `src/app/admin/page.tsx`                                                         | Modify | Add the `expense-spaces` dynamic widget import with an object-literal `WidgetSkeleton` fallback.                                                                                                       |
| `src/proxy.ts`                                                                   | Modify | Protect the complete `/api/expense-spaces` family.                                                                                                                                                     |
| `src/app/__tests__/proxy.test.ts`                                                | Modify | Assert unauthenticated GET and mutation requests to expense-space routes are rejected and authenticated same-origin requests pass middleware.                                                          |
| `src/app/api/expense-spaces/route.ts`                                            | Create | List compact space summaries and create validated private spaces with the default `Other` category.                                                                                                    |
| `src/app/api/expense-spaces/__tests__/route.test.ts`                             | Create | Test auth, status filtering, compact summary mapping, default taxonomy, validation, private writes, and safe 500 responses.                                                                            |
| `src/app/api/expense-spaces/[spaceId]/route.ts`                                  | Create | Get, concurrency-safe update, archive/restore, taxonomy integrity checks, currency lock, and confirmed cascade delete.                                                                                 |
| `src/app/api/expense-spaces/[spaceId]/__tests__/route.test.ts`                   | Create | Test invalid/missing IDs, stale timestamp, immutable `space_key`, duplicate name, currency lock, used taxonomy removal, archive/restore, confirmation, ownership filters, delete counts, and failures. |
| `src/app/api/expense-spaces/[spaceId]/entries/route.ts`                          | Create | Paginated/filterable entry GET and validated entry POST with server-stamped parent/currency.                                                                                                           |
| `src/app/api/expense-spaces/[spaceId]/entries/__tests__/route.test.ts`           | Create | Test pagination caps, filters, projections, regex escaping, archived parent, category ownership, stamp behavior, and errors.                                                                           |
| `src/app/api/expense-spaces/[spaceId]/entries/[entryId]/route.ts`                | Create | Validate parent/entry ownership for full entry update and delete. Preserve immutable parent/currency fields.                                                                                           |
| `src/app/api/expense-spaces/[spaceId]/entries/[entryId]/__tests__/route.test.ts` | Create | Test cross-space ID rejection, archived parent, taxonomy checks, immutable fields, valid update/delete, missing records, and safe failures.                                                            |
| `src/app/api/expense-spaces/analytics/route.ts`                                  | Create | Authenticate, validate scope/currency/dates, load narrow projections, call the pure analytics helper, and return no-conversion metadata.                                                               |
| `src/app/api/expense-spaces/analytics/__tests__/route.test.ts`                   | Create | Test required all-space currency, per-space currency derivation, query filters/projections, unknown spaces, empty data, and helper response mapping.                                                   |
| `src/app/api/widgets/summary/route.ts`                                           | Modify | Add a special compact summary branch for `expense_space` that queries parent counts and current-month child counts without entering the generic one-type flow.                                         |
| `src/app/api/widgets/summary/__tests__/route.test.ts`                            | Modify | Cover active spaces, current-month entries, budget count, currency count, empty data, and query projection/filter contracts.                                                                           |
| `src/modules/expense-spaces/types.ts`                                            | Create | Define document DTOs, form inputs, filters, API pagination, analytics response, tab/view, and widget response types.                                                                                   |
| `src/modules/expense-spaces/constants.ts`                                        | Create | Define currency choices, payment methods, page defaults, date presets, and default form values.                                                                                                        |
| `src/modules/expense-spaces/api.ts`                                              | Create | Provide a small typed fetch wrapper that parses standard API envelopes and preserves validation/status messages for UI hooks.                                                                          |
| `src/modules/expense-spaces/hooks/useExpenseSpaces.ts`                           | Create | Load/filter spaces and expose create/update/archive/restore/delete actions with stale-write recovery and status state.                                                                                 |
| `src/modules/expense-spaces/hooks/useExpenseEntries.ts`                          | Create | Load paginated entries/facets for a selected space; expose filters and create/update/delete actions without losing active filters.                                                                     |
| `src/modules/expense-spaces/AdminView.tsx`                                       | Create | Coordinate URL-backed overview/all-analytics/selected-space state, dynamic tabs, initial skeletons, and top-level errors.                                                                              |
| `src/modules/expense-spaces/components/ExpenseSpacesOverview.tsx`                | Create | Render overview header, search/status filters, summary cards, empty state, and new-space dialog trigger.                                                                                               |
| `src/modules/expense-spaces/components/ExpenseSpaceForm.tsx`                     | Create | Accessible create/edit form for general settings, budget, currency, and number format.                                                                                                                 |
| `src/modules/expense-spaces/components/ExpenseSpaceWorkspace.tsx`                | Create | Render selected-space breadcrumb, summary band, tabs, archive state, and dynamic tab content.                                                                                                          |
| `src/modules/expense-spaces/components/ExpenseEntryList.tsx`                     | Create | Responsive filters, paginated desktop table/mobile cards, empty states, and edit/delete actions.                                                                                                       |
| `src/modules/expense-spaces/components/ExpenseEntryForm.tsx`                     | Create | Create/edit expense dialog with paid-to field, dependent taxonomy, inline taxonomy creation, validation, and preserved failure state.                                                                  |
| `src/modules/expense-spaces/components/ExpenseSpaceAnalytics.tsx`                | Create | Render per-space/all-space currency/date controls, metrics, Recharts views, accessible data equivalents, and no-conversion copy.                                                                       |
| `src/modules/expense-spaces/components/ExpenseSpaceSettings.tsx`                 | Create | Manage general settings, currency lock, budget, nested taxonomy lifecycle, archive/restore, stale-write errors, and confirmed delete.                                                                  |
| `src/modules/expense-spaces/Widget.tsx`                                          | Create | Implement `WidgetStat + WidgetMiniStats`, rich loading/error states, and whole-card navigation.                                                                                                        |
| `src/modules/expense-spaces/__tests__/AdminView.test.tsx`                        | Create | Test skeleton-to-overview flow, URL state, unknown space recovery, archived read-only behavior, tab navigation, and API error states.                                                                  |
| `src/modules/expense-spaces/__tests__/Widget.test.tsx`                           | Create | Test summary fetch, loading, values, error behavior, link contract, lack of interactive children, and 280px-safe composition.                                                                          |
| `src/modules/expense-spaces/components/__tests__/ExpenseEntryForm.test.tsx`      | Create | Test required fields, dependent subcategories, inline taxonomy save ordering, archived historical values, duplicate submission prevention, and retained draft on error.                                |
| `src/modules/expense-spaces/components/__tests__/ExpenseSpaceSettings.test.tsx`  | Create | Test rename/archive/delete taxonomy rules, currency lock, concurrency conflict, restore flow, exact-name hard-delete confirmation, and accessible status.                                              |
| `src/modules/expense-spaces/README.md`                                           | Create | Document registration, data contracts, route contracts, UI behavior, analytics/currency rules, category lifecycle, index, and testing.                                                                 |
| `src/modules/expense-spaces/info.md`                                             | Create | Add concise in-product guidance and examples for creating spaces, taxonomy, expenses, and interpreting analytics.                                                                                      |

No file is deleted. No `PublicView.tsx`, new package, or standalone MongoDB
collection is added.

## Implementation Phases

### Phase 1: Contracts and pure domain rules

1. Add TypeScript contracts and constants in
   `src/modules/expense-spaces/types.ts` and `constants.ts`.
2. Add both schemas and schema registry entries in `src/lib/schemas.ts`.
3. Implement taxonomy ownership, normalized uniqueness, date/filter parsing,
   currency locking, and safe search helpers in `validation.ts`.
4. Implement the pure currency/date-scoped analytics reducer.
5. Add schema, validation, and analytics tests before route implementation.

Completion gate: all domain tests pass, and no helper depends on React or a live
MongoDB connection.

### Phase 2: Persistence and authenticated API

1. Add the space list/create route.
2. Add the single-space get/update/delete route with optimistic concurrency,
   taxonomy-use checks, currency lock, and confirmed cascade deletion.
3. Add paginated entry list/create and owned entry update/delete routes.
4. Add the analytics route using narrow projections and the pure reducer.
5. Block domain-managed mutations through the generic content routes.
6. Protect the API family in middleware and add route/middleware tests.
7. Add the child space/date index and seed test.

Completion gate: API tests prove no request can read or mutate another space's
entry through a mismatched URL, and analytics never mix currencies.

### Phase 3: Module shell and overview

1. Register the module, sidebar icon, and dynamic widget import.
2. Add the typed API wrapper and `useExpenseSpaces` hook.
3. Implement URL-backed `AdminView`, the overview grid, active/archive filter,
   and create-space dialog.
4. Implement selected-space workspace header and read-only archived behavior.
5. Add rich skeleton, empty, partial-error, and retry states.

Completion gate: a user can create, open, archive, restore, and permanently
delete a space without any entry UI yet.

### Phase 4: Ledger and tracker settings

1. Implement `useExpenseEntries` with pagination and filters.
2. Build the responsive ledger list/table.
3. Build create/edit expense form with paid-to, category/subcategory, and
   optional details.
4. Add inline taxonomy creation with parent-save-before-entry ordering.
5. Build Settings taxonomy lifecycle, currency lock, budget, archive/restore,
   and danger-zone flows.
6. Add component tests for successful, invalid, stale, and failed operations.

Completion gate: CRUD, filter, pagination, inline taxonomy creation, archived
historical editing behavior, and all tracker settings are covered by tests.

### Phase 5: Analytics and dashboard widget

1. Implement selected-space and all-space analytics UI with dynamically loaded
   chart code and accessible value tables.
2. Persist date/currency/scope selections in URL query parameters.
3. Add the compact widget summary branch and widget.
4. Test empty, single-currency, and multi-currency behavior.

Completion gate: per-space and all-space totals reconcile with test fixtures,
mixed currencies require explicit scope, and the widget follows the hard 280px
contract.

### Phase 6: Documentation and verification

1. Add module README and in-product `info.md`.
2. Run focused Vitest files while iterating.
3. Run `pnpm format`, then `pnpm check` as the final code-quality gate.
4. Start `pnpm dev` and use Playwright to verify the overview, create flow,
   ledger, Settings taxonomy, per-space analytics, all analytics, and dashboard
   widget at desktop and approximately 375px mobile width.
5. Check browser console/network output for errors and confirm no widget
   overflow warning appears.

## Testing Plan

| Test                   | File or Command                                                                  | Purpose                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Schema unit            | `src/lib/__tests__/schemas.test.ts`                                              | Validate both payload contracts, limits, defaults, calendar dates, and uniqueness refinements.                        |
| Domain validation unit | `src/lib/expense-spaces/__tests__/validation.test.ts`                            | Prove taxonomy ownership, archive/remove behavior, currency lock, date/filter parsing, and search safety.             |
| Analytics unit         | `src/lib/expense-spaces/__tests__/analytics.test.ts`                             | Prove mathematical totals, grouping, normalization, currency/date scoping, deterministic sorting, and empty behavior. |
| Space API              | `src/app/api/expense-spaces/__tests__/route.test.ts`                             | Verify private parent list/create behavior and defaults.                                                              |
| Single-space API       | `src/app/api/expense-spaces/[spaceId]/__tests__/route.test.ts`                   | Verify concurrency, taxonomy integrity, currency lock, archive, and cascade delete.                                   |
| Entry collection API   | `src/app/api/expense-spaces/[spaceId]/entries/__tests__/route.test.ts`           | Verify query parsing, pagination, parent stamping, and category relationship validation.                              |
| Entry item API         | `src/app/api/expense-spaces/[spaceId]/entries/[entryId]/__tests__/route.test.ts` | Verify ownership and immutable fields for update/delete.                                                              |
| Analytics API          | `src/app/api/expense-spaces/analytics/__tests__/route.test.ts`                   | Verify auth, filters/projections, required currency scope, and response mapping.                                      |
| Middleware             | `src/app/__tests__/proxy.test.ts`                                                | Verify the entire new API family is private and still receives CSRF checks.                                           |
| Widget summary         | `src/app/api/widgets/summary/__tests__/route.test.ts`                            | Verify compact query and active/monthly/budget/currency counts.                                                       |
| Module UI              | `src/modules/expense-spaces/__tests__/AdminView.test.tsx`                        | Verify overview/workspace URL state, loading, errors, and archived behavior.                                          |
| Entry form UI          | `src/modules/expense-spaces/components/__tests__/ExpenseEntryForm.test.tsx`      | Verify required details, dependent taxonomy, inline create ordering, and failure retention.                           |
| Settings UI            | `src/modules/expense-spaces/components/__tests__/ExpenseSpaceSettings.test.tsx`  | Verify category/subcategory lifecycle, currency lock, stale update, and destructive confirmation.                     |
| Widget UI              | `src/modules/expense-spaces/__tests__/Widget.test.tsx`                           | Verify loading/error/value/link/widget-contract behavior.                                                             |
| Full automated check   | `pnpm check`                                                                     | Run lint, TypeScript, production build, and all Vitest tests.                                                         |
| Formatting             | `pnpm format` then `pnpm format:check`                                           | Apply and verify repository formatting.                                                                               |
| Desktop visual         | Playwright at `/admin/expense-spaces` and `/admin`                               | Verify cards, workspace, forms, analytics, settings, and widget without overflow.                                     |
| Mobile visual          | Playwright around `375x812`                                                      | Verify tabs, modal/sheet layout, cards, filter controls, charts/tables, and touch targets.                            |

## Edge Cases

- **No spaces:** show a purposeful create-space empty state; analytics is
  disabled with explanatory copy.
- **Space with no entries:** show zero metrics, an Add expense action, and empty
  analytics without chart exceptions.
- **Archived space:** allow viewing ledger/analytics/settings, but reject entry
  writes in both UI and API until restored.
- **Currency change after entries:** return `409`; do not relabel or convert
  historical numbers.
- **Multiple currencies across spaces:** require an analytics currency selector;
  never render one combined amount.
- **Category renamed:** all referenced entries display the new name because IDs
  remain stable.
- **Used category archived:** exclude it from new-entry choices but retain it in
  existing rows, edits, and analytics.
- **Used category removed by stale/malformed client:** return `409` and preserve
  the parent document.
- **Subcategory does not belong to category:** return `400` even if both IDs
  exist elsewhere in the same space.
- **Category created inline and entry save fails:** keep the new category because
  its parent save succeeded; retain the entry draft and allow retry.
- **Concurrent taxonomy edits:** second writer receives `409`; UI reloads latest
  settings and asks the user to reapply unsaved text.
- **Mismatched parent/entry URL:** return `404`, preventing cross-space mutation.
- **Invalid or impossible date:** reject values such as `2026-02-30`; string
  ordering is safe only after strict validation.
- **Date filter with only one bound:** apply the provided inclusive bound.
- **Paid-to casing/spacing variants:** `Acme Ltd`, `acme ltd`, and repeated
  internal spaces merge; `Acme Limited` remains distinct.
- **Unknown taxonomy ID in legacy/imported data:** include spend under Unknown
  labels and do not crash analytics.
- **Duplicate tags with casing differences:** normalize uniqueness while
  preserving the first display spelling.
- **Hard delete partially fails:** return 500 with safe counts only when known;
  leave the parent if child deletion failed. If children were deleted and the
  final parent delete fails, the parent remains visible as an empty space so the
  operation can be retried. Do not claim success.
- **Analytics request over a large range:** use narrow projections and a loading
  skeleton; do not hold duplicate full entry arrays in the client.
- **Widget API failure:** render a compact error highlight, not zero values that
  could be mistaken for real data.

## Risks And Mitigations

- **Risk: two related document types can become inconsistent.** Dedicated routes
  stamp parent/currency fields, validate ownership, and perform all supported
  cascade behavior. Generic content mutation routes reject both discriminators.
- **Risk: category deletion breaks historical meaning.** Stable IDs plus
  used-value archive rules preserve history; analytics has Unknown fallbacks for
  malformed imported data.
- **Risk: names merge incorrectly in all-space analytics.** Only exact
  case/whitespace normalization is used; fuzzy matching is explicitly excluded.
- **Risk: mixed currencies produce misleading totals.** Per-space currency is
  locked, all-space analytics is currency-scoped, and the UI displays a
  no-conversion disclosure.
- **Risk: a parent payload's category tree grows too large.** Schema caps provide
  a generous personal-scale ceiling. Entries remain separate, so routine ledger
  growth does not expand the parent document.
- **Risk: client-side URL state and fetched state diverge.** `AdminView` treats
  query parameters as the navigation source of truth and validates selected IDs
  against fetched spaces before rendering.
- **Risk: inline taxonomy creation leaves a category after entry failure.** This
  is intentional and disclosed; the category is valid reusable configuration,
  while the unsaved expense stays recoverable in the open form.
- **Risk: destructive delete is not transactional on all MongoDB deployments.**
  Archive is the normal path, exact-name confirmation is required, child delete
  must succeed before parent delete, and a retained empty parent makes a final
  delete failure visible/retryable.
- **Risk: server analytics becomes slow at much larger scale.** The indexed,
  narrow-projection O(n) design is appropriate for current personal scale. A
  future Mongo aggregation/rollup can replace the helper behind the stable API
  contract if profiling demonstrates a need.

## Rollout And Rollback

### Rollout

1. Deploy schemas, routes, index, registry, UI, widget, and tests together.
2. On startup, `ensureSystemConfig` backfills `expense-spaces` into the global
   module registry and creates the compound child index idempotently.
3. The new module is enabled but private by default, matching existing registry
   behavior for new modules.
4. No data appears until the administrator creates a space.
5. Verify one seeded test space in a non-production environment before relying
   on the module for real records.

### Rollback

- Disable `expense-spaces` in System Settings first; stored documents remain
  untouched.
- Reverting the application code does not affect existing `expense` or
  `recurring_expense` behavior.
- The two new content discriminators are additive. Retain their documents during
  rollback so re-enabling a fixed build restores them.
- The compound index may remain safely after rollback. Dropping it is optional
  and should not be part of an urgent application rollback.
- Do not delete `expense_space` or `expense_space_entry` documents as part of
  code rollback.

## Non-Goals

- Migrating or linking existing daily Expenses records.
- Replacing the Recurring Expenses module.
- Income, refunds, reimbursements, transfers, installments, or split expenses.
- Automated recurring expense creation or notification scheduling.
- Exchange-rate fetching, currency conversion, or base-currency reporting.
- Receipt file upload/OCR; the first release supports an optional receipt URL
  only.
- Shared global categories, payee address books, vendors, contacts, or tax
  records.
- CSV/PDF export or bulk import.
- Public expense-space pages or public APIs.
- Collaboration, per-space permissions, or multiple admin users.
- AI categorization, anomaly detection, budget forecasting, or recommendations.
- Precomputed analytics collections, background jobs, or caches.

## Implementer Handoff Checklist

- [ ] Goal and module boundary are explicit: this is additive and does not alter
      current Expenses data.
- [ ] Parent and child payloads, discriminator names, invariants, limits, and
      immutable fields are specified.
- [ ] Every route, query parameter, response responsibility, status condition,
      and auth boundary is named.
- [ ] Categories/subcategories use stable IDs and preserve historical records.
- [ ] Per-space and all-space analytics behavior is exact and currency-safe.
- [ ] UI views, URL state, loading/error/empty states, accessibility, and mobile
      behavior are defined.
- [ ] Every implementation file to add or modify is named with a concrete
      responsibility.
- [ ] Phases are ordered with completion gates and no hidden dependency.
- [ ] Unit, route, component, full-check, and Playwright verification are listed.
- [ ] Edge cases, privacy, performance, rollout, rollback, and non-goals are
      covered.
- [ ] The implementation runs `pnpm format` and `pnpm check` before completion.
