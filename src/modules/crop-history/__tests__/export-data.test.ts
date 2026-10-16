import { describe, expect, it } from "vitest";
import { buildCropExportReport } from "../lib/export-data";
import type { CropExportRecord } from "../lib/export-data";

const crop = {
  id: "coffee",
  name: "Coffee",
  scheduleType: "yearly" as const,
  sourceFields: [
    { id: "weight", name: "Weight", type: "number" as const, unit: "kg" },
  ],
  summaryFields: [
    { id: "price", name: "Price", type: "number" as const, unit: "₹/kg" },
  ],
  calculatedFields: [
    {
      id: "income",
      name: "Income",
      formula: "SUM(weight) * price",
      format: "currency" as const,
    },
    {
      id: "quality",
      name: "Quality",
      formula: "25",
      format: "percentage" as const,
    },
  ],
  periodOrder: ["2025", "2024"],
};

const records: CropExportRecord[] = [
  {
    _id: "one",
    payload: {
      crop_id: "coffee",
      schedule_period: "2024",
      source_data: { north: { weight: 0 }, south: { weight: 5 } },
      summary_data: { price: 10 },
      notes: "Dry season",
    },
  },
  {
    _id: "two",
    payload: {
      crop_id: "coffee",
      schedule_period: "2025",
      source_data: { north: { weight: 8 } },
      summary_data: { price: 12 },
      notes: "Wet season",
    },
  },
];

describe("buildCropExportReport", () => {
  it("preserves configured period order and creates source, total, summary, calculated, and notes rows", () => {
    const report = buildCropExportReport({
      crop,
      areas: [
        { id: "north", name: "North" },
        { id: "south", name: "South" },
      ],
      records,
      orderedPeriods: crop.periodOrder,
      options: { periods: ["2024", "2025"], includeNotes: true },
      now: new Date("2026-10-16T10:00:00.000Z"),
      timeZone: "UTC",
    });

    expect(report.periods).toEqual(["2025", "2024"]);
    expect(
      report.rows.map((row) => [row.section, row.group, row.label, row.values]),
    ).toEqual([
      ["area", "North", "Weight", [8, 0]],
      ["area", "South", "Weight", [null, 5]],
      ["total", "Totals", "Weight", [8, 5]],
      ["summary", "Period inputs", "Price", [12, 10]],
      ["calculated", "Calculated", "Income", [96, 50]],
      ["calculated", "Calculated", "Quality", [25, 25]],
      ["notes", "Notes", "Notes", ["Wet season", "Dry season"]],
    ]);
  });

  it("does not add the notes row when notes are excluded", () => {
    const report = buildCropExportReport({
      crop,
      areas: [{ id: "north", name: "North" }],
      records,
      orderedPeriods: ["2024", "2025"],
      options: { periods: ["2024"], includeNotes: false },
      now: new Date("2026-10-16T10:00:00.000Z"),
      timeZone: "UTC",
    });

    expect(report.rows.some((row) => row.section === "notes")).toBe(false);
  });
});
