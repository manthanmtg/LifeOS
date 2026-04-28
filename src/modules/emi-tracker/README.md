# EMI Tracker

EMI Tracker manages private loan records, amortization schedules, payments,
prepayments, rate changes, payoff projections, and loan documents. It is an
admin-only module registered as `emi-tracker` with the `emi_loan` content type.

## Registration

| Concern           | Value                |
| ----------------- | -------------------- |
| Registry slug     | `emi-tracker`        |
| Display name      | `EMI Tracker`        |
| Content type      | `emi_loan`           |
| Icon              | `Calculator`         |
| Public by default | `false`              |
| Admin route       | `/admin/emi-tracker` |

The module is declared in [`../../registry.ts`](../../registry.ts), validated by
`EmiLoanSchema` in [`../../lib/schemas.ts`](../../lib/schemas.ts), and stored in
the shared MongoDB `content` collection with `module_type: "emi_loan"`.

## Data Schema

`payload` fields are validated by `EmiLoanSchema`.

| Field                     | Type                                 | Notes                                                                                                 |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `title`                   | `string`                             | Required loan name.                                                                                   |
| `lender_name`             | `string`                             | Optional bank, financier, or lender name.                                                             |
| `category`                | `string`                             | Defaults to `Loan`; module settings provide common categories.                                        |
| `currency`                | `string`                             | Three-letter currency code, default `INR`.                                                            |
| `principal`               | `number`                             | Positive original loan amount.                                                                        |
| `tenure_months`           | `number`                             | Positive integer original tenure.                                                                     |
| `interest_type`           | `"fixed" \| "floating"`              | Defaults to `fixed`.                                                                                  |
| `annual_interest_rate`    | `number`                             | Non-negative annual percentage rate.                                                                  |
| `monthly_emi`             | `number`                             | Positive authoritative EMI used by schedule generation.                                               |
| `processing_fee_amount`   | `number`                             | Optional fixed fee.                                                                                   |
| `processing_fee_percent`  | `number`                             | Optional percentage fee.                                                                              |
| `processing_fee_financed` | `boolean`                            | Adds processing fees to the starting principal when true.                                             |
| `start_date`              | ISO datetime                         | Loan start date.                                                                                      |
| `due_day_of_month`        | `number`                             | Integer from 1 to 28, default `5`.                                                                    |
| `first_due_date`          | ISO datetime                         | Optional explicit first EMI date.                                                                     |
| `recast_strategy`         | enum                                 | `keep_tenure_adjust_emi` or `keep_emi_adjust_tenure`.                                                 |
| `rate_adjustments`        | array                                | Floating-rate changes with `effective_date`, `annual_interest_rate`, and optional `note`.             |
| `payments`                | array                                | EMI or prepayment records with `date`, `amount`, `kind`, optional `note`, and optional `receipt_url`. |
| `documents`               | array                                | Loan document links for sanction letters, NOCs, interest certificates, or other files.                |
| `status`                  | `"active" \| "closed" \| "archived"` | Defaults to `active`.                                                                                 |
| `closed_at`               | ISO datetime                         | Optional closure timestamp.                                                                           |

## Admin Features

- Fetches loans from `/api/content?module_type=emi_loan`.
- Creates and updates loan payloads through `/api/content` and
  `/api/content/[id]`.
- Searches loans by title or lender name.
- Shows portfolio metrics for active loan count, outstanding balance by
  currency, nearest EMI due date, and total interest saved.
- Renders loan cards with outstanding balance, next due date, and payoff
  progress.
- Provides a loan form with EMI suggestion support from the amortization
  formula.
- Supports the detail tabs `Simulator`, `Analysis`, `Schedule`, `History`,
  `Vault`, and `Rates`.
- Exports amortization schedules as CSV or PDF from the schedule tab.
- Logs analytics events for create, update, and payload update actions.

## API Examples

Fetch all EMI loans:

```bash
curl '/api/content?module_type=emi_loan'
```

Create a private EMI loan:

```bash
curl -X POST '/api/content' \
  -H 'Content-Type: application/json' \
  -d '{
    "module_type": "emi_loan",
    "is_public": false,
    "payload": {
      "title": "Home loan",
      "lender_name": "Acme Bank",
      "category": "Home",
      "currency": "INR",
      "principal": 5000000,
      "tenure_months": 240,
      "interest_type": "floating",
      "annual_interest_rate": 8.5,
      "monthly_emi": 43391,
      "processing_fee_financed": false,
      "start_date": "2026-04-01T00:00:00.000Z",
      "due_day_of_month": 5,
      "recast_strategy": "keep_emi_adjust_tenure",
      "rate_adjustments": [],
      "payments": [],
      "documents": [],
      "status": "active"
    }
  }'
```

