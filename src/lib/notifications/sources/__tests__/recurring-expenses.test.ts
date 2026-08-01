import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import {
  recurringExpensesNotificationSource,
  resolveRecurringExpenseNotificationPreferences,
} from "../recurring-expenses";

const settings = {
  enabled: true,
  timezone: "Asia/Kolkata",
  deliveryHour: 9,
  catchUpHours: 36,
};

function fakeDb(records: unknown[]) {
  return {
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(records),
      }),
    }),
  };
}

describe("resolveRecurringExpenseNotificationPreferences", () => {
  it("uses explicit nested preferences before legacy fields", () => {
    const prefs = resolveRecurringExpenseNotificationPreferences(
      {
        enable_reminders: false,
        notifications: {
          enabled: true,
          rules: [{ event: "renewal", offsets_days: [7, 1] }],
        },
      },
      [2],
    );

    expect(prefs).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [1, 7] }],
    });
  });

  it("maps legacy reminder fields to renewal rules", () => {
    expect(
      resolveRecurringExpenseNotificationPreferences(
        { enable_reminders: true },
        [3],
      ),
    ).toEqual({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [3] }],
    });
    expect(
      resolveRecurringExpenseNotificationPreferences(
        { enable_reminders: false },
        [3],
      ),
    ).toEqual({ enabled: false, rules: [] });
  });
});

describe("recurringExpensesNotificationSource", () => {
  it("collects due renewal candidates from active explicit preferences", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f3"),
        module_type: "recurring_expense",
        payload: {
          name: "Netflix",
          cost: 649,
          currency: "INR",
          billing_cycle: "monthly",
          next_renewal_date: "2026-07-31T00:00:00.000Z",
          category: "Streaming",
          is_active: true,
          enable_reminders: true,
          notifications: {
            enabled: true,
            rules: [{ event: "renewal", offsets_days: [1] }],
          },
        },
      },
    ]);

    const result = await recurringExpensesNotificationSource.collectCandidates({
      db: db as never,
      now: new Date("2026-07-30T03:30:00.000Z"),
      settings,
      systemConfig: {
        _id: "global",
        site_title: "Life OS",
        active_theme: "one-dark",
        bio: "",
        moduleRegistry: {},
      },
    });

    expect(result.items_skipped).toBe(0);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      scheduled_date: "2026-07-30",
      offset_days: 1,
      message: {
        title: "Netflix renews tomorrow",
      },
    });
  });

  it("skips inactive and malformed records without failing the source", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f4"),
        module_type: "recurring_expense",
        payload: {
          name: "Inactive",
          cost: 10,
          currency: "USD",
          billing_cycle: "monthly",
          next_renewal_date: "2026-07-31T00:00:00.000Z",
          category: "Other",
          is_active: false,
          enable_reminders: true,
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f5"),
        module_type: "recurring_expense",
        payload: { name: "Broken" },
      },
    ]);

    const result = await recurringExpensesNotificationSource.collectCandidates({
      db: db as never,
      now: new Date("2026-07-30T03:30:00.000Z"),
      settings,
      systemConfig: {
        _id: "global",
        site_title: "Life OS",
        active_theme: "one-dark",
        bio: "",
        moduleRegistry: {},
      },
    });

    expect(result).toEqual({ candidates: [], items_skipped: 1 });
  });

  it("counts explicit and legacy active records for the activation preview", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f6"),
        payload: {
          name: "Explicit",
          cost: 10,
          currency: "USD",
          billing_cycle: "monthly",
          next_renewal_date: "2026-07-31T00:00:00.000Z",
          category: "Other",
          is_active: true,
          notifications: {
            enabled: true,
            rules: [{ event: "renewal", offsets_days: [1] }],
          },
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f7"),
        payload: {
          name: "Legacy",
          cost: 10,
          currency: "USD",
          billing_cycle: "monthly",
          next_renewal_date: "2026-07-31T00:00:00.000Z",
          category: "Other",
          is_active: true,
          enable_reminders: true,
        },
      },
    ]);

    await expect(
      recurringExpensesNotificationSource.getActivationSummary({
        db: db as never,
        now: new Date("2026-07-30T03:30:00.000Z"),
        settings,
        systemConfig: {
          _id: "global",
          site_title: "Life OS",
          active_theme: "one-dark",
          bio: "",
          moduleRegistry: {},
        },
      }),
    ).resolves.toEqual({
      module_type: "recurring_expense",
      label: "Recurring Expenses",
      eligible_count: 2,
      explicit_count: 1,
      inherited_count: 1,
    });
  });
});
