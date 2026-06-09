import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCropHistorySummary } from "../insights";
import { evaluateAllCalculatedFields } from "../FormulaEngine";

vi.mock("../FormulaEngine", () => ({
  evaluateAllCalculatedFields: vi.fn(),
}));

describe("getCropHistorySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseSettings = {
    crops: [],
    sources: [{ id: "area1", name: "Area 1", type: "field" }],
  } as never;

  it("returns default summary when crops are empty", () => {
    const result = getCropHistorySummary([], baseSettings);
    expect(result).toEqual({
      bestCropName: "",
      latestRevenue: 0,
      prevRevenue: 0,
      latestPeriod: "",
      prevPeriod: "",
      totalCrops: 0,
      totalPeriods: 0,
    });
  });

  it("returns default summary when sources are empty", () => {
    const settings = { crops: [{ id: "crop1", name: "Crop 1" }], sources: [] } as never;
    const result = getCropHistorySummary([], settings);
    expect(result).toEqual({
      bestCropName: "",
      latestRevenue: 0,
      prevRevenue: 0,
      latestPeriod: "",
      prevPeriod: "",
      totalCrops: 0,
      totalPeriods: 0,
    });
  });

  it("returns empty stats if no records match any crop", () => {
    const settings = {
      crops: [{ id: "crop1", name: "Crop 1", calculatedFields: [] }],
      sources: [{ id: "area1" }],
    } as never;
    const records = [{ payload: { crop_id: "other", schedule_period: "2023 Q1" } }] as never;

    const result = getCropHistorySummary(records, settings);
    expect(result.bestCropName).toBe("");
    expect(result.totalCrops).toBe(1);
    expect(result.totalPeriods).toBe(1); // 1 period from records total
  });

  it("calculates revenue using configured revenueFieldId and identifies best crop", () => {
    const settings = {
      crops: [
        {
          id: "crop1",
          name: "Crop 1",
          analyticsConfig: { revenueFieldId: "rev1" },
          calculatedFields: [{ id: "rev1", format: "currency" }],
          sourceFields: [],
          summaryFields: [],
        },
        {
          id: "crop2",
          name: "Crop 2",
          analyticsConfig: { revenueFieldId: "rev2" },
          calculatedFields: [{ id: "rev2", format: "currency" }],
          sourceFields: [],
          summaryFields: [],
        }
      ],
      sources: [{ id: "area1" }],
    } as never;

    const records = [
      { payload: { crop_id: "crop1", schedule_period: "2023 Q1" } },
      { payload: { crop_id: "crop2", schedule_period: "2023 Q1" } },
    ] as never;

    (evaluateAllCalculatedFields as import("vitest").Mock)
      .mockReturnValueOnce({ rev1: 100 }) // crop1
      .mockReturnValueOnce({ rev2: 200 }); // crop2

    const result = getCropHistorySummary(records, settings);

    expect(result.bestCropName).toBe("Crop 2");
    expect(result.latestRevenue).toBe(200);
    expect(result.latestPeriod).toBe("2023 Q1");
    expect(result.totalCrops).toBe(2);
    expect(result.totalPeriods).toBe(1);
  });

  it("falls back to the first currency field if revenueFieldId is not configured", () => {
    const settings = {
      crops: [
        {
          id: "crop1",
          name: "Crop 1",
          calculatedFields: [
            { id: "other", format: "number" },
            { id: "fallbackRev", format: "currency" },
          ],
          sourceFields: [],
          summaryFields: [],
        },
      ],
      sources: [{ id: "area1" }],
    } as never;

    const records = [{ payload: { crop_id: "crop1", schedule_period: "2023 Q1" } }] as never;

    (evaluateAllCalculatedFields as import("vitest").Mock).mockReturnValue({ fallbackRev: 500 });

    const result = getCropHistorySummary(records, settings);

    expect(result.bestCropName).toBe("Crop 1");
    expect(result.latestRevenue).toBe(500);
  });

  it("skips crops with no valid revenue field", () => {
    const settings = {
      crops: [
        {
          id: "crop1",
          name: "Crop 1",
          calculatedFields: [{ id: "other", format: "number" }],
          sourceFields: [],
          summaryFields: [],
        },
      ],
      sources: [{ id: "area1" }],
    } as never;

    const records = [{ payload: { crop_id: "crop1", schedule_period: "2023 Q1" } }] as never;

    const result = getCropHistorySummary(records, settings);
    expect(result.bestCropName).toBe(""); // Skipped
  });

  it("calculates previous revenue when multiple periods exist", () => {
    const settings = {
      crops: [
        {
          id: "crop1",
          name: "Crop 1",
          analyticsConfig: { revenueFieldId: "rev1" },
          calculatedFields: [{ id: "rev1", format: "currency" }],
          sourceFields: [],
          summaryFields: [],
        },
      ],
      sources: [{ id: "area1" }],
    } as never;

    const records = [
      { payload: { crop_id: "crop1", schedule_period: "2023 Q1" } },
      { payload: { crop_id: "crop1", schedule_period: "2023 Q2" } },
      { payload: { crop_id: "crop1", schedule_period: "2023 Q3" } },
    ] as never; // periods will be sorted alphabetically: Q1, Q2, Q3

    (evaluateAllCalculatedFields as import("vitest").Mock)
      .mockReturnValueOnce({ rev1: 300 }) // latest period Q3
      .mockReturnValueOnce({ rev1: 250 }); // prev period Q2

    const result = getCropHistorySummary(records, settings);

    expect(result.bestCropName).toBe("Crop 1");
    expect(result.latestRevenue).toBe(300);
    expect(result.latestPeriod).toBe("2023 Q3");
    expect(result.prevRevenue).toBe(250);
    expect(result.prevPeriod).toBe("2023 Q2");
    expect(result.totalPeriods).toBe(3);
  });

  it("handles missing previous period gracefully", () => {
    const settings = {
      crops: [
        {
          id: "crop1",
          name: "Crop 1",
          analyticsConfig: { revenueFieldId: "rev1" },
          calculatedFields: [{ id: "rev1", format: "currency" }],
          sourceFields: [],
          summaryFields: [],
        },
      ],
      sources: [{ id: "area1" }],
    } as never;

    const records = [
      { payload: { crop_id: "crop1", schedule_period: "2023 Q1" } },
    ] as never;

    (evaluateAllCalculatedFields as import("vitest").Mock).mockReturnValue({ rev1: 150 });

    const result = getCropHistorySummary(records, settings);

    expect(result.bestCropName).toBe("Crop 1");
    expect(result.latestRevenue).toBe(150);
    expect(result.prevRevenue).toBe(0);
    expect(result.prevPeriod).toBe("");
  });
});