import type { EmiLoan, ScheduleResult, ScheduleRow } from "../types";
import {
  calculateTotalInterestSavedAcrossAll,
  computeSchedule,
  getEffectiveLoanStatus,
  getOutstandingAsOf,
  roundTo,
} from "./emi-utils";

export type PortfolioStatusFilter = "active" | "closed" | "all";
export type LoanSection =
  | "overview"
  | "insights"
  | "schedule"
  | "activity"
  | "documents";
export type ActivityView = "payments" | "rates";
export type EditorMode = "create" | "edit" | null;

export interface PortfolioCurrencySummary {
  currency: string;
  outstanding: number;
  monthlyCommitment: number;
  originalPrincipal: number;
  principalPaid: number;
}

export interface PortfolioViewModel {
  activeCount: number;
  closedCount: number;
  allCount: number;
  currencies: PortfolioCurrencySummary[];
  nearestDue: {
    loanId: string;
    loanTitle: string;
    currency: string;
    amount: number;
    dueDate: string;
  } | null;
  totalInterestSaved: number;
}

export interface LoanWorkspaceViewModel {
  schedule: ScheduleResult;
  simulatedSchedule: ScheduleResult;
  outstanding: number;
  principalPaid: number;
  progressPercent: number;
  nextDue: ScheduleRow | null;
  currentAnnualRate: number;
  baselinePayoffDate: string | null;
  simulatedPayoffDate: string | null;
  paidInterest: number;
  remainingInterest: number;
  totalPayable: number;
  interestSaved: number;
  tenureSavedMonths: number;
  effectiveStatus: EmiLoan["payload"]["status"];
}

function lastRowDate(rows: ScheduleRow[]) {
  return rows.at(-1)?.due_date ?? null;
}

function clampMoney(value: number, decimals: number) {
  return roundTo(Math.max(0, value), decimals);
}

function rateAsOf(
  loan: EmiLoan["payload"],
  now: Date,
  fallbackRow: ScheduleRow | null,
) {
  let currentRate = loan.annual_interest_rate;

  for (const adjustment of [...(loan.rate_adjustments ?? [])].sort(
    (a, b) =>
      new Date(a.effective_date).getTime() -
      new Date(b.effective_date).getTime(),
  )) {
    if (new Date(adjustment.effective_date).getTime() <= now.getTime()) {
      currentRate = adjustment.annual_interest_rate;
    }
  }

  return currentRate || fallbackRow?.annual_rate || 0;
}

export function buildPortfolioViewModel(
  loans: EmiLoan[],
  now: Date,
  decimals: number,
): PortfolioViewModel {
  const summaries = new Map<string, PortfolioCurrencySummary>();
  let nearestDue: PortfolioViewModel["nearestDue"] = null;
  let activeCount = 0;
  let closedCount = 0;

  for (const loan of loans) {
    const schedule = computeSchedule(loan.payload, decimals);
    const { outstanding, nextDue } = getOutstandingAsOf(schedule.rows, now);
    const effectiveStatus = getEffectiveLoanStatus(
      loan,
      schedule,
      outstanding,
      nextDue,
      decimals,
    );

    if (effectiveStatus === "closed") {
      closedCount += 1;
      continue;
    }
    if (effectiveStatus !== "active") continue;
    activeCount += 1;

    const currency = loan.payload.currency;
    const existing =
      summaries.get(currency) ??
      ({
        currency,
        outstanding: 0,
        monthlyCommitment: 0,
        originalPrincipal: 0,
        principalPaid: 0,
      } satisfies PortfolioCurrencySummary);

    existing.outstanding = clampMoney(
      existing.outstanding + outstanding,
      decimals,
    );
    existing.monthlyCommitment = clampMoney(
      existing.monthlyCommitment + loan.payload.monthly_emi,
      decimals,
    );
    existing.originalPrincipal = clampMoney(
      existing.originalPrincipal + loan.payload.principal,
      decimals,
    );
    existing.principalPaid = clampMoney(
      existing.principalPaid +
        Math.max(0, loan.payload.principal - outstanding),
      decimals,
    );
    summaries.set(currency, existing);

    if (nextDue) {
      const dueTime = new Date(nextDue.due_date).getTime();
      if (!nearestDue || dueTime < new Date(nearestDue.dueDate).getTime()) {
        nearestDue = {
          loanId: loan._id,
          loanTitle: loan.payload.title,
          currency,
          amount: nextDue.emi,
          dueDate: nextDue.due_date,
        };
      }
    }
  }

  return {
    activeCount,
    closedCount,
    allCount: loans.length,
    currencies: [...summaries.values()].sort((a, b) =>
      a.currency.localeCompare(b.currency),
    ),
    nearestDue,
    totalInterestSaved: roundTo(
      calculateTotalInterestSavedAcrossAll(loans, decimals),
      decimals,
    ),
  };
}

export function buildLoanWorkspaceViewModel(
  loan: EmiLoan,
  extraMonthly: number,
  now: Date,
  decimals: number,
): LoanWorkspaceViewModel {
  const schedule = computeSchedule(loan.payload, decimals);
  const simulatedPayload: EmiLoan["payload"] = {
    ...loan.payload,
    monthly_emi: loan.payload.monthly_emi + Math.max(0, extraMonthly),
  };
  const simulatedSchedule =
    extraMonthly > 0 ? computeSchedule(simulatedPayload, decimals) : schedule;
  const { outstanding, nextDue } = getOutstandingAsOf(schedule.rows, now);
  const effectiveStatus = getEffectiveLoanStatus(
    loan,
    schedule,
    outstanding,
    nextDue,
    decimals,
  );
  const paidInterest = roundTo(
    schedule.rows
      .filter((row) => new Date(row.due_date).getTime() <= now.getTime())
      .reduce((sum, row) => sum + row.interest, 0),
    decimals,
  );
  const principalPaid = clampMoney(
    loan.payload.principal - outstanding,
    decimals,
  );
  const progressPercent =
    loan.payload.principal > 0
      ? roundTo(
          Math.min(
            100,
            Math.max(0, (principalPaid / loan.payload.principal) * 100),
          ),
          2,
        )
      : 0;
  const interestSaved = clampMoney(
    schedule.totals.total_interest - simulatedSchedule.totals.total_interest,
    decimals,
  );

  return {
    schedule,
    simulatedSchedule,
    outstanding: clampMoney(outstanding, decimals),
    principalPaid,
    progressPercent,
    nextDue,
    currentAnnualRate: rateAsOf(loan.payload, now, nextDue),
    baselinePayoffDate: lastRowDate(schedule.rows),
    simulatedPayoffDate: lastRowDate(simulatedSchedule.rows),
    paidInterest,
    remainingInterest: clampMoney(
      schedule.totals.total_interest - paidInterest,
      decimals,
    ),
    totalPayable: roundTo(
      loan.payload.principal + schedule.totals.total_interest,
      decimals,
    ),
    interestSaved,
    tenureSavedMonths: Math.max(
      0,
      schedule.rows.length - simulatedSchedule.rows.length,
    ),
    effectiveStatus,
  };
}
