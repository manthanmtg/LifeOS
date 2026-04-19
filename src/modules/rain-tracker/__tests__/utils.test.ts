import { describe, expect, it } from "vitest";
import {
  buildRainAnalytics,
  getVisibleRainEntries,
  matchesRainFilters,
} from "../utils";
import type { RainEntry, RainFilters } from "../types";

const filters: RainFilters = {
  amountMin: "",
  amountMax: "",
  notes: "",
};

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
        { amountMin: "1", amountMax: "2", notes: "steady" },
        "cm",
      ),
    ).toBe(true);

    expect(
      matchesRainFilters(
        entries[1],
        { amountMin: "1", amountMax: "2", notes: "steady" },
        "cm",
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
  });
});
