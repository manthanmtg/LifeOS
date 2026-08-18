import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import { healthNotificationSource } from "../health";

const settings = {
  enabled: true,
  timezone: "Asia/Kolkata",
  deliveryHour: 9,
  catchUpHours: 36,
};

function fakeDb(records: unknown[]) {
  return {
    collection: vi.fn().mockReturnValue({
      find: vi
        .fn()
        .mockReturnValue({ toArray: vi.fn().mockResolvedValue(records) }),
    }),
  };
}

const systemConfig = {
  _id: "global" as const,
  site_title: "Life OS",
  active_theme: "one-dark",
  bio: "",
  moduleRegistry: {},
};

describe("healthNotificationSource", () => {
  it("creates record-specific due vaccine reminders", async () => {
    const result = await healthNotificationSource.collectCandidates({
      db: fakeDb([
        {
          _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f111"),
          module_type: "health_profile",
          payload: {
            name: "Milo",
            type: "pet",
            vaccinations: [
              {
                id: "rabies-2025",
                name: "Rabies",
                date_administered: "2025-07-31T00:00:00.000Z",
                next_due: "2026-07-31T00:00:00.000Z",
                reminder_enabled: true,
                reminder_offsets_days: [1],
              },
            ],
          },
        },
      ]) as never,
      now: new Date("2026-07-30T03:30:00.000Z"),
      settings,
      systemConfig,
    });

    expect(result).toMatchObject({
      items_skipped: 0,
      candidates: [
        {
          source: {
            module_type: "health_profile",
            event: "vaccination:rabies-2025",
            event_date: "2026-07-31",
          },
          scheduled_date: "2026-07-30",
          offset_days: 1,
          message: {
            title: "Rabies for Milo is due tomorrow",
            url: "/admin/health",
          },
        },
      ],
    });
  });

  it("does not emit reminders that are disabled or unscheduled", async () => {
    const result = await healthNotificationSource.collectCandidates({
      db: fakeDb([
        {
          _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f112"),
          module_type: "health_profile",
          payload: {
            name: "Milo",
            type: "pet",
            vaccinations: [
              {
                id: "disabled",
                name: "Rabies",
                date_administered: "2025-01-01T00:00:00.000Z",
                next_due: "2026-07-31T00:00:00.000Z",
                reminder_enabled: false,
              },
              {
                id: "history",
                name: "Tetanus",
                date_administered: "2025-01-01T00:00:00.000Z",
              },
            ],
          },
        },
      ]) as never,
      now: new Date("2026-07-30T03:30:00.000Z"),
      settings,
      systemConfig,
    });

    expect(result).toEqual({ candidates: [], items_skipped: 0 });
  });
});
