import { describe, expect, it } from "vitest";
import { calculateExpenseSpaceAnalytics } from "../analytics";
import type {
  ExpenseSpaceAnalyticsEntry,
  ExpenseSpaceAnalyticsParent,
} from "../analytics";

const renovationKey = "11111111-1111-4111-8111-111111111111";
const petKey = "22222222-2222-4222-8222-222222222222";
const categoryId = "33333333-3333-4333-8333-333333333333";
const subcategoryId = "44444444-4444-4444-8444-444444444444";

const spaces: ExpenseSpaceAnalyticsParent[] = [
  {
    id: "507f1f77bcf86cd799439011",
    spaceKey: renovationKey,
    name: "House Renovation",
    currency: "INR",
    categories: [
      {
        id: categoryId,
        name: "Materials",
        is_active: true,
        subcategories: [
          {
            id: subcategoryId,
            name: "Flooring",
            is_active: true,
          },
        ],
      },
    ],
  },
  {
    id: "507f1f77bcf86cd799439012",
    spaceKey: petKey,
    name: "Pet Expenses",
    currency: "USD",
    categories: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: " materials ",
        is_active: false,
        subcategories: [],
      },
    ],
  },
];

const entries: ExpenseSpaceAnalyticsEntry[] = [
  {
    id: "entry-1",
    spaceKey: renovationKey,
    amount: 100,
    currency: "INR",
    description: "Tiles",
    paidTo: "Acme   Ltd",
    categoryId,
    subcategoryId,
    paymentMethod: "UPI",
    date: "2026-08-01",
  },
  {
    id: "entry-2",
    spaceKey: renovationKey,
    amount: 300,
    currency: "INR",
    description: "Cement",
    paidTo: " acme ltd ",
    categoryId,
    paymentMethod: undefined,
    date: "2026-08-31",
  },
  {
    id: "entry-3",
    spaceKey: renovationKey,
    amount: 50,
    currency: "INR",
    description: "Unknown fitting",
    paidTo: "Different Vendor",
    categoryId: "66666666-6666-4666-8666-666666666666",
    subcategoryId: "77777777-7777-4777-8777-777777777777",
    paymentMethod: "Cash",
    date: "2026-09-01",
  },
  {
    id: "entry-4",
    spaceKey: petKey,
    amount: 999,
    currency: "USD",
    description: "Vet",
    paidTo: "Clinic",
    categoryId: "55555555-5555-4555-8555-555555555555",
    paymentMethod: "Credit Card",
    date: "2026-08-15",
  },
];

describe("expense-space analytics", () => {
  it("calculates per-space totals, inclusive date bounds, and deterministic groups", () => {
    const result = calculateExpenseSpaceAnalytics({
      scope: "space",
      currency: "INR",
      spaceId: spaces[0].id,
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      spaces,
      entries,
    });

    expect(result.totals).toEqual({ amount: 400, count: 2, average: 200 });
    expect(result.by_space).toEqual([
      {
        id: spaces[0].id,
        name: "House Renovation",
        amount: 400,
        count: 2,
      },
    ]);
    expect(result.by_category).toEqual([
      { name: "Materials", amount: 400, count: 2 },
    ]);
    expect(result.by_subcategory).toEqual([
      {
        category: "Materials",
        subcategory: "No subcategory",
        amount: 300,
        count: 1,
      },
      {
        category: "Materials",
        subcategory: "Flooring",
        amount: 100,
        count: 1,
      },
    ]);
    expect(result.by_paid_to).toEqual([
      { name: "Acme Ltd", amount: 400, count: 2 },
    ]);
    expect(result.by_payment_method).toEqual([
      { name: "Not specified", amount: 300, count: 1 },
      { name: "UPI", amount: 100, count: 1 },
    ]);
    expect(result.by_month).toEqual([
      { month: "2026-08", amount: 400, count: 2 },
    ]);
    expect(result.largest_expenses.map((entry) => entry.id)).toEqual([
      "entry-2",
      "entry-1",
    ]);
  });

  it("never mixes currencies in all-space analytics", () => {
    const result = calculateExpenseSpaceAnalytics({
      scope: "all",
      currency: "INR",
      spaces,
      entries,
    });

    expect(result.totals).toEqual({ amount: 450, count: 3, average: 150 });
    expect(result.by_space).toHaveLength(1);
    expect(result.by_space[0].name).toBe("House Renovation");
    expect(result.largest_expenses).toHaveLength(3);
  });

  it("keeps unknown taxonomy spend visible instead of dropping it", () => {
    const result = calculateExpenseSpaceAnalytics({
      scope: "all",
      currency: "INR",
      spaces,
      entries,
    });

    expect(result.by_category).toContainEqual({
      name: "Unknown category",
      amount: 50,
      count: 1,
    });
    expect(result.by_subcategory).toContainEqual({
      category: "Unknown category",
      subcategory: "Unknown subcategory",
      amount: 50,
      count: 1,
    });
  });

  it("merges category names only by casing and whitespace across spaces", () => {
    const sameCurrencyEntries: ExpenseSpaceAnalyticsEntry[] = [
      entries[0],
      { ...entries[3], currency: "INR" },
    ];
    const sameCurrencySpaces = [spaces[0], { ...spaces[1], currency: "INR" }];

    const result = calculateExpenseSpaceAnalytics({
      scope: "all",
      currency: "INR",
      spaces: sameCurrencySpaces,
      entries: sameCurrencyEntries,
    });

    expect(result.by_category).toEqual([
      { name: "Materials", amount: 1099, count: 2 },
    ]);
  });

  it("sorts equal monetary groups by label and caps payees and largest expenses", () => {
    const manyEntries: ExpenseSpaceAnalyticsEntry[] = Array.from(
      { length: 12 },
      (_, index) => ({
        ...entries[0],
        id: `entry-${index.toString().padStart(2, "0")}`,
        amount: 10,
        paidTo: `Vendor ${String.fromCharCode(90 - index)}`,
        description: `Expense ${index}`,
      }),
    );

    const result = calculateExpenseSpaceAnalytics({
      scope: "space",
      currency: "INR",
      spaceId: spaces[0].id,
      spaces,
      entries: manyEntries,
    });

    expect(result.by_paid_to).toHaveLength(10);
    expect(result.by_paid_to[0].name).toBe("Vendor O");
    expect(result.largest_expenses).toHaveLength(10);
    expect(result.largest_expenses[0].id).toBe("entry-00");
  });

  it("returns a complete empty result", () => {
    const result = calculateExpenseSpaceAnalytics({
      scope: "all",
      currency: "EUR",
      spaces,
      entries,
    });

    expect(result).toMatchObject({
      scope: "all",
      currency: "EUR",
      range: { from: null, to: null },
      totals: { amount: 0, count: 0, average: 0 },
      by_space: [],
      by_category: [],
      by_subcategory: [],
      by_paid_to: [],
      by_payment_method: [],
      by_month: [],
      largest_expenses: [],
    });
  });
});
