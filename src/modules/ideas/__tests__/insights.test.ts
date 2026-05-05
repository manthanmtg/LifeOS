import { describe, expect, it } from "vitest";

import { getIdeaMetrics } from "../insights";
import type { IdeaRecord } from "../shared";

function makeIdea(
  id: string,
  status: "raw" | "exploring" | "archived",
  priority: "high" | "medium" | "low",
): IdeaRecord {
  return {
    _id: id,
    created_at: "2026-03-01T09:00:00.000Z",
    updated_at: "2026-03-02T10:15:00.000Z",
    payload: {
      title: id,
      status,
      priority,
      tags: [],
    },
  };
}

describe("ideas insights", () => {
  it("counts every raw or exploring idea as needing review", () => {
    const metrics = getIdeaMetrics([
      makeIdea("raw-high", "raw", "high"),
      makeIdea("raw-medium", "raw", "medium"),
      makeIdea("exploring-low", "exploring", "low"),
      makeIdea("archived-high", "archived", "high"),
    ]);

    expect(metrics.reviewCount).toBe(3);
  });
});
