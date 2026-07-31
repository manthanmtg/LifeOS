import { BILLING_CYCLES } from "./config";
import type { BillingCycle, RecurringExpense } from "./types";

const DAY_MS = 86_400_000;

export type RenewalHorizonKey =
  | "overdue"
  | "week"
  | "month"
  | "quarter"
  | "later";

export interface RecurringAnalytics {
  currency: string;
  activeCount: number;
  monthlyBurn: number;
  annualizedBurn: number;
  dominantCategory: {
    name: string;
    value: number;
    share: number;
  } | null;
  largestDriver: {
    id: string;
    name: string;
    monthlyEquivalent: number;
  } | null;
  dueWithin30Days: {
    count: number;
    amount: number;
    overdueCount: number;
  };
  categories: Array<{
    name: string;
    value: number;
    count: number;
    share: number;
  }>;
  billingCycles: Array<{
    cycle: BillingCycle;
    value: number;
    count: number;
  }>;
  renewalHorizon: Array<{
    key: RenewalHorizonKey;
    label: string;
    count: number;
    amount: number;
  }>;
  costDrivers: Array<{
    id: string;
    name: string;
    category: string;
    cycle: BillingCycle;
    originalCost: number;
    monthlyEquivalent: number;
  }>;
}

export interface BuildRecurringAnalyticsOptions {
  currency: string;
  now: number;
}

export function monthlyEquivalent(
  cost: number,
  cycle: BillingCycle | string,
): number {
  if (cycle === "yearly") return cost / 12;
  if (cycle === "quarterly") return cost / 3;
  if (cycle === "weekly") return cost * 4.33;
  if (cycle === "daily") return cost * 30.44;
  return cost;
}

