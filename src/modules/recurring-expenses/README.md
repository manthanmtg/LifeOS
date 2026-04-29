# Recurring Expenses

Recurring Expenses tracks subscriptions, memberships, bills, and repeating
charges. It is an admin-first finance module registered as
`recurring-expenses` with the `recurring_expense` content type.

## Registration

| Concern           | Value                                                |
| ----------------- | ---------------------------------------------------- |
| Registry slug     | `recurring-expenses`                                 |
| Display name      | `Recurring Expenses`                                 |
| Content type      | `recurring_expense`                                  |
| Icon              | `CreditCard`                                         |
| Public by default | `false`                                              |
| Admin route       | `/admin/recurring-expenses`                          |
| Widget route      | `/api/widgets/summary?module_type=recurring_expense` |

The module is declared in [`../../registry.ts`](../../registry.ts), validated by
`RecurringExpenseSchema` in [`../../lib/schemas.ts`](../../lib/schemas.ts), and
stored in the shared MongoDB `content` collection with
`module_type: "recurring_expense"`.

## Data Schema

`payload` fields are validated by `RecurringExpenseSchema`.

| Field               | Type                                                          | Notes                                                  |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `name`              | `string`                                                      | Required expense or subscription name.                 |
| `cost`              | `number`                                                      | Required positive billing amount.                      |
| `currency`          | `string`                                                      | Three-letter currency code, default `USD`.             |
| `billing_cycle`     | `"daily" \| "weekly" \| "monthly" \| "quarterly" \| "yearly"` | Controls renewal math and monthly equivalent values.   |
| `next_renewal_date` | ISO datetime                                                  | Required next billing date.                            |
| `category`          | `string`                                                      | Required category such as `Streaming` or `Utilities`.  |
| `url`               | URL                                                           | Optional service or billing link.                      |
| `is_active`         | `boolean`                                                     | Defaults to `true`; inactive records are paused.       |
| `enable_reminders`  | `boolean`                                                     | Defaults to `true`; disables urgency chips when false. |
| `notes`             | `string`                                                      | Optional notes, trimmed and capped at 2,000 chars.     |
| `order`             | `number`                                                      | Optional custom dashboard ordering value.              |

## Admin Features

- Fetches recurring expenses from
  `/api/content?module_type=recurring_expense`.
- Creates, updates, duplicates, and deletes records through `/api/content` and
  `/api/content/[id]`.
- Shows monthly burn, annualized burn, active expense count, and the next three
  upcoming renewals.
- Converts daily, weekly, quarterly, and yearly billing cycles into monthly and
  annual equivalents.
- Supports search by name, category, or billing cycle.
- Filters by all, overdue, warning-window, and inactive records.
- Sorts by custom order, name, cost, monthly equivalent, renewal date, or
  category.
- Supports drag-and-drop ordering with mouse, touch, and keyboard sensors.
- Provides quick actions for external links, previous cycle, mark renewed,
  duplicate, edit, and delete.

## Settings

`AdminView.tsx` stores module preferences through `useModuleSettings` under the
`recurringExpenseSettings` key.

```ts
{
  categories: [
    "Streaming",
    "Cloud/SaaS",
    "Music",
    "News",
    "Gaming",
    "Fitness",
    "Productivity",
    "Insurance",
    "Investment",
    "Housing",
    "Utilities",
    "Memberships",
    "Education",
    "Health",
    "EMI",
    "Other",
  ],
  defaultCurrency: "USD",
  renewalWarningDays: 7,
  enableReminders: true,
  numberFormat: "western",
  defaultSort: "custom",
}
```

Admins can add or remove categories, choose the default currency, set the
renewal warning window, toggle reminder defaults, choose western or Indian
number formatting, and persist a default sort.

## Widget Contract

[`Widget.tsx`](Widget.tsx) follows the dashboard widget contract:

- Uses `WidgetCard`, `WidgetStat`, and `WidgetHighlight`.
- Links the whole tile to `/admin/recurring-expenses`.
- Fetches only summary data from
  `/api/widgets/summary?module_type=recurring_expense`.
- Shows one hero metric, the monthly burn, plus one next-renewal highlight.
- Keeps overdue and due-soon counts in the footer instead of adding interactive
  controls.

The summary endpoint shape consumed by the widget is:

```ts
{
  activeCount: number;
  totalBurn: number;
  overdueCount: number;
  dueSoonCount: number;
  nextRenewal: { name: string; next_renewal_date: string } | null;
  daysUntilNext: number | null;
}
```

## Public View

[`PublicView.tsx`](PublicView.tsx) renders only active shared expenses. It shows
monthly burn, annualized burn, the next three renewals, a top-category
breakdown, and individual expense cards with cycle and monthly-equivalent
amounts.

## API Examples

Fetch all recurring expenses:

```bash
curl '/api/content?module_type=recurring_expense'
```

Create a private recurring expense:

```bash
curl -X POST '/api/content' \
  -H 'Content-Type: application/json' \
  -d '{
    "module_type": "recurring_expense",
    "is_public": false,
    "payload": {
      "name": "Music streaming",
      "cost": 10.99,
      "currency": "USD",
      "billing_cycle": "monthly",
      "next_renewal_date": "2026-05-15T00:00:00.000Z",
      "category": "Music",
      "url": "https://example.com/billing",
      "is_active": true,
      "enable_reminders": true,
      "notes": "Family plan"
    }
  }'
```

Fetch the Bento Grid widget summary:

```bash
curl '/api/widgets/summary?module_type=recurring_expense'
```

## File Map

| File                                                           | Purpose                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`AdminView.tsx`](AdminView.tsx)                               | Main admin UI, CRUD flows, settings, sorting, filtering, and renewal actions. |
| [`Widget.tsx`](Widget.tsx)                                     | Bento Grid summary card for monthly burn and next renewal.                    |
| [`PublicView.tsx`](PublicView.tsx)                             | Read-only public snapshot for active shared expenses.                         |
| [`info.md`](info.md)                                           | Short module description shown by repository tooling.                         |
| [`__tests__/AdminView.test.tsx`](__tests__/AdminView.test.tsx) | Basic admin render coverage.                                                  |
