import { describe, expect, it } from "vitest";

import {
  DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
  DEFAULT_PEOPLE_SETTINGS,
} from "@/modules/people/config";
import {
  getBirthdayNotificationRule,
  normalizePeopleSettings,
  resolvePeopleBirthdayNotificationPreferences,
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

  it("treats explicit non-birthday preferences as person-level disabled", () => {
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
          rules: [{ event: "renewal", offsets_days: [1] }],
        },
      },
      settings,
    );

    expect(resolved.origin).toEqual({
      kind: "person",
    });
    expect(resolved.preferences.enabled).toBe(false);
    expect(getBirthdayNotificationRule(resolved.preferences)).toBeNull();
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
});
