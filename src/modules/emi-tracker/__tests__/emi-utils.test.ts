import { describe, expect, it } from "vitest";

import type { EmiLoan, ScheduleRow } from "../types";
import {
  amountInWords,
  calculateQuickStats,
  computeSchedule,
  formatMoney,
  getOutstandingAsOf,
  parseDateInputToISO,
  roundTo,
  toCSV,
  toDateInputValue,
} from "../lib/emi-utils";

const createLoan = (payload: Partial<EmiLoan["payload"]>): EmiLoan => ({
  _id: "loan-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  payload: {
    title: "Starter Loan",
    category: "Personal",
    currency: "INR",
    principal: 1200,
    tenure_months: 3,
    interest_type: "fixed",
    annual_interest_rate: 0,
    monthly_emi: 400,
    processing_fee_financed: false,
    start_date: "2026-01-01T00:00:00.000Z",
    due_day_of_month: 15,
    recast_strategy: "keep_tenure_adjust_emi",
    rate_adjustments: [],
    payments: [],
    documents: [],
    status: "active",
    ...payload,
  },
});

describe("emi-utils", () => {
  it("rounds numbers to the configured precision", () => {
    expect(roundTo(12.34567, 2)).toBe(12.35);
    expect(roundTo(1.004, 2)).toBe(1);
  });

  it("formats money in western and indian styles and handles bad values", () => {
    expect(formatMoney(1234.56, "$", 2, "western")).toBe("$1,235");
    expect(formatMoney(1234.56, "₹", 0, "indian")).toBe("₹1,235");
    expect(formatMoney(Number.NaN, "₹", 0, "indian")).toBe("₹0");
  });

  it("extracts yyyy-mm-dd from iso strings and rejects invalid dates", () => {
    expect(toDateInputValue("2026-01-09T20:15:30.123Z")).toBe("2026-01-09");
    expect(toDateInputValue("not-a-date")).toBe("");
  });

  it("converts amounts into rupees in words and handles paise", () => {
    expect(amountInWords("1200")).toBe("One Thousand Two Hundred Rupees");
    expect(amountInWords("1200.75")).toBe(
      "One Thousand Two Hundred Rupees and Seventy Five Paise",
    );
  });

  it("converts date inputs to ISO timestamps", () => {
    expect(parseDateInputToISO("2026-01-09")).toBe(
      new Date("2026-01-09T00:00:00.000Z").toISOString(),
    );
  });

  it("serializes rows as escaped CSV content", () => {
    const csv = toCSV([
      { name: "ac,me", note: 'has "quotes"', note2: "line\nbreak" },
      { name: "plain", note: "safe", note2: "" },
    ]);

    expect(csv).toBe(
      "name,note,note2\n" +
        "\"ac,me\",\"has \"\"quotes\"\"\",\"line\nbreak\"\n" +
        "plain,safe,",
    );
  });

  it("builds a fixed-rate repayment schedule with expected totals", () => {
    const result = computeSchedule(createLoan({}), 2);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      index: 1,
      principal: 400,
      interest: 0,
      closing_balance: 800,
    });
    expect(result.rows[2]).toMatchObject({ index: 3, closing_balance: 0 });
    expect(result.totals).toEqual({
      total_emi: 1200,
      total_interest: 0,
      total_principal: 1200,
      total_prepayment: 0,
    });
    expect(result.computed_emi_suggestion).toBe(400);
    expect(result.warnings).toEqual([]);
  });

  it("returns current, next, and last due rows for a schedule snapshot", () => {
    const schedule: ScheduleRow[] = [
      {
        index: 1,
        due_date: "2026-01-10T00:00:00.000Z",
        opening_balance: 1000,
        emi: 200,
        interest: 50,
        principal: 150,
        prepayment: 0,
        closing_balance: 850,
        annual_rate: 12,
      },
      {
        index: 2,
        due_date: "2026-02-10T00:00:00.000Z",
        opening_balance: 850,
        emi: 200,
        interest: 40,
        principal: 160,
        prepayment: 0,
        closing_balance: 690,
        annual_rate: 12,
      },
    ];
    const result = getOutstandingAsOf(schedule, new Date("2026-02-15T00:00:00.000Z"));

    expect(result).toEqual({
      outstanding: 690,
      nextDue: null,
      lastDue: schedule[1],
    });
  });

  it("aggregates quick stats for active loans and identifies nearest upcoming due", () => {
    const activeFirst = createLoan({
      _id: "loan-100" as never,
      title: "First Loan",
      currency: "INR",
      principal: 1200,
      tenure_months: 4,
      monthly_emi: 300,
      start_date: "2026-01-01T00:00:00.000Z",
      due_day_of_month: 5,
      first_due_date: "2026-01-05T00:00:00.000Z",
    });
    const activeSecond = createLoan({
      _id: "loan-101" as never,
      title: "Second Loan",
      currency: "USD",
      principal: 900,
      tenure_months: 3,
      monthly_emi: 300,
      start_date: "2026-01-01T00:00:00.000Z",
      due_day_of_month: 20,
      first_due_date: "2026-01-20T00:00:00.000Z",
    });
    const closedLoan = createLoan({
      _id: "loan-102" as never,
      status: "closed",
      principal: 1000,
      currency: "INR",
      title: "Closed Loan",
    });

    const stats = calculateQuickStats(
      [activeFirst, activeSecond, closedLoan],
      new Date("2026-01-15T00:00:00.000Z"),
      2,
    );

    expect(stats.activeCount).toBe(2);
    expect(stats.outstandingByCurrency).toEqual([
      { currency: "INR", amount: 900 },
      { currency: "USD", amount: 900 },
    ]);
    expect(stats.nearestDue?.loan.payload.title).toBe("Second Loan");
  });
});
