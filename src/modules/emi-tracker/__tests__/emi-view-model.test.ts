import { describe, expect, it } from "vitest";

import {
  buildLoanWorkspaceViewModel,
  buildPortfolioViewModel,
} from "../lib/emi-view-model";
import type { EmiLoan } from "../types";

const basePayload: EmiLoan["payload"] = {
  title: "Home loan",
  lender_name: "HDFC",
  category: "Home",
  currency: "INR",
  principal: 1200,
  tenure_months: 6,
  interest_type: "fixed",
  annual_interest_rate: 0,
  monthly_emi: 200,
  processing_fee_financed: false,
  start_date: "2026-01-01T00:00:00.000Z",
  due_day_of_month: 5,
  first_due_date: "2026-01-05T00:00:00.000Z",
  recast_strategy: "keep_tenure_adjust_emi",
  rate_adjustments: [],
  payments: [],
  documents: [],
  status: "active",
};

function loan(id: string, payload: Partial<EmiLoan["payload"]> = {}): EmiLoan {
  return {
    _id: id,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    payload: { ...basePayload, ...payload },
  };
}

describe("emi view model", () => {
  it("summarizes active and closed loans by currency without mixing currencies", () => {
    const result = buildPortfolioViewModel(
      [
        loan("inr-active", { currency: "INR", monthly_emi: 200 }),
        loan("usd-active", {
          currency: "USD",
          principal: 600,
          tenure_months: 3,
          monthly_emi: 200,
        }),
        loan("closed", { status: "closed", currency: "INR" }),
      ],
      new Date("2026-01-20T00:00:00.000Z"),
      2,
    );

    expect(result.activeCount).toBe(2);
    expect(result.closedCount).toBe(1);
    expect(result.allCount).toBe(3);
    expect(result.currencies).toEqual([
      {
        currency: "INR",
        outstanding: 1000,
        monthlyCommitment: 200,
        originalPrincipal: 1200,
        principalPaid: 200,
      },
      {
        currency: "USD",
        outstanding: 400,
        monthlyCommitment: 200,
        originalPrincipal: 600,
        principalPaid: 200,
      },
    ]);
    expect(result.nearestDue).toMatchObject({
      loanId: "inr-active",
      loanTitle: "Home loan",
      currency: "INR",
      amount: 200,
    });
    expect(result.nearestDue?.dueDate.slice(0, 10)).toBe("2026-02-05");
  });

  it("builds a workspace model that stays aligned with schedule utilities", () => {
    const result = buildLoanWorkspaceViewModel(
      loan("workspace", {
        annual_interest_rate: 12,
        monthly_emi: 220,
        rate_adjustments: [
          {
            effective_date: "2026-03-01T00:00:00.000Z",
            annual_interest_rate: 10,
          },
        ],
        payments: [
          {
            date: "2026-02-10T00:00:00.000Z",
            amount: 100,
            kind: "prepayment",
          },
        ],
        interest_type: "floating",
        recast_strategy: "keep_emi_adjust_tenure",
      }),
      50,
      new Date("2026-02-20T00:00:00.000Z"),
      2,
    );

    expect(result.schedule.rows.length).toBeGreaterThan(
      result.simulatedSchedule.rows.length,
    );
    expect(result.outstanding).toBe(result.schedule.rows[1].closing_balance);
    expect(result.principalPaid).toBeCloseTo(1200 - result.outstanding, 2);
    expect(result.progressPercent).toBeGreaterThan(0);
    expect(result.nextDue?.index).toBe(3);
    expect(result.currentAnnualRate).toBe(12);
    expect(result.baselinePayoffDate).toBe(
      result.schedule.rows.at(-1)?.due_date ?? null,
    );
    expect(result.simulatedPayoffDate).toBe(
      result.simulatedSchedule.rows.at(-1)?.due_date ?? null,
    );
    expect(result.interestSaved).toBeGreaterThanOrEqual(0);
    expect(result.tenureSavedMonths).toBeGreaterThan(0);
    expect(result.remainingInterest).toBeGreaterThanOrEqual(0);
  });
});
