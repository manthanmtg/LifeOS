import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import { peopleNotificationSource } from "../people";
import { NotificationCandidateSchema } from "../../schemas";
import type { PeopleSettings } from "@/modules/people/config";

function fakeDb(records: unknown[]) {
  const find = vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue(records),
  });

  return {
    collection: vi.fn().mockReturnValue({ find }),
    find,
  };
}

function makeSystemConfig(peopleSettings: Partial<PeopleSettings>) {
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
    result.candidates.forEach((candidate) => {
      expect(NotificationCandidateSchema.safeParse(candidate).success).toBe(
        true,
      );
      expect(candidate.message.body).not.toContain("123");
      expect(candidate.message.body).not.toContain("Test Note");
    });
    expect(db.find).toHaveBeenCalledWith(
      {
        module_type: "person",
        $or: [
          { "payload.birthday": { $exists: true } },
          { "payload.last_contacted": { $exists: true } },
          { "payload.interactions.0": { $exists: true } },
        ],
      },
      {
        projection: {
          _id: 1,
          "payload.name": 1,
          "payload.relationship": 1,
          "payload.birthday": 1,
          "payload.last_contacted": 1,
          "payload.interactions": 1,
          "payload.notifications": 1,
        },
      },
    );

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

  it("collects due and overdue contact reminders", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f010"),
        module_type: "person",
        payload: {
          name: "Ally",
          relationship: "friend",
          last_contacted: "2026-07-03",
          interactions: [],
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f011"),
        module_type: "person",
        payload: {
          name: "Bri",
          relationship: "family",
          last_contacted: "2026-06-20",
          interactions: [],
        },
      },
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f012"),
        module_type: "person",
        payload: {
          name: "Casey",
          relationship: "friend",
          interactions: [{ date: "2026-07-25", type: "message" }],
          notifications: {
            enabled: true,
            rules: [
              {
                event: "contact_reminder",
                offsets_days: [2],
                cadence_days: 10,
                channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
              },
            ],
          },
        },
      },
    ]);

    const result = await peopleNotificationSource.collectCandidates({
      db: db as never,
      now: new Date("2026-08-02T12:00:00.000Z"),
      settings: {
        enabled: true,
        timezone: "UTC",
        deliveryHour: 9,
        catchUpHours: 36,
      },
      systemConfig: makeSystemConfig({
        birthdayNotifications: {
          default: { enabled: false, rules: [] },
          relationships: {},
        },
        contactNotifications: {
          default: {
            enabled: true,
            rules: [
              {
                event: "contact_reminder",
                offsets_days: [0],
                cadence_days: 30,
              },
            ],
          },
          relationships: {
            family: { enabled: false, rules: [] },
          },
        },
      }),
    });

    expect(result.items_skipped).toBe(0);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: {
            module_type: "person",
            document_id: "64f0f0f0f0f0f0f0f0f0f010",
            event: "contact_reminder",
            event_date: "2026-08-02",
          },
          scheduled_date: "2026-08-02",
          offset_days: 0,
          message: expect.objectContaining({
            title: "Contact Ally today",
            body: "Last contacted 30 days ago · Friend · every 30 days",
          }),
        }),
        expect.objectContaining({
          source: {
            module_type: "person",
            document_id: "64f0f0f0f0f0f0f0f0f0f012",
            event: "contact_reminder",
            event_date: "2026-08-04",
          },
          scheduled_date: "2026-08-02",
          offset_days: 2,
          channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
          message: expect.objectContaining({
            title: "Contact Casey in 2 days",
          }),
        }),
      ]),
    );
  });

  it("propagates channel ids and handles leap-day birthdays", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f4"),
        module_type: "person",
        payload: {
          name: "Drew",
          relationship: "friend",
          birthday: "2000-02-29",
          notifications: {
            enabled: true,
            rules: [
              {
                event: "birthday",
                offsets_days: [1],
                channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
              },
            ],
          },
        },
      },
    ]);

    const result = await peopleNotificationSource.collectCandidates({
      db: db as never,
      now: new Date("2025-02-28T12:00:00.000Z"),
      settings: {
        enabled: true,
        timezone: "UTC",
        deliveryHour: 9,
        catchUpHours: 36,
      },
      systemConfig: makeSystemConfig({
        birthdayNotifications: {
          default: { enabled: false, rules: [] },
          relationships: {},
        },
      }),
    });

    expect(result.items_skipped).toBe(0);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      source: {
        module_type: "person",
        document_id: "64f0f0f0f0f0f0f0f0f0f0f4",
        event: "birthday",
        event_date: "2025-03-01",
      },
      scheduled_date: "2025-02-28",
      offset_days: 1,
      channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
      message: {
        title: "Drew's birthday is tomorrow",
        body: "01 Mar 2025 · Friend",
      },
    });
  });

  it("uses the configured timezone when selecting birthday occurrence years", async () => {
    const db = fakeDb([
      {
        _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f5"),
        module_type: "person",
        payload: {
          name: "Eli",
          relationship: "friend",
          birthday: "2000-01-01",
        },
      },
    ]);

    const result = await peopleNotificationSource.collectCandidates({
      db: db as never,
      now: new Date("2026-12-31T20:00:00.000Z"),
      settings: {
        enabled: true,
        timezone: "Asia/Kolkata",
        deliveryHour: 1,
        catchUpHours: 36,
      },
      systemConfig: makeSystemConfig({
        birthdayNotifications: {
          default: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [0] }],
          },
          relationships: {},
        },
      }),
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].source.event_date).toBe("2027-01-01");
    expect(result.candidates[0].scheduled_date).toBe("2027-01-01");
  });
});
