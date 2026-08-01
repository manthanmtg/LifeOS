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

  it("falls back to relationship/default when explicit preference is non-birthday", () => {
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
});
