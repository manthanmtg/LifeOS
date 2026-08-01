import { describe, expect, it } from "vitest";

import {
  DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
  DEFAULT_CONTACT_REMINDER_NOTIFICATION_PREFERENCES,
  DEFAULT_PEOPLE_SETTINGS,
} from "@/modules/people/config";
import {
  buildPeopleNotificationPreferences,
  getBirthdayNotificationRule,
  getContactReminderNotificationRule,
  normalizePeopleSettings,
  resolvePeopleBirthdayNotificationPreferences,
  resolvePeopleContactReminderNotificationPreferences,
} from "../people-preferences";

describe("people notification preferences", () => {
  it("normalizes invalid settings to safe defaults", () => {
    const normalized = normalizePeopleSettings({
      birthdayNotifications: {
        // intentionally malformed
        default: {
          enabled: true,
          rules: [],
        },
      },
    });

    expect(normalized).toEqual({
      birthdayNotifications: {
        default: DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
        relationships: {},
      },
      contactNotifications: {
        default: DEFAULT_CONTACT_REMINDER_NOTIFICATION_PREFERENCES,
        relationships: {},
      },
    });
  });

  it("uses safe defaults when full settings are missing", () => {
    expect(normalizePeopleSettings({})).toEqual(DEFAULT_PEOPLE_SETTINGS);
    expect(normalizePeopleSettings(undefined)).toEqual(DEFAULT_PEOPLE_SETTINGS);
  });

  it("uses explicit person preference over relationship and default", () => {
    const settings = normalizePeopleSettings({
      birthdayNotifications: {
        default: {
          enabled: true,
          rules: [{ event: "birthday", offsets_days: [7] }],
          channel_ids: ["64f0f0f0f0f0f0f0f0f0f0f0"],
        },
        relationships: {
          friend: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [3] }],
          },
        },
      },
    });

    const resolved = resolvePeopleBirthdayNotificationPreferences(
      {
        relationship: "friend",
        notifications: {
          enabled: true,
          rules: [
            {
              event: "birthday",
              offsets_days: [2],
              channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
            },
          ],
        },
      },
      settings,
    );

    expect(resolved.origin).toEqual({ kind: "person" });
    expect(getBirthdayNotificationRule(resolved.preferences)).toMatchObject({
      event: "birthday",
      offsets_days: [2],
      channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
    });
    expect(resolved.preferences.enabled).toBe(true);
  });

  it("lets missing explicit event rules inherit other people reminder categories", () => {
    const settings = normalizePeopleSettings({
      birthdayNotifications: {
        default: {
          enabled: true,
          rules: [{ event: "birthday", offsets_days: [7] }],
        },
        relationships: {
          family: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [2] }],
          },
        },
      },
    });

    const resolved = resolvePeopleBirthdayNotificationPreferences(
      {
        relationship: "family",
        notifications: {
          enabled: true,
          rules: [
            { event: "contact_reminder", offsets_days: [0], cadence_days: 30 },
          ],
        },
      },
      settings,
    );

    expect(resolved.origin).toEqual({
      kind: "relationship",
      relationship: "family",
    });
    expect(getBirthdayNotificationRule(resolved.preferences)).toMatchObject({
      event: "birthday",
      offsets_days: [2],
    });
  });

  it("uses relationship overrides before the People default", () => {
    const resolved = resolvePeopleBirthdayNotificationPreferences(
      {
        relationship: "family",
        notifications: undefined,
      },
      normalizePeopleSettings({
        birthdayNotifications: {
          default: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [30] }],
          },
          relationships: {
            family: {
              enabled: true,
              rules: [{ event: "birthday", offsets_days: [7, 1] }],
            },
          },
        },
      }),
    );

    expect(resolved.origin).toEqual({
      kind: "relationship",
      relationship: "family",
    });
    expect(getBirthdayNotificationRule(resolved.preferences)).toMatchObject({
      offsets_days: [1, 7],
    });
  });

  it("keeps explicit person opt-out from falling through", () => {
    const resolved = resolvePeopleBirthdayNotificationPreferences(
      {
        relationship: "family",
        notifications: { enabled: false, rules: [] },
      },
      normalizePeopleSettings({
        birthdayNotifications: {
          default: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [1] }],
          },
          relationships: {
            family: {
              enabled: true,
              rules: [{ event: "birthday", offsets_days: [7] }],
            },
          },
        },
      }),
    );

    expect(resolved.origin).toEqual({ kind: "person" });
    expect(resolved.preferences).toEqual({ enabled: false, rules: [] });
  });

  it("ignores unknown relationship keys and non-birthday system rules", () => {
    const normalized = normalizePeopleSettings({
      birthdayNotifications: {
        default: {
          enabled: true,
          rules: [{ event: "renewal", offsets_days: [1] }],
        },
        relationships: {
          friend: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [14] }],
          },
          neighbor: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [1] }],
          },
        },
      },
    });

    expect(normalized.birthdayNotifications.default).toEqual(
      DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
    );
    expect(normalized.birthdayNotifications.relationships).toEqual({
      friend: {
        enabled: true,
        rules: [{ event: "birthday", offsets_days: [14] }],
      },
    });
  });

  it("resolves contact reminders from person, relationship, and default settings", () => {
    const settings = normalizePeopleSettings({
      birthdayNotifications: {
        default: DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
        relationships: {},
      },
      contactNotifications: {
        default: {
          enabled: true,
          rules: [
            {
              event: "contact_reminder",
              offsets_days: [0],
              cadence_days: 90,
            },
          ],
        },
        relationships: {
          friend: {
            enabled: true,
            rules: [
              {
                event: "contact_reminder",
                offsets_days: [3, 0],
                cadence_days: 30,
              },
            ],
          },
        },
      },
    });

    const inherited = resolvePeopleContactReminderNotificationPreferences(
      { relationship: "friend", notifications: undefined },
      settings,
    );
    expect(inherited.origin).toEqual({
      kind: "relationship",
      relationship: "friend",
    });
    expect(getContactReminderNotificationRule(inherited.preferences)).toEqual({
      event: "contact_reminder",
      offsets_days: [0, 3],
      cadence_days: 30,
    });

    const explicit = resolvePeopleContactReminderNotificationPreferences(
      {
        relationship: "friend",
        notifications: {
          enabled: true,
          rules: [
            {
              event: "contact_reminder",
              offsets_days: [7],
              cadence_days: 14,
              channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
            },
          ],
        },
      },
      settings,
    );
    expect(explicit.origin).toEqual({ kind: "person" });
    expect(getContactReminderNotificationRule(explicit.preferences)).toEqual({
      event: "contact_reminder",
      offsets_days: [7],
      cadence_days: 14,
      channel_ids: ["74f0f0f0f0f0f0f0f0f0f0f0"],
    });
  });

  it("builds combined person preferences with per-event opt-outs", () => {
    expect(
      buildPeopleNotificationPreferences({
        birthday: {
          mode: "off",
        },
        contactReminder: {
          mode: "custom",
          cadenceDays: 45,
          offsetsDays: [0, 7],
        },
      }),
    ).toEqual({
      enabled: true,
      disabled_events: ["birthday"],
      rules: [
        {
          event: "contact_reminder",
          offsets_days: [0, 7],
          cadence_days: 45,
        },
      ],
    });
  });
});
