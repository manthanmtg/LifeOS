import { describe, expect, it } from "vitest";
import {
  buildRecurringAnalytics,
  monthlyEquivalent,
  selectInitialAnalyticsCurrency,
} from "../analytics";
import type { RecurringExpense } from "../types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 31);

function expense(
  id: string,
  overrides: Partial<RecurringExpense["payload"]>,
): RecurringExpense {
  return {
    _id: id,
    payload: {
      name: `Expense ${id}`,
      cost: 100,
      currency: "INR",
      billing_cycle: "monthly",
      next_renewal_date: new Date(NOW + 7 * DAY).toISOString(),
      category: "Streaming",
      is_active: true,
      enable_reminders: true,
      ...overrides,
    },
  };
}

describe("recurring expense analytics", () => {
  it("preserves the current monthly-equivalent factors", () => {
    expect(monthlyEquivalent(1200, "yearly")).toBe(100);
    expect(monthlyEquivalent(300, "quarterly")).toBe(100);
    expect(monthlyEquivalent(10, "weekly")).toBe(43.3);
    expect(monthlyEquivalent(10, "daily")).toBeCloseTo(304.4);
    expect(monthlyEquivalent(100, "monthly")).toBe(100);
  });

  it("selects the default active currency or the first active ISO code", () => {
    const expenses = [
      expense("usd", { currency: "USD" }),
      expense("inr", { currency: "INR" }),
      expense("eur-paused", { currency: "EUR", is_active: false }),
    ];

    expect(selectInitialAnalyticsCurrency(expenses, "INR")).toBe("INR");
    expect(selectInitialAnalyticsCurrency(expenses, "EUR")).toBe("INR");
    expect(selectInitialAnalyticsCurrency([], "GBP")).toBe("GBP");
  });

  it("isolates active records by selected currency and never mutates input", () => {
    const expenses = [
      expense("inr-monthly", {
        name: "A INR",
        cost: 900,
        currency: "INR",
        billing_cycle: "monthly",
      }),
      expense("usd-monthly", {
        name: "B USD",
        cost: 100,
        currency: "USD",
        billing_cycle: "monthly",
      }),
      expense("paused-inr", {
        name: "Paused INR",
        cost: 9999,
        currency: "INR",
        is_active: false,
      }),
    ];
    const before = JSON.stringify(expenses);

    const analytics = buildRecurringAnalytics(expenses, {
      currency: "INR",
      now: NOW,
    });

    expect(analytics.activeCount).toBe(1);
    expect(analytics.monthlyBurn).toBe(900);
    expect(analytics.annualizedBurn).toBe(10800);
    expect(analytics.largestDriver?.name).toBe("A INR");
    expect(JSON.stringify(expenses)).toBe(before);
  });

  it("collapses category allocation to top five plus a single Other row", () => {
    const expenses = [
      expense("1", { category: "Alpha", cost: 600 }),
      expense("2", { category: "Beta", cost: 500 }),
      expense("3", { category: "Gamma", cost: 400 }),
      expense("4", { category: "Delta", cost: 300 }),
      expense("5", { category: "Epsilon", cost: 200 }),
      expense("6", { category: "Zeta", cost: 100 }),
      expense("7", { category: "Other", cost: 50 }),
    ];

    const analytics = buildRecurringAnalytics(expenses, {
      currency: "INR",
      now: NOW,
    });

    expect(analytics.categories).toHaveLength(6);
    expect(analytics.categories.map((category) => category.name)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
      "Delta",
      "Epsilon",
      "Other",
    ]);
    expect(
      analytics.categories.find((category) => category.name === "Other"),
    ).toMatchObject({ value: 150, count: 2 });
    expect(
      analytics.categories.reduce((sum, category) => sum + category.value, 0),
    ).toBe(analytics.monthlyBurn);
  });

  it("builds deterministic cadence, renewal, and cost-driver results", () => {
    const expenses = [
      expense("overdue", {
        name: "Overdue",
        cost: 40,
        billing_cycle: "monthly",
        next_renewal_date: new Date(NOW - DAY).toISOString(),
      }),
      expense("today", {
        name: "Today",
        cost: 50,
        billing_cycle: "weekly",
        next_renewal_date: new Date(NOW).toISOString(),
      }),
      expense("week", {
        name: "Week",
        cost: 60,
        billing_cycle: "yearly",
        next_renewal_date: new Date(NOW + 7 * DAY).toISOString(),
      }),
      expense("month", {
        name: "Month",
        cost: 70,
        billing_cycle: "quarterly",
        next_renewal_date: new Date(NOW + 30 * DAY).toISOString(),
      }),
      expense("quarter", {
        name: "Quarter",
        cost: 80,
        billing_cycle: "daily",
        next_renewal_date: new Date(NOW + 90 * DAY).toISOString(),
      }),
      expense("later", {
        name: "Later",
        cost: 90,
        billing_cycle: "monthly",
        next_renewal_date: new Date(NOW + 91 * DAY).toISOString(),
      }),
      expense("invalid", {
        name: "Invalid date",
        cost: 1000,
        billing_cycle: "monthly",
        next_renewal_date: "not-a-date",
      }),
    ];

    const analytics = buildRecurringAnalytics(expenses, {
      currency: "INR",
      now: NOW,
    });

    expect(analytics.dueWithin30Days).toEqual({
      count: 3,
      amount: 180,
      overdueCount: 1,
    });
    expect(analytics.renewalHorizon.map((bucket) => bucket.count)).toEqual([
      1, 2, 1, 1, 1,
    ]);
    expect(analytics.billingCycles[0]?.cycle).toBe("daily");
    expect(analytics.billingCycles[0]?.value).toBeCloseTo(2435.2);
    expect(analytics.billingCycles[0]?.count).toBe(1);
    expect(
      analytics.costDrivers.slice(0, 3).map((driver) => driver.id),
    ).toEqual(["quarter", "invalid", "today"]);
  });
});
