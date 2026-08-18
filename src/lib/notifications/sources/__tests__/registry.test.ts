import { describe, expect, it } from "vitest";

import { notificationSources } from "../registry";

describe("notification source registry", () => {
  it("registers each source exactly once", () => {
    expect(notificationSources.map((source) => source.moduleType)).toEqual([
      "recurring_expense",
      "person",
      "health_profile",
    ]);
  });
});
