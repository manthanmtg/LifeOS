import type {
  ExpensePaymentMethod,
  ExpenseSpaceAnalytics,
  ExpenseSpaceCategory,
} from "@/modules/expense-spaces/types";
import { normalizeDisplayName, normalizeName } from "./validation";

export interface ExpenseSpaceAnalyticsParent {
  id: string;
  spaceKey: string;
  name: string;
  currency: string;
  categories: ExpenseSpaceCategory[];
}

export interface ExpenseSpaceAnalyticsEntry {
  id: string;
  spaceKey: string;
  amount: number;
  currency: string;
  description: string;
  paidTo: string;
  categoryId: string;
  subcategoryId?: string;
  paymentMethod?: ExpensePaymentMethod;
  date: string;
}

interface BreakdownValue {
  name: string;
  amount: number;
  count: number;
}

function increment(
  values: Map<string, BreakdownValue>,
  key: string,
  name: string,
  amount: number,
) {
  const current = values.get(key);
  if (current) {
    current.amount += amount;
    current.count += 1;
  } else {
    values.set(key, { name, amount, count: 1 });
  }
}

function sortedBreakdown(values: Map<string, BreakdownValue>) {
  return [...values.values()].sort(
    (left, right) =>
      right.amount - left.amount || left.name.localeCompare(right.name),
  );
}

export function calculateExpenseSpaceAnalytics(input: {
  scope: "space" | "all";
  currency: string;
  spaceId?: string;
  dateFrom?: string;
  dateTo?: string;
  spaces: ExpenseSpaceAnalyticsParent[];
  entries: ExpenseSpaceAnalyticsEntry[];
}): ExpenseSpaceAnalytics {
  const spacesByKey = new Map(
    input.spaces.map((space) => [space.spaceKey, space]),
  );
  const selectedSpace = input.spaceId
    ? input.spaces.find((space) => space.id === input.spaceId)
    : undefined;
  const filtered = input.entries.filter((entry) => {
    const parent = spacesByKey.get(entry.spaceKey);
    if (!parent || entry.currency !== input.currency) return false;
    if (input.scope === "space" && parent.id !== selectedSpace?.id)
      return false;
    if (input.dateFrom && entry.date < input.dateFrom) return false;
    if (input.dateTo && entry.date > input.dateTo) return false;
    return true;
  });

  const bySpace = new Map<string, BreakdownValue>();
  const byCategory = new Map<string, BreakdownValue>();
  const bySubcategory = new Map<
    string,
    BreakdownValue & { category: string; subcategory: string }
  >();
  const byPaidTo = new Map<string, BreakdownValue>();
  const byPaymentMethod = new Map<string, BreakdownValue>();
  const byMonth = new Map<string, BreakdownValue>();
  let total = 0;

  for (const entry of filtered) {
    const space = spacesByKey.get(entry.spaceKey);
    if (!space) continue;
    total += entry.amount;
    increment(bySpace, space.id, space.name, entry.amount);

    const category = space.categories.find(
      (candidate) => candidate.id === entry.categoryId,
    );
    const categoryName = category?.name ?? "Unknown category";
    increment(
      byCategory,
      normalizeName(categoryName),
      normalizeDisplayName(categoryName),
      entry.amount,
    );

    const subcategory = entry.subcategoryId
      ? category?.subcategories.find(
          (candidate) => candidate.id === entry.subcategoryId,
        )
      : undefined;
    const subcategoryName = entry.subcategoryId
      ? (subcategory?.name ?? "Unknown subcategory")
      : "No subcategory";
    const categoryDisplay = normalizeDisplayName(categoryName);
    const subcategoryDisplay = normalizeDisplayName(subcategoryName);
    const subcategoryKey = `${normalizeName(categoryName)}\u0000${normalizeName(
      subcategoryName,
    )}`;
    const currentSubcategory = bySubcategory.get(subcategoryKey);
    if (currentSubcategory) {
      currentSubcategory.amount += entry.amount;
      currentSubcategory.count += 1;
    } else {
      bySubcategory.set(subcategoryKey, {
        name: `${categoryDisplay} / ${subcategoryDisplay}`,
        category: categoryDisplay,
        subcategory: subcategoryDisplay,
        amount: entry.amount,
        count: 1,
      });
    }

    const paidTo = normalizeDisplayName(entry.paidTo);
    increment(byPaidTo, normalizeName(paidTo), paidTo, entry.amount);
    const paymentMethod = entry.paymentMethod ?? "Not specified";
    increment(
      byPaymentMethod,
      normalizeName(paymentMethod),
      paymentMethod,
      entry.amount,
    );
    const month = entry.date.slice(0, 7);
    increment(byMonth, month, month, entry.amount);
  }

  const largestExpenses = filtered
    .map((entry) => {
      const space = spacesByKey.get(entry.spaceKey)!;
      return {
        id: entry.id,
        space_id: space.id,
        space_name: space.name,
        description: entry.description,
        paid_to: normalizeDisplayName(entry.paidTo),
        amount: entry.amount,
        date: entry.date,
      };
    })
    .sort(
      (left, right) =>
        right.amount - left.amount ||
        right.date.localeCompare(left.date) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 10);

  return {
    scope: input.scope,
    currency: input.currency,
    range: { from: input.dateFrom ?? null, to: input.dateTo ?? null },
    totals: {
      amount: total,
      count: filtered.length,
      average: filtered.length === 0 ? 0 : total / filtered.length,
    },
    by_space: sortedBreakdown(bySpace).map((value) => ({
      id:
        input.spaces.find((space) => space.name === value.name)?.id ??
        value.name,
      name: value.name,
      amount: value.amount,
      count: value.count,
    })),
    by_category: sortedBreakdown(byCategory),
    by_subcategory: [...bySubcategory.values()]
      .sort(
        (left, right) =>
          right.amount - left.amount || left.name.localeCompare(right.name),
      )
      .map(({ category, subcategory, amount, count }) => ({
        category,
        subcategory,
        amount,
        count,
      })),
    by_paid_to: sortedBreakdown(byPaidTo).slice(0, 10),
    by_payment_method: sortedBreakdown(byPaymentMethod),
    by_month: [...byMonth.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((value) => ({
        month: value.name,
        amount: value.amount,
        count: value.count,
      })),
    largest_expenses: largestExpenses,
  };
}
