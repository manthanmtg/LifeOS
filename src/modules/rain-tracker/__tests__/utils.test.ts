import { describe, expect, it } from "vitest";
import {
  buildRainAreaPortfolioSummary,
  buildRainAnalytics,
  coerceRainSource,
  getVisibleRainEntries,
  matchesRainFilters,
} from "../utils";
import type { RainArea, RainEntry, RainFilters } from "../types";

const filters: RainFilters = {
  amountMin: "",
  amountMax: "",
  notes: "",
  preset: "all",
};

const areas: RainArea[] = [
  {
    _id: "area-1",
    created_at: "2026-01-01T00:00:00.000Z",
    payload: {
      name: "North Field",
      is_active: true,
    },
  },
  {
    _id: "area-2",
    created_at: "2026-01-01T00:00:00.000Z",
    payload: {
      name: "South Plot",
      is_active: false,
    },
  },
];

const entries: RainEntry[] = [
  {
    _id: "entry-1",
    created_at: "2026-04-10T09:00:00.000Z",
    payload: {
      area_id: "area-1",
      rainfall_amount: 12,
      rainfall_unit: "mm",
      date: "2026-04-10T09:00:00.000Z",
      notes: "steady rain",
      source: "manual",
    },
  },
  {
    _id: "entry-2",
    created_at: "2026-04-02T07:00:00.000Z",
    payload: {
      area_id: "area-1",
      rainfall_amount: 8,
      rainfall_unit: "mm",
      date: "2026-04-02T07:00:00.000Z",
      notes: "storm front",
      source: "sensor",
    },
  },
  {
    _id: "entry-3",
    created_at: "2026-03-05T07:00:00.000Z",
    payload: {
      area_id: "area-1",
      rainfall_amount: 20,
      rainfall_unit: "mm",
      date: "2026-03-05T07:00:00.000Z",
      notes: "heavy rain",
      source: "manual",
    },
  },
];

describe("rain tracker utils", () => {
  it("filters by amount and notes in the selected display unit", () => {
    expect(
      matchesRainFilters(
        entries[0],
        { amountMin: "1", amountMax: "2", notes: "steady", preset: "all" },
        "cm",
      ),
    ).toBe(true);

    expect(
      matchesRainFilters(
        entries[1],
        { amountMin: "1", amountMax: "2", notes: "steady", preset: "all" },
        "cm",
      ),
    ).toBe(false);
  });

  it("supports quick presets for recent and heavy rainfall", () => {
    expect(
      matchesRainFilters(
        entries[0],
        { amountMin: "", amountMax: "", notes: "", preset: "last30" },
        "mm",
        new Date("2026-04-19T12:00:00.000Z"),
      ),
    ).toBe(true);

    expect(
      matchesRainFilters(
        entries[1],
        { amountMin: "", amountMax: "", notes: "", preset: "heavy" },
        "mm",
      ),
    ).toBe(true);

    expect(
      matchesRainFilters(
        entries[0],
        { amountMin: "", amountMax: "", notes: "", preset: "sensor" },
        "mm",
      ),
    ).toBe(false);
  });

  it("returns visible entries sorted newest first", () => {
    const visible = getVisibleRainEntries(
      entries,
      "area-1",
      filters,
      "mm",
      "storm",
    );

    expect(visible).toHaveLength(1);
    expect(visible[0]?.entry._id).toBe("entry-2");
    expect(visible[0]?.displayAmount).toBe("8.00");
  });

  it("normalizes missing source labels for visible entries", () => {
    const visible = getVisibleRainEntries(
      [
        {
          _id: "legacy-entry",
          created_at: "2026-04-20T07:00:00.000Z",
          payload: {
            area_id: "area-1",
            rainfall_amount: 4,
            rainfall_unit: "mm",
            date: "2026-04-20T07:00:00.000Z",
          },
        },
      ],
      "area-1",
      filters,
      "mm",
      "",
    );

    expect(visible[0]).toMatchObject({
      sourceLabel: "Manual",
    });
  });

  it("builds analytics and insights for the selected area", () => {
    const analytics = buildRainAnalytics(
      entries,
      "area-1",
      "mm",
      new Date("2026-04-19T12:00:00.000Z"),
    );

    expect(analytics.total).toBe(40);
    expect(analytics.last7).toBe(0);
    expect(analytics.last30).toBe(20);
    expect(analytics.prevLast30).toBe(20);
    expect(analytics.maxSingle).toBe(20);
    expect(analytics.rainyDays).toBe(3);
    expect(analytics.latestEntry?.value).toBe("12.00 mm");
    expect(analytics.wettestMonth?.value).toBe("20.00 mm");
    expect(analytics.wettestDay?.value).toBe("20.00 mm");
    expect(analytics.averageRainyDay?.value).toBe("13.33 mm");
    expect(analytics.drySpell?.value).toBe("9 days");
  });

  it("builds an area portfolio summary for the sidebar", () => {
    const summary = buildRainAreaPortfolioSummary(
      areas,
      entries,
      "mm",
      new Date("2026-04-19T12:00:00.000Z"),
    );

    expect(summary.totalAreas).toBe(2);
    expect(summary.activeAreas).toBe(1);
    expect(summary.last7Total).toBe(0);
    expect(summary.wettestArea?.value).toBe("North Field");
    expect(summary.staleAreaCount).toBe(2);
  });

  it("coerces unknown rain entry sources to manual", () => {
    expect(coerceRainSource("sensor")).toBe("sensor");
    expect(coerceRainSource("imported")).toBe("imported");
    expect(coerceRainSource("unexpected")).toBe("manual");
    expect(coerceRainSource(undefined)).toBe("manual");
  });
});