export function getActiveCurrencies(expenses: RecurringExpense[]): string[] {
  return Array.from(
    new Set(
      expenses
        .filter((expense) => expense.payload.is_active)
        .map((expense) => expense.payload.currency)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function selectInitialAnalyticsCurrency(
  expenses: RecurringExpense[],
  defaultCurrency: string,
): string {
  const activeCurrencies = getActiveCurrencies(expenses);
  if (activeCurrencies.includes(defaultCurrency)) return defaultCurrency;
  return activeCurrencies[0] || defaultCurrency;
}

function shareOf(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function sortByValueName<T extends { value: number; name: string }>(
  a: T,
  b: T,
): number {
  return b.value - a.value || a.name.localeCompare(b.name);
}

function daysUntil(date: string, now: number): number | null {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.ceil((timestamp - now) / DAY_MS);
}

function createRenewalBuckets(): RecurringAnalytics["renewalHorizon"] {
  return [
    { key: "overdue", label: "Overdue", count: 0, amount: 0 },
    { key: "week", label: "0-7 days", count: 0, amount: 0 },
    { key: "month", label: "8-30 days", count: 0, amount: 0 },
    { key: "quarter", label: "31-90 days", count: 0, amount: 0 },
    { key: "later", label: "91+ days", count: 0, amount: 0 },
  ];
}

function renewalBucketKey(days: number): RenewalHorizonKey {
  if (days < 0) return "overdue";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  if (days <= 90) return "quarter";
  return "later";
}

export function buildRecurringAnalytics(
  expenses: RecurringExpense[],
  options: BuildRecurringAnalyticsOptions,
): RecurringAnalytics {
  const selected = expenses.filter(
    (expense) =>
      expense.payload.is_active &&
      expense.payload.currency === options.currency,
  );

  const monthlyBurn = selected.reduce(
    (sum, expense) =>
      sum +
      monthlyEquivalent(expense.payload.cost, expense.payload.billing_cycle),
    0,
  );

  const categoryMap = new Map<
    string,
    { name: string; value: number; count: number }
  >();
  const cycleMap = new Map<
    BillingCycle,
    { cycle: BillingCycle; value: number; count: number }
  >();
  const renewalHorizon = createRenewalBuckets();
  const renewalBucketMap = new Map(
    renewalHorizon.map((bucket) => [bucket.key, bucket]),
  );
  let dueWithin30DaysCount = 0;
  let dueWithin30DaysAmount = 0;
  let overdueCount = 0;

  selected.forEach((expense) => {
    const monthly = monthlyEquivalent(
      expense.payload.cost,
      expense.payload.billing_cycle,
    );
    const categoryName = expense.payload.category || "Other";
    const category = categoryMap.get(categoryName) || {
      name: categoryName,
      value: 0,
      count: 0,
    };
    category.value += monthly;
    category.count += 1;
    categoryMap.set(categoryName, category);

    const cycle = cycleMap.get(expense.payload.billing_cycle) || {
      cycle: expense.payload.billing_cycle,
      value: 0,
      count: 0,
    };
    cycle.value += monthly;
    cycle.count += 1;
    cycleMap.set(expense.payload.billing_cycle, cycle);

    const renewalDays = daysUntil(
      expense.payload.next_renewal_date,
      options.now,
    );
    if (renewalDays === null) return;

    const bucket = renewalBucketMap.get(renewalBucketKey(renewalDays));
    if (bucket) {
      bucket.count += 1;
      bucket.amount += expense.payload.cost;
    }
    if (renewalDays < 0) {
      overdueCount += 1;
    } else if (renewalDays <= 30) {
      dueWithin30DaysCount += 1;
      dueWithin30DaysAmount += expense.payload.cost;
    }
  });

  const sortedCategories = Array.from(categoryMap.values()).sort(
    sortByValueName,
  );
  const topCategories = sortedCategories.slice(0, 5).map((category) => ({
    ...category,
  }));
  const collapsedCategories = sortedCategories.slice(5);

  if (collapsedCategories.length > 0) {
    const other = topCategories.find((category) => category.name === "Other");
    const collapsed = collapsedCategories.reduce(
      (total, category) => ({
        value: total.value + category.value,
        count: total.count + category.count,
      }),
      { value: 0, count: 0 },
    );

    if (other) {
      other.value += collapsed.value;
      other.count += collapsed.count;
    } else {
      topCategories.push({
        name: "Other",
        value: collapsed.value,
        count: collapsed.count,
      });
    }
  }

  const categories = topCategories.map((category) => ({
    ...category,
    share: shareOf(category.value, monthlyBurn),
  }));

  const billingCycles = Array.from(cycleMap.values()).sort(
    (a, b) =>
      b.value - a.value ||
      BILLING_CYCLES.indexOf(a.cycle) - BILLING_CYCLES.indexOf(b.cycle),
  );

  const costDrivers = selected
    .map((expense) => ({
      id: expense._id,
      name: expense.payload.name,
      category: expense.payload.category || "Other",
      cycle: expense.payload.billing_cycle,
      originalCost: expense.payload.cost,
      monthlyEquivalent: monthlyEquivalent(
        expense.payload.cost,
        expense.payload.billing_cycle,
      ),
    }))
    .sort(
      (a, b) =>
        b.monthlyEquivalent - a.monthlyEquivalent ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 7);

  return {
    currency: options.currency,
    activeCount: selected.length,
    monthlyBurn,
    annualizedBurn: monthlyBurn * 12,
    dominantCategory:
      categories.length > 0
        ? {
            name: categories[0].name,
            value: categories[0].value,
            share: categories[0].share,
          }
        : null,
    largestDriver:
      costDrivers.length > 0
        ? {
            id: costDrivers[0].id,
            name: costDrivers[0].name,
            monthlyEquivalent: costDrivers[0].monthlyEquivalent,
          }
        : null,
    dueWithin30Days: {
      count: dueWithin30DaysCount,
      amount: dueWithin30DaysAmount,
      overdueCount,
    },
    categories,
    billingCycles,
    renewalHorizon,
    costDrivers,
  };
}
