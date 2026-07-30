# EMI Tracker

EMI Tracker is the private LifeOS debt command center for loans, amortization
schedules, payments, rate changes, payoff simulation, and documents. The admin
experience now follows the “Payoff Observatory” IA: portfolio summary first,
then a selected-loan workspace centered on the Payoff Runway.

## Registration

| Concern           | Value                |
| ----------------- | -------------------- |
| Registry slug     | `emi-tracker`        |
| Content type      | `emi_loan`           |
| Admin route       | `/admin/emi-tracker` |
| Public by default | `false`              |

Loans are stored in the shared MongoDB `content` collection with
`module_type: "emi_loan"` and validated by `EmiLoanSchema` in
[`../../lib/schemas.ts`](../../lib/schemas.ts).

## Current UX

- Portfolio toolbar with one primary `Add loan` action.
- Portfolio Hero summarizing outstanding debt, next EMI, active loans, and
  interest saved.
- Search plus `Active`, `Closed`, and `All` local filters.
- Mobile master/detail behavior: below `xl`, the selected loan replaces the
  portfolio list.
- Desktop master/detail behavior: at `xl`, the loan navigator and workspace
  render side by side.
- URL-backed workspace state:
  - `/admin/emi-tracker`
  - `/admin/emi-tracker?loan=<content-id>`
  - `/admin/emi-tracker?loan=<content-id>&section=insights`
- Five loan sections: Overview, Insights, Schedule, Activity, Documents.

## Data Schema

`payload` fields are validated by `EmiLoanSchema`.

| Field                                                                        | Notes                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `title`, `lender_name`, `category`, `currency`                               | Loan identity and grouping.                                 |
| `principal`, `tenure_months`, `monthly_emi`                                  | Core schedule inputs.                                       |
| `interest_type`, `annual_interest_rate`, `rate_adjustments`                  | Fixed/floating-rate behavior.                               |
| `processing_fee_amount`, `processing_fee_percent`, `processing_fee_financed` | Optional fee handling.                                      |
| `start_date`, `first_due_date`, `due_day_of_month`                           | Schedule date inputs; due day is constrained to `1..28`.    |
| `recast_strategy`                                                            | Floating-rate/prepayment behavior.                          |
| `payments`                                                                   | EMI and prepayment records.                                 |
| `documents`                                                                  | Sanction letters, certificates, NOCs, and other loan files. |
| `status`, `closed_at`                                                        | Active/closed/archived lifecycle.                           |

## Calculation Boundary

[`lib/emi-utils.ts`](lib/emi-utils.ts) remains the amortization boundary. It
computes schedules, outstanding balance snapshots, CSV export, PDF export,
money formatting, and interest-saved calculations.

[`lib/emi-view-model.ts`](lib/emi-view-model.ts) is presentation-only. It builds
portfolio and selected-loan view models from existing schedule utilities so UI
components do not duplicate financial logic.

## Key Components

| File                                                                     | Purpose                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [`AdminView.tsx`](AdminView.tsx)                                         | Fetching, URL state, filters, editor state, responsive shell. |
| [`components/PortfolioHero.tsx`](components/PortfolioHero.tsx)           | Composed portfolio summary replacing the old metric-card row. |
| [`components/LoanList.tsx`](components/LoanList.tsx)                     | Filtered loan navigator and empty states.                     |
| [`components/LoanCard.tsx`](components/LoanCard.tsx)                     | Touch-friendly loan card with selected semantics.             |
| [`components/LoanDetails.tsx`](components/LoanDetails.tsx)               | Selected-loan workspace and five-section navigation.          |
| [`components/PayoffRunway.tsx`](components/PayoffRunway.tsx)             | Accessible start/today/payoff timeline.                       |
| [`components/LoanOverviewTab.tsx`](components/LoanOverviewTab.tsx)       | Extra-payment simulator, results, chart, and loan terms.      |
| [`components/LoanAnalysis.tsx`](components/LoanAnalysis.tsx)             | Composition bar, balance trend, and cost summary.             |
| [`components/ScheduleTable.tsx`](components/ScheduleTable.tsx)           | Desktop/tablet table plus exports.                            |
| [`components/ScheduleCards.tsx`](components/ScheduleCards.tsx)           | Mobile grouped amortization cards with “Show more”.           |
| [`components/ActivityTab.tsx`](components/ActivityTab.tsx)               | Payments and rate-history nested section.                     |
| [`components/PaymentList.tsx`](components/PaymentList.tsx)               | Payment/prepayment records with visible delete actions.       |
| [`components/RateAdjustmentList.tsx`](components/RateAdjustmentList.tsx) | Floating-rate timeline records.                               |
| [`components/DocumentList.tsx`](components/DocumentList.tsx)             | Filterable document cards and file/data-URL handling.         |
| [`components/EmiEntryDialog.tsx`](components/EmiEntryDialog.tsx)         | Responsive dialog/sheet shell.                                |
| [`components/LoanEditor.tsx`](components/LoanEditor.tsx)                 | Three-step create/edit flow preserving nested arrays.         |

## Tests

Focused EMI verification:

```bash
pnpm test src/modules/emi-tracker
```

Full repository verification:

```bash
pnpm check
```

The EMI suite covers schedule utilities, view-model parity, AdminView loading,
PortfolioHero mixed-currency behavior, PayoffRunway accessibility, ScheduleCards
progressive loading, and LoanEditor payload preservation.
