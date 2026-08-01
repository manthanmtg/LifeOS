import { describe, expect, it } from "vitest";

import { DEFAULT_RECURRING_NOTIFICATION_OFFSETS } from "../contracts";
import { normalizeNotificationOffsetsDays } from "../preferences";

describe("notification preference helpers", () => {
  it("returns sorted unique integer offsets in range", () => {
    expect(
      normalizeNotificationOffsetsDays([7, 1, 1, 0, 366, -1, 2.5, 3]),
    ).toEqual([0, 1, 3, 7]);
  });

  it("uses the provided fallback when offsets are missing", () => {
    expect(normalizeNotificationOffsetsDays(undefined, [2, 1])).toEqual([1, 2]);
  });

  it("falls back to the shared default when no valid offset remains", () => {
    expect(normalizeNotificationOffsetsDays(["soon"], [])).toEqual(
      DEFAULT_RECURRING_NOTIFICATION_OFFSETS,
    );
  });
});
