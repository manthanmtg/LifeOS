import { describe, expect, it } from "vitest";
import {
  buildExpenseSpaceReport,
  createExpenseSpaceReportFilename,
} from "../report";

const space = {
  _id: "space-1",
  payload: {
    space_key: "space-key",
    name: "House Renovation",
    currency: "INR",
    number_format: "indian" as const,
    budget: { amount: 500000, cadence: "total" as const },
    categories: [
      {
        id: "materials",
        name: "Materials",
        is_active: true,
        subcategories: [
          { id: "flooring", name: "Flooring", is_active: true },
        ],
      },
    ],
  },
};

const entry = (id: string, date: string, amount: number, categoryId = "materials") => ({
  _id: id,
  payload: {
    space_key: "space-key",
    amount,
    currency: "INR",
    description: `${id} expense`,
    paid_to: "Acme Supplies",
    category_id: categoryId,
    subcategory_id: categoryId === "materials" ? "flooring" : undefined,
    payment_method: "UPI" as const,
    date,
    tags: [],
  },
});

describe("expense space report model", () => {
  it("includes the full ledger in newest-first order beyond a UI page", () => {
    const entries = Array.from({ length: 31 }, (_, index) =>
      entry(`entry-${index}`, `2026-08-${String(index + 1).padStart(2, "0")}`, index + 1),
    );

    const report = buildExpenseSpaceReport({
      space,
      entries,
      generatedAt: new Date("2026-10-02T00:00:00.000Z"),
    });

    expect(report.ledger).toHaveLength(31);
    expect(report.ledger[0]).toMatchObject({ id: "entry-30", amount: 31 });
    expect(report.metrics).toMatchObject({ count: 31, total: 496 });
  });

  it("uses historic taxonomy fallbacks and calculates category totals", () => {
    const orphanedEntry = entry(
      "orphan",
      "2026-08-01",
      125,
      "deleted-category",
    );
    orphanedEntry.payload.subcategory_id = "deleted-subcategory";
    const report = buildExpenseSpaceReport({
      space,
      entries: [orphanedEntry],
      generatedAt: new Date("2026-10-02T00:00:00.000Z"),
    });

    expect(report.ledger[0]).toMatchObject({
      category: "Unknown category",
      subcategory: "Unknown subcategory",
    });
    expect(report.categoryBreakdown).toEqual([
      expect.objectContaining({ name: "Unknown category", amount: 125, count: 1 }),
    ]);
  });

  it("formats Indian money and creates a safe filename", () => {
    const report = buildExpenseSpaceReport({
      space,
      entries: [entry("entry", "2026-08-01", 123456.75)],
      generatedAt: new Date("2026-10-02T00:00:00.000Z"),
    });

    expect(report.ledger[0].formattedAmount).toBe("₹1,23,457");
    expect(createExpenseSpaceReportFilename("House / Renovation", new Date("2026-10-02"))).toBe(
      "expense-space-house-renovation-2026-10-02.pdf",
    );
  });
});
