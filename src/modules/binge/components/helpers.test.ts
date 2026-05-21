import { describe, it, expect } from "vitest";
import { buildBingeStats, formatRelativeDate } from "./helpers";
import type { BingeItem } from "../types";

const makeItem = (overrides: Partial<BingeItem>): BingeItem => {
  return {
    _id: "item-id",
    created_at: "2026-06-15T00:00:00Z",
    payload: {
      title: "Default Item",
      type: "movie",
      status: "to_watch",
      rewatched: false,
      rewatch_count: 0,
      ...overrides.payload,
    },
    ...overrides,
  };
};

describe("formatRelativeDate", () => {
  it("returns Today for same day", () => {
    const now = Date.UTC(2026, 5, 15);
    expect(formatRelativeDate("2026-06-15T00:00:00.000Z", now)).toBe("Today");
  });

  it("returns Yesterday for one day ago", () => {
    const now = Date.UTC(2026, 5, 15);
    expect(formatRelativeDate("2026-06-14T00:00:00.000Z", now)).toBe("Yesterday");
  });

  it("returns week label for 3 days ago", () => {
    const now = Date.UTC(2026, 5, 15);
    expect(formatRelativeDate("2026-06-12T00:00:00.000Z", now)).toBe("3d ago");
  });

  it("returns month label for mid-range history", () => {
    const now = Date.UTC(2026, 5, 15);
    expect(formatRelativeDate("2025-11-15T00:00:00.000Z", now)).toBe("7mo ago");
  });

  it("returns year label for old history", () => {
    const now = Date.UTC(2026, 5, 15);
    expect(formatRelativeDate("2024-06-15T00:00:00.000Z", now)).toBe("2y ago");
  });

  it("returns em dash for invalid dates", () => {
    expect(formatRelativeDate("not-a-date", Date.UTC(2026, 5, 15))).toBe("—");
  });
});

describe("buildBingeStats", () => {
  it("returns zeros for empty item lists", () => {
    const stats = buildBingeStats([], null);

    expect(stats.total).toBe(0);
    expect(stats.watching).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.toWatch).toBe(0);
    expect(stats.dropped).toBe(0);
    expect(stats.avgRating).toBe(0);
    expect(stats.movies).toBe(0);
    expect(stats.series).toBe(0);
    expect(stats.anime).toBe(0);
    expect(stats.docs).toBe(0);
    expect(stats.monthlyData).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stats.completionData).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("returns zero totals for missing month anchor", () => {
    const items: BingeItem[] = [
      makeItem({
        payload: {
          title: "Test",
          type: "movie",
          status: "completed",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
    ];

    const stats = buildBingeStats(items, null);

    expect(stats.total).toBe(1);
    expect(stats.monthlyData.every((value) => value === 0)).toBe(true);
    expect(stats.completionData.every((value) => value === 0)).toBe(true);
  });

  it("counts by status and content type", () => {
    const items: BingeItem[] = [
      makeItem({
        payload: {
          title: "One",
          type: "movie",
          status: "watching",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        payload: {
          title: "Two",
          type: "series",
          status: "completed",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        payload: {
          title: "Three",
          type: "documentary",
          status: "to_watch",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        payload: {
          title: "Four",
          type: "anime",
          status: "dropped",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
    ];

    const stats = buildBingeStats(items, null);

    expect(stats.total).toBe(4);
    expect(stats.watching).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.toWatch).toBe(1);
    expect(stats.dropped).toBe(1);
    expect(stats.movies).toBe(1);
    expect(stats.series).toBe(1);
    expect(stats.anime).toBe(1);
    expect(stats.docs).toBe(1);
  });

  it("computes average rating from rated items only", () => {
    const items: BingeItem[] = [
      makeItem({
        payload: {
          title: "High",
          type: "movie",
          status: "completed",
          rating: 8,
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        payload: {
          title: "Low",
          type: "movie",
          status: "completed",
          rating: 4,
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        payload: {
          title: "Unrated",
          type: "movie",
          status: "completed",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
    ];

    const stats = buildBingeStats(items, null);

    expect(stats.avgRating).toBe(6);
  });

  it("buckets monthly totals into the 6 month window", () => {
    const monthAnchor = new Date("2026-06-15T00:00:00.000Z");
    const items: BingeItem[] = [
      makeItem({
        created_at: "2026-06-10T00:00:00.000Z",
        payload: {
          title: "CurrentMonth",
          type: "movie",
          status: "completed",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        created_at: "2026-05-20T00:00:00.000Z",
        payload: {
          title: "LastMonth",
          type: "series",
          status: "watching",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
      makeItem({
        created_at: "2026-02-11T00:00:00.000Z",
        payload: {
          title: "OldMonth",
          type: "anime",
          status: "completed",
          rewatch_count: 0,
          rewatched: false,
        },
      }),
    ];

    const stats = buildBingeStats(items, monthAnchor);

    expect(stats.monthlyData.reduce((sum, value) => sum + value, 0)).toBe(3);
    expect(stats.completionData.reduce((sum, value) => sum + value, 0)).toBe(2);
    // Current month (index 5 in loop order) should include one completed item.
    expect(stats.completionData[5]).toBe(1);
  });
});
