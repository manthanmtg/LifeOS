import { describe, expect, it } from "vitest";

import { DEFAULT_RECURRING_NOTIFICATION_OFFSETS } from "../contracts";
import {
  buildRecurringRenewalNotificationPreferences,
  getRecurringRenewalOffsets,
  normalizeNotificationOffsetsDays,
  resolveRecurringExpenseNotificationPreferences,
} from "../recurring-preferences";

describe("resolveRecurringExpenseNotificationPreferences", () => {
  it("returns explicit valid notification preferences", () => {
    const resolved = resolveRecurringExpenseNotificationPreferences(
      {
        notifications: {
          enabled: true,
          rules: [{ event: "renewal", offsets_days: [7, 1] }],
        },
      },
      [3],
    );

    expect(resolved).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [1, 7] }],
    });
  });

  it("falls back to a default renewal rule when notifications are missing", () => {
    const resolved = resolveRecurringExpenseNotificationPreferences(
      { enable_reminders: true },
      [5],
    );

    expect(resolved).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [5] }],
    });
  });

  it("falls back to defaults for null and non-object payloads", () => {
    const nullPayload = resolveRecurringExpenseNotificationPreferences(
      null,
      [2],
    );
    const stringPayload = resolveRecurringExpenseNotificationPreferences(
      "nope",
      [2],
    );

    const expected = {
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [2] }],
    };
    expect(nullPayload).toEqual(expected);
    expect(stringPayload).toEqual(expected);
  });

  it("disables notifications when enable_reminders is false", () => {
    const resolved = resolveRecurringExpenseNotificationPreferences(
      { enable_reminders: false },
      [5],
    );

    expect(resolved).toEqual({ enabled: false, rules: [] });
  });

  it("prefers explicit preferences even when enable_reminders is false", () => {
    const resolved = resolveRecurringExpenseNotificationPreferences(
      {
        enable_reminders: false,
        notifications: {
          enabled: true,
          rules: [{ event: "renewal", offsets_days: [3] }],
        },
      },
      [5],
    );

    expect(resolved).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [3] }],
    });
  });

  it("falls back when explicit preferences fail schema validation", () => {
    const resolved = resolveRecurringExpenseNotificationPreferences(
      {
        notifications: {
          enabled: true,
          rules: [{ event: "renewal", offsets_days: [7, 7] }],
        },
      },
      [4],
    );

    expect(resolved).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [4] }],
    });
  });

  it("normalizes malformed default offsets to safe values", () => {
    const resolved = resolveRecurringExpenseNotificationPreferences({}, [
      -1,
      2.5,
      400,
      "soon" as unknown as number,
      0,
      0,
    ]);

    expect(resolved).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [0] }],
    });
  });
});

describe("buildRecurringRenewalNotificationPreferences", () => {
  it("returns disabled preferences when disabled", () => {
    expect(buildRecurringRenewalNotificationPreferences(false, [3])).toEqual({
      enabled: false,
      rules: [],
    });
  });

  it("builds a normalized renewal rule when enabled", () => {
    const built = buildRecurringRenewalNotificationPreferences(
      true,
      [30, 1, 1, 7],
    );

    expect(built).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [1, 7, 30] }],
    });
  });
});

describe("getRecurringRenewalOffsets", () => {
  it("extracts offsets from the renewal rule", () => {
    const offsets = getRecurringRenewalOffsets({
      enabled: true,
      rules: [
        { event: "birthday", offsets_days: [5] },
        { event: "renewal", offsets_days: [14, 2] },
      ],
    });

    expect(offsets).toEqual([2, 14]);
  });

  it("falls back to defaults when no renewal rule exists", () => {
    expect(getRecurringRenewalOffsets({ enabled: true, rules: [] })).toEqual(
      DEFAULT_RECURRING_NOTIFICATION_OFFSETS,
    );
  });

  it("falls back to contract defaults when rule offsets are empty", () => {
    const offsets = getRecurringRenewalOffsets(
      { enabled: true, rules: [{ event: "renewal", offsets_days: [] }] },
      [9],
    );

    expect(offsets).toEqual(DEFAULT_RECURRING_NOTIFICATION_OFFSETS);
  });

  it("falls back to explicit fallback when rule offsets are not an array", () => {
    const offsets = getRecurringRenewalOffsets(
      {
        enabled: true,
        rules: [
          { event: "renewal", offsets_days: "soon" as unknown as number[] },
        ],
      },
      [9],
    );

    expect(offsets).toEqual([9]);
  });
});

describe("normalizeNotificationOffsetsDays re-export", () => {
  it("filters, dedupes, sorts, and clamps offsets", () => {
    expect(
      normalizeNotificationOffsetsDays([7, 1, 1, 0, 366, -1, 2.5, 3]),
    ).toEqual([0, 1, 3, 7]);
  });
});