Fetch the dashboard summary consumed by the Bento Grid widget:

```bash
curl '/api/widgets/summary?module_type=emi_loan&decimals=2&currency=INR'
```

## Schedule Logic

[`lib/emi-utils.ts`](lib/emi-utils.ts) is the calculation boundary for the
module. It:

- Computes the starting principal, including financed processing fees.
- Generates monthly schedule rows with opening balance, EMI, interest,
  principal, prepayment, closing balance, and annual rate.
- Applies prepayments within their due-date window.
- Applies floating-rate adjustments by effective date.
- Supports both recast strategies:
  - `keep_tenure_adjust_emi`: preserve planned tenure and adjust EMI for
    floating-rate changes.
  - `keep_emi_adjust_tenure`: preserve EMI and allow payoff tenure to change.
- Stops schedules when the EMI can no longer cover monthly interest.
- Provides helpers for outstanding balance, CSV export, PDF export, money
  formatting, and interest-saved calculations.

## Widget Contract

[`Widget.tsx`](Widget.tsx) follows the dashboard widget contract:

- Uses `WidgetCard`, `WidgetStat`, and `WidgetHighlight`.
- Links the whole card to `/admin/emi-tracker`.
- Fetches only summary data from
  `/api/widgets/summary?module_type=emi_loan&decimals=<n>&currency=<code>`.
- Shows one hero metric, the primary balance amount, plus one nearest-EMI
  highlight.
- Uses semantic variants for overdue and due-soon EMI states.

The EMI summary route returns:

```ts
{
  activeCount: number;
  outstandingByCurrency: Array<{ currency: string; amount: number }>;
  nearest: { title: string; due: string } | null;
}
```

## Settings

`AdminView.tsx` reads module settings through `useModuleSettings` with these
defaults:

```ts
{
  defaultCurrency: "INR",
  defaultDueDayOfMonth: 5,
  roundingDecimals: 2,
  numberFormat: "indian",
  defaultRecastStrategy: "keep_emi_adjust_tenure",
  categories: ["Home", "Car", "Education", "Personal", "Other"],
}
```

## File Map

| File                                                                     | Purpose                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`AdminView.tsx`](AdminView.tsx)                                         | Main admin screen, content API integration, filtering, metrics, and loan selection. |
| [`Widget.tsx`](Widget.tsx)                                               | Bento Grid summary card for outstanding loans and nearest EMI.                      |
| [`types.ts`](types.ts)                                                   | TypeScript types for loan payloads, settings, and schedule results.                 |
| [`lib/emi-utils.ts`](lib/emi-utils.ts)                                   | Amortization, payoff, formatting, CSV, and PDF helpers.                             |
| [`components/LoanForm.tsx`](components/LoanForm.tsx)                     | Loan create/edit form.                                                              |
| [`components/LoanDetails.tsx`](components/LoanDetails.tsx)               | Detail tabs, payoff simulator, exports, and nested update flows.                    |
| [`components/LoanAnalysis.tsx`](components/LoanAnalysis.tsx)             | Principal, interest, and cumulative payment charts.                                 |
| [`components/PayoffChart.tsx`](components/PayoffChart.tsx)               | Payoff projection chart used by the simulator tab.                                  |
| [`components/ScheduleTable.tsx`](components/ScheduleTable.tsx)           | Amortization table with CSV and PDF export actions.                                 |
| [`components/PaymentList.tsx`](components/PaymentList.tsx)               | EMI and prepayment history editor.                                                  |
| [`components/DocumentList.tsx`](components/DocumentList.tsx)             | Document vault editor with uploaded data URL support.                               |
| [`components/RateAdjustmentList.tsx`](components/RateAdjustmentList.tsx) | Floating-rate adjustment editor.                                                    |
| [`components/EMIMetrics.tsx`](components/EMIMetrics.tsx)                 | Portfolio-level active loan, balance, due date, and interest-saved metrics.         |
| [`components/LoanList.tsx`](components/LoanList.tsx)                     | Filtered loan-card list for the sidebar.                                            |
| [`components/LoanCard.tsx`](components/LoanCard.tsx)                     | Individual loan summary card with payoff progress.                                  |
| [`__tests__/AdminView.test.tsx`](__tests__/AdminView.test.tsx)           | Admin view behavior tests.                                                          |
