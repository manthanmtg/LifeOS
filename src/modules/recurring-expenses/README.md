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

| Field               | Type                                                          | Notes                                                         |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| `name`              | `string`                                                      | Required expense or subscription name.                        |
| `cost`              | `number`                                                      | Required positive billing amount.                             |
| `currency`          | `string`                                                      | Three-letter currency code, default `USD`.                    |
| `billing_cycle`     | `"daily" \| "weekly" \| "monthly" \| "quarterly" \| "yearly"` | Controls renewal math and monthly equivalent values.          |
| `next_renewal_date` | ISO datetime                                                  | Required next billing date.                                   |
| `category`          | `string`                                                      | Required category such as `Streaming` or `Utilities`.         |
| `url`               | URL                                                           | Optional service or billing link.                             |
| `is_active`         | `boolean`                                                     | Defaults to `true`; inactive records are paused.              |
| `enable_reminders`  | `boolean`                                                     | Compatibility flag synchronized with `notifications.enabled`. |
| `notifications`     | `NotificationPreferences`                                     | Optional nested renewal notification rules.                   |
| `notes`             | `string`                                                      | Optional notes, trimmed and capped at 2,000 chars.            |
| `order`             | `number`                                                      | Optional custom dashboard ordering value.                     |

`notifications` uses the shared LifeOS notification contract:

```ts
{
  enabled: boolean;
  rules: Array<{
    event: "renewal";
    offsets_days: number[];
    channel_ids?: string[];
  }>;
}
```

Existing records without nested preferences still work. When
`enable_reminders !== false`, the notification source treats them as enabled and
uses `recurringExpenseSettings.defaultNotificationOffsetsDays` or `[1]`.

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
- Provides an analytics modal from the header `ChartPie` action without
  navigation or another content fetch.

## Analytics Modal

The analytics modal is opened from the icon immediately to the left of Settings.
It is lazy-loaded on first use and receives the already-loaded `subs` array from
`AdminView.tsx`; it does not call `/api/content`, `/api/system`, or any external
analytics service.

All analytics are active-only and scoped to exactly one currency at a time.
LifeOS does not fetch exchange rates, so records with different currency codes
are never summed together. If active records contain multiple currencies, the
modal shows a currency selector and an explicit no-conversion disclosure.

Derived analytics live in [`analytics.ts`](analytics.ts):

- `monthlyEquivalent()` preserves the existing factors: yearly `/ 12`,
  quarterly `/ 3`, weekly `* 4.33`, daily `* 30.44`, monthly unchanged.
- Category allocation uses monthly equivalent spend, sorted by value, with at
  most five named categories plus a single `Other` row.
- Billing cadence groups monthly impact by daily, weekly, monthly, quarterly,
  and yearly cycles.
- Renewal horizon buckets the next scheduled charge into overdue, 0-7 days,
  8-30 days, 31-90 days, and 91+ days.
- Largest cost drivers are ranked by normalized monthly equivalent.

The modal includes visible chart legends/labels and native data-table fallbacks
so chart values are available without relying on color or hover alone.

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
  defaultNotificationOffsetsDays: [1],
  numberFormat: "western",
  defaultSort: "custom",
}
```

Admins can add or remove categories, choose the default currency, set the
renewal warning window, toggle reminder defaults, configure default renewal
notification timing, choose western or Indian number formatting, and persist a
default sort.

## Default Currency Browser Cache

`useModuleSettings` accepts an optional browser-cache adapter. Recurring
Expenses passes [`settings-cache.ts`](settings-cache.ts), which stores only:

```json
{
  "defaultCurrency": "INR"
}
```

The localStorage key is:

```text
lifeos:recurring-expenses:default-currency:v1
```

The cache is a first-paint optimization only:

- Initial React state remains the shared defaults for deterministic hydration.
- After mount, a valid cached three-letter uppercase currency is merged
  immediately.
- `/api/system` still revalidates in the background.
- A valid server value replaces stale cache and refreshes localStorage.
- A valid server response without `recurringExpenseSettings` restores defaults.
- GET failures, non-OK responses, malformed responses, storage errors, and
  malformed cache payloads degrade safely without blocking the UI.

The dashboard widget uses the same adapter, so the widget and admin module show
the cached default currency consistently while server settings revalidate.

## Smart Capabilities

- Recurrence and urgency are normalized into derived values, such as monthly
  equivalent cost, annualized burn, and "days until renewal".
- The admin list highlights overdue and warning-window items and keeps inactive
  records visible for review without counting them in active totals.
- The module can duplicate records and reorder active subscriptions with drag-and-drop.
- Reminder flags now feed the shared Notifications platform. The old
  `enable_reminders` field remains synchronized for compatibility, while new
  saves write nested `notifications` preferences.

## Component Usage

The module exports three render targets from the module folder:

```tsx
import RecurringExpensesAdmin from "@/modules/recurring-expenses/AdminView";
import RecurringExpensesWidget from "@/modules/recurring-expenses/Widget";
import RecurringExpensesPublicView from "@/modules/recurring-expenses/PublicView";
```

- `AdminView` is mounted at `/admin/recurring-expenses`.
- `Widget` is used in the dashboard Bento Grid.
- `PublicView` is used by the public route to render shared subscriptions.

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

| File                                                                                             | Purpose                                                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`AdminView.tsx`](AdminView.tsx)                                                                 | Main admin UI, CRUD flows, settings, sorting, filtering, and renewal actions.   |
| [`analytics.ts`](analytics.ts)                                                                   | Pure active-only, currency-scoped analytics calculations.                       |
| [`config.ts`](config.ts)                                                                         | Shared billing cycles, categories, currency symbols, and settings defaults.     |
| [`settings-cache.ts`](settings-cache.ts)                                                         | Versioned browser cache adapter for default currency only.                      |
| [`types.ts`](types.ts)                                                                           | Shared recurring expense, settings, cycle, and sort types.                      |
| [`Widget.tsx`](Widget.tsx)                                                                       | Bento Grid summary card for monthly burn and next renewal.                      |
| [`PublicView.tsx`](PublicView.tsx)                                                               | Read-only public snapshot for active shared expenses.                           |
| [`components/RecurringExpenseAnalyticsModal.tsx`](components/RecurringExpenseAnalyticsModal.tsx) | Lazy analytics dialog with charts, insights, focus management, and data tables. |
| [`components/AnalyticsModalSkeleton.tsx`](components/AnalyticsModalSkeleton.tsx)                 | First-use loading skeleton for the analytics dialog chunk.                      |
| [`info.md`](info.md)                                                                             | Short module description shown by repository tooling.                           |
| [`__tests__/AdminView.test.tsx`](__tests__/AdminView.test.tsx)                                   | Basic admin render coverage.                                                    |
