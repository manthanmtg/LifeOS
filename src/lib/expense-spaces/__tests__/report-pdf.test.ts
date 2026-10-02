import { describe, expect, it } from "vitest";
import { buildExpenseSpaceReport } from "../report";
import { renderExpenseSpaceReportPdf } from "../report-pdf";

const report = buildExpenseSpaceReport({
  space: {
    _id: "space-1",
    payload: {
      space_key: "space-key",
      name: "House Renovation",
      currency: "INR",
      number_format: "indian",
      categories: [],
    },
  },
  entries: [
    {
      _id: "entry-1",
      payload: {
        amount: 1250,
        currency: "INR",
        description: "Floor tiles",
        paid_to: "Acme",
        category_id: "missing",
        date: "2026-08-01",
      },
    },
  ],
  generatedAt: new Date("2026-10-02T00:00:00.000Z"),
});

describe("expense space report PDF", () => {
  it("creates a PDF with the ledger before category analysis", () => {
    const bytes = renderExpenseSpaceReportPdf(report);

    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const text = Buffer.from(bytes).toString("latin1");
    expect(text.indexOf("Expense ledger")).toBeLessThan(
      text.indexOf("Category breakdown"),
    );
  });

  it("creates a valid PDF for an empty ledger", () => {
    expect(() => renderExpenseSpaceReportPdf({ ...report, ledger: [] })).not.toThrow();
  });
});
