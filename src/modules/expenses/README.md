# Expenses Module

The expenses module tracks day-to-day financial activity in the shared
`content` collection using `module_type: "expense"`. It supports both expenses
and income entries, then turns those records into dashboard metrics, analytics
charts, account summaries, and an optional public read-only view.

## Registration

| Field              | Value                                      |
| ------------------ | ------------------------------------------ |
| Registry slug      | `expenses`                                 |
| Content type       | `expense`                                  |
| Default visibility | Private                                    |
| Admin route        | `/admin/expenses`                          |
| Public route       | `/expenses` when records are marked public |
| Widget summary     | `/api/widgets/summary?module_type=expense` |

## Data Schema

`src/lib/schemas.ts` validates each payload with `ExpenseSchema`.

| Payload field  | Type                | Notes                                                                                       |
| -------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `amount`       | positive number     | Required transaction amount.                                                                |
| `currency`     | ISO currency string | Three uppercase letters, defaults to `USD`.                                                 |
| `description`  | string              | Required, trimmed, 2-200 characters.                                                        |
| `merchant`     | string              | Optional merchant or payee, up to 100 characters.                                           |
| `account`      | enum                | `Cash`, `Debit Card`, `Credit Card`, `Bank Transfer`, `UPI`, or `Other`; defaults to `UPI`. |
| `category`     | string              | Required category name, up to 80 characters.                                                |
| `subcategory`  | string              | Optional finer-grained category, up to 80 characters.                                       |
| `tags`         | string array        | Up to 20 labels, each 1-50 characters; defaults to an empty array.                          |
| `date`         | ISO datetime string | Required transaction date.                                                                  |
| `type`         | enum                | `income` or `expense`; defaults to `expense`.                                               |
| `is_recurring` | boolean             | Flags repeated activity; defaults to `false`.                                               |
| `receipt_url`  | URL string          | Optional receipt link supported by the schema.                                              |

## Admin Experience

`AdminView.tsx` fetches `/api/content?module_type=expense` and renders three
dynamic tabs with `AdminModuleSkeleton` fallbacks:

- `DashboardTab` shows monthly income, outflow, net balance, budget usage,
  account dynamics, quick filters, CSV export, refresh, and the entry form.
- `AnalyticsTab` provides yearly income, expense, savings, category, and tag
  analysis with Recharts visualizations.
- `SettingsTab` persists module settings through `useModuleSettings`, including
  categories, default currency, monthly budget, and western or Indian number
  formatting.

The entry form creates and edits records through `/api/content` and
`/api/content/[id]`. It reuses previous matching entries to suggest merchant,
account, category, subcategory, tags, and income/expense type.

## Widget Contract

`Widget.tsx` follows the dashboard widget contract by using `WidgetCard`,
`WidgetStat`, and `WidgetHighlight`. It fetches compact data from
`/api/widgets/summary?module_type=expense` instead of loading the full
collection, then shows:

- current-month spending as the hero metric,
- budget progress when a monthly budget is configured,
- otherwise the top spending category or an empty-state highlight,
- a footer trend compared with last month.

## Public View

`PublicView.tsx` renders public expense records sorted newest first. It shows a
summary total, category totals, and up to 20 recent shared records. The public
view is read-only and only receives records exposed by the public module route.

## Related Files

- `src/registry.ts` registers the module metadata.
- `src/lib/schemas.ts` owns `ExpenseSchema`.
- `src/modules/expenses/components/types.ts` defines local UI types, category
  defaults, currency options, and formatting helpers.
- `src/modules/expenses/__tests__/AdminView.test.tsx` covers the admin shell
  loading and tab behavior.
