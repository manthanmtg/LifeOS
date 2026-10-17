import { describe, expect, it } from "vitest";

import {
  buildWarrantySummary,
  getCoverageStatus,
  summarizeWarrantyItem,
} from "../coverage";

describe("warranty coverage", () => {
  it("marks a coverage ending within thirty days as expiring", () => {
    expect(
      getCoverageStatus(
        {
          label: "Comprehensive",
          start_date: "2026-01-01",
          end_date: "2026-05-01",
        },
        "2026-04-01",
      ),
    ).toEqual({ status: "expiring", daysRemaining: 30 });
  });

  it("keeps incomplete coverage unknown instead of claiming it is active", () => {
    expect(
      getCoverageStatus(
        { label: "Motor", end_date: "2030-01-01" },
        "2026-04-01",
      ),
    ).toEqual({ status: "unknown", daysRemaining: null });
  });

  it("counts an item with two expiring coverages once and identifies the earliest coverage", () => {
    const item = {
      _id: "item-1",
      payload: {
        name: "Washer",
        ownership_status: "owned" as const,
        archived: false,
        coverages: [
          {
            id: "c-1",
            label: "Comprehensive",
            start_date: "2025-01-01",
            end_date: "2026-04-11",
          },
          {
            id: "c-2",
            label: "Motor",
            start_date: "2025-01-01",
            end_date: "2026-04-15",
          },
        ],
      },
    };

    expect(summarizeWarrantyItem(item, "2026-04-01").expiring).toBe(2);
    expect(buildWarrantySummary([item], "2026-04-01")).toEqual({
      tracked_items: 1,
      expiring_items: 1,
      next_expiry: {
        item_id: "item-1",
        item_name: "Washer",
        coverage_id: "c-1",
        coverage_label: "Comprehensive",
        end_date: "2026-04-11",
        days_remaining: 10,
      },
    });
  });
});
