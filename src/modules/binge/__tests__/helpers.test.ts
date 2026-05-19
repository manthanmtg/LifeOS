import { describe, expect, it } from "vitest";
import { buildBingeStats, formatRelativeDate } from "../components/helpers";
import type { BingeItem } from "../types";

const makeItem = (
  id: string,
  createdAt: string,
  payload: Partial<BingeItem["payload"]> = {},
): BingeItem => ({
  _id: id,
  created_at: createdAt,
  payload: {
    title: id,
    type: "movie",
    status: "to_watch",
    rewatched: false,
    rewatch_count: 0,
    ...payload,
  },
});

describe("binge helpers", () => {
  it("formats relative dates against an explicit clock value", () => {
    const nowMs = new Date("2026-05-19T12:00:00.000Z").getTime();

    expect(formatRelativeDate("2026-05-19T09:00:00.000Z", nowMs)).toBe("Today");
    expect(formatRelativeDate("2026-05-18T12:00:00.000Z", nowMs)).toBe(
      "Yesterday",
    );
    expect(formatRelativeDate("2026-05-12T12:00:00.000Z", nowMs)).toBe(
      "1w ago",
    );
  });

  it("builds monthly stats from an explicit month anchor", () => {
    const stats = buildBingeStats(
      [
        makeItem("completed-this-month", "2026-05-05T00:00:00.000Z", {
          status: "completed",
          rating: 8,
        }),
        makeItem("watching-last-month", "2026-04-10T00:00:00.000Z", {
          status: "watching",
          type: "series",
        }),
        makeItem("older-doc", "2026-01-15T00:00:00.000Z", {
          type: "documentary",
        }),
      ],
      new Date("2026-05-19T12:00:00.000Z"),
    );

    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.watching).toBe(1);
    expect(stats.avgRating).toBe(8);
    expect(stats.series).toBe(1);
    expect(stats.docs).toBe(1);
    expect(stats.monthlyData).toEqual([0, 1, 0, 0, 1, 1]);
    expect(stats.completionData).toEqual([0, 0, 0, 0, 0, 1]);
  });
});
