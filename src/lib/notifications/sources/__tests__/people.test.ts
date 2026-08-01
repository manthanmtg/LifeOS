import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import { peopleNotificationSource } from "../people";
import type { PeopleSettings } from "@/modules/people/config";

function fakeDb(records: unknown[]) {
  return {
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(records),
      }),
    }),
  };
}

function makeSystemConfig(peopleSettings: PeopleSettings) {
  return {
    _id: "global" as const,
    site_title: "Life OS",
    active_theme: "one-dark",
    bio: "",
    moduleRegistry: {},
    peopleSettings,
  };
}

describe("peopleNotificationSource", () => {
  it("collects explicit and relationship/default people reminders", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f0"),
        module_type: "person",
        payload: {
          name: "Ally",
          relationship: "friend",
          birthday: "2026-08-03",
          notifications: {
            enabled: true,
            rules: [
              {
                event: "birthday",
                offsets_days: [1],
              },
            ],
          },
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f1"),
        module_type: "person",
        payload: {
          name: "Bri",
          relationship: "friend",
          birthday: "2026-08-03",
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f2"),
        module_type: "person",
        payload: {
          name: "Casey",
          relationship: "family",
          birthday: "2026-08-04",
          notifications: {
            enabled: false,
            rules: [{ event: "birthday", offsets_days: [1] }],
          },
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f3"),
        module_type: "person",
        payload: {
          name: "Malformed",
          relationship: "friend",
          birthday: "2026-08-01",
          phone: "123",
        },
      },
    ]);

    const settings = {
      enabled: true,
      timezone: "UTC",
      deliveryHour: 9,
      catchUpHours: 36,
    };

    const result = await peopleNotificationSource.collectCandidates({
      db: db as never,
      now: new Date("2026-08-02T12:00:00.000Z"),
      settings,
      systemConfig: makeSystemConfig({
        birthdayNotifications: {
          default: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [1] }],
          },
          relationships: {
            family: {
              enabled: true,
              rules: [{ event: "birthday", offsets_days: [2] }],
            },
          },
        },
      }),
    });

    expect(result.items_skipped).toBe(1);
    expect(result.candidates).toHaveLength(2);

    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({
            document_id: "64f0f0f0f0f0f0f0f0f0f0f0",
            event: "birthday",
            event_date: "2026-08-03",
          }),
          offset_days: 1,
          message: expect.objectContaining({
            title: "Ally's birthday is tomorrow",
          }),
        }),
        expect.objectContaining({
          source: expect.objectContaining({
            document_id: "64f0f0f0f0f0f0f0f0f0f0f1",
            event_date: "2026-08-03",
          }),
          offset_days: 1,
          message: expect.objectContaining({
            title: "Bri's birthday is tomorrow",
          }),
        }),
      ]),
    );
  });

  it("summarizes explicit and inherited people reminders", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f0"),
        module_type: "person",
        payload: {
          name: "Ally",
          relationship: "friend",
          birthday: "2026-08-03",
          notifications: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [1] }],
          },
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f1"),
        module_type: "person",
        payload: {
          name: "Bri",
          relationship: "friend",
          birthday: "2026-08-03",
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f2"),
        module_type: "person",
        payload: {
          name: "Casey",
          relationship: "family",
          birthday: "2026-08-04",
          notifications: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [2] }],
          },
        },
      },
    ]);

    const settings = {
      enabled: true,
      timezone: "UTC",
      deliveryHour: 9,
      catchUpHours: 36,
    };

    await expect(
      peopleNotificationSource.getActivationSummary({
        db: db as never,
        now: new Date("2026-08-02T12:00:00.000Z"),
        settings,
        systemConfig: makeSystemConfig({
          birthdayNotifications: {
            default: {
              enabled: true,
              rules: [{ event: "birthday", offsets_days: [1] }],
            },
            relationships: {},
          },
        }),
      }),
    ).resolves.toEqual({
      module_type: "person",
      label: "People",
      eligible_count: 3,
      explicit_count: 2,
      inherited_count: 1,
    });
  });
});
