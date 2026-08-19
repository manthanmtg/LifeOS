import { describe, expect, it } from "vitest";
import {
  currencyChangeError,
  escapeRegex,
  findTaxonomyRemovalConflicts,
  normalizeDisplayName,
  normalizeName,
  parseExpenseEntryFilters,
  validateTaxonomySelection,
} from "../validation";
import type { ExpenseSpaceCategory } from "@/modules/expense-spaces/types";

const categoryId = "22222222-2222-4222-8222-222222222222";
const archivedCategoryId = "33333333-3333-4333-8333-333333333333";
const subcategoryId = "44444444-4444-4444-8444-444444444444";
const archivedSubcategoryId = "55555555-5555-4555-8555-555555555555";

const categories: ExpenseSpaceCategory[] = [
  {
    id: categoryId,
    name: "Home Repairs",
    is_active: true,
    subcategories: [
      { id: subcategoryId, name: "Flooring", is_active: true },
      {
        id: archivedSubcategoryId,
        name: "Old fixtures",
        is_active: false,
      },
    ],
  },
  {
    id: archivedCategoryId,
    name: "Planning",
    is_active: false,
    subcategories: [],
  },
];

describe("expense-space validation", () => {
  it("normalizes whitespace and casing for identity without altering display casing", () => {
    expect(normalizeName("  House   RENOVATION  ")).toBe("house renovation");
    expect(normalizeDisplayName("  House   RENOVATION  ")).toBe(
      "House RENOVATION",
    );
  });

  it("escapes regex metacharacters and rejects unbounded search text", () => {
    expect(escapeRegex("ACME (North) + tax?")).toBe(
      "ACME \\(North\\) \\+ tax\\?",
    );
    expect(() => escapeRegex("x".repeat(101))).toThrow(/100 characters/);
  });

  it("requires a subcategory to belong to the selected category", () => {
    const result = validateTaxonomySelection(
      categories,
      archivedCategoryId,
      subcategoryId,
    );

    expect(result).toEqual({
      success: false,
      error: "Subcategory does not belong to the selected category",
    });
  });

  it("rejects archived taxonomy for new entries but allows historical edits", () => {
    expect(
      validateTaxonomySelection(categories, categoryId, archivedSubcategoryId),
    ).toEqual({
      success: false,
      error: "Selected subcategory is archived",
    });

    expect(
      validateTaxonomySelection(categories, categoryId, archivedSubcategoryId, {
        allowInactive: true,
      }),
    ).toMatchObject({ success: true });
  });

  it("reports only used taxonomy values removed by a parent update", () => {
    const nextCategories = categories.map((category) =>
      category.id === categoryId
        ? { ...category, subcategories: [] }
        : category,
    );

    expect(
      findTaxonomyRemovalConflicts(categories, nextCategories, {
        categoryIds: new Set([categoryId]),
        subcategoryIds: new Set([subcategoryId]),
      }),
    ).toEqual([
      "Used subcategory Flooring cannot be deleted; archive it instead",
    ]);
  });

  it("locks currency only after the first entry", () => {
    expect(currencyChangeError("USD", "INR", 0)).toBeNull();
    expect(currencyChangeError("USD", "INR", 1)).toBe(
      "Currency cannot be changed after expenses have been added",
    );
    expect(currencyChangeError("USD", "USD", 12)).toBeNull();
  });

  it("parses inclusive ledger filters with safe defaults", () => {
    const filters = parseExpenseEntryFilters(
      new URLSearchParams({
        search: "  ACME (North) ",
        date_from: "2026-01-01",
        date_to: "2026-12-31",
        paid_to: " Acme   Ltd ",
        page: "2",
        page_size: "100",
        sort: "amount-desc",
      }),
    );

    expect(filters).toEqual({
      page: 2,
      pageSize: 100,
      search: "ACME (North)",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      paidTo: "Acme Ltd",
      sort: "amount-desc",
    });

    expect(parseExpenseEntryFilters(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 50,
      sort: "date-desc",
    });
  });

  it("rejects impossible, reversed, oversized, and unknown query values", () => {
    expect(() =>
      parseExpenseEntryFilters(
        new URLSearchParams({ date_from: "2026-02-30" }),
      ),
    ).toThrow(/date_from/);
    expect(() =>
      parseExpenseEntryFilters(
        new URLSearchParams({
          date_from: "2026-08-20",
          date_to: "2026-08-19",
        }),
      ),
    ).toThrow(/date range/);
    expect(() =>
      parseExpenseEntryFilters(new URLSearchParams({ page_size: "101" })),
    ).toThrow(/page_size/);
    expect(() =>
      parseExpenseEntryFilters(new URLSearchParams({ sort: "newest" })),
    ).toThrow(/sort/);
    expect(() =>
      parseExpenseEntryFilters(
        new URLSearchParams({ payment_method: "Crypto" }),
      ),
    ).toThrow(/payment_method/);
  });
});
