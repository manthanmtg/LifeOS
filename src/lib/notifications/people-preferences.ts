import type { NotificationPreferences, NotificationRule } from "./contracts";
import { normalizeNotificationOffsetsDays } from "./preferences";
import { NotificationPreferencesSchema } from "./schemas";
import type { PeopleSettings } from "@/modules/people/config";
import { DEFAULT_PEOPLE_SETTINGS } from "@/modules/people/config";
import {
  RELATIONSHIPS,
  type Relationship,
  type PersonPayload,
} from "@/modules/people/types";

export type PeopleBirthdayPreferenceOrigin =
  | { kind: "person" }
  | { kind: "relationship"; relationship: Relationship }
  | { kind: "default" };

export interface ResolvedPeopleBirthdayPreferences {
  preferences: NotificationPreferences;
  origin: PeopleBirthdayPreferenceOrigin;
}

function extractBirthdayRule(
  preferences: NotificationPreferences,
): NotificationRule | undefined {
  return preferences.rules.find((rule) => rule.event === "birthday");
}

function normalizeBirthdayPreferences(
  value: unknown,
): NotificationPreferences | null {
  if (!value || typeof value !== "object") return null;

  const parsed = NotificationPreferencesSchema.safeParse(value);
  if (!parsed.success) return null;

  if (!parsed.data.enabled) {
    return { enabled: false, rules: [] };
  }

  const rule = extractBirthdayRule(parsed.data);
  if (!rule) {
    return { enabled: false, rules: [] };
  }

  return {
    enabled: true,
    rules: [
      {
        event: "birthday",
        offsets_days: normalizeNotificationOffsetsDays(rule.offsets_days),
        ...(rule.channel_ids?.length
          ? { channel_ids: [...rule.channel_ids] }
          : {}),
      },
    ],
  };
}

export function normalizePeopleSettings(value: unknown): PeopleSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_PEOPLE_SETTINGS;
  }

  const raw = value as Record<string, unknown>;
  const birthdayNotifications = raw.birthdayNotifications;
  if (!birthdayNotifications || typeof birthdayNotifications !== "object") {
    return DEFAULT_PEOPLE_SETTINGS;
  }

  const rawBirthdayNotifications = birthdayNotifications as Record<
    string,
    unknown
  >;
  const rawDefault = rawBirthdayNotifications.default;
  const rawRelationships = rawBirthdayNotifications.relationships;

  const defaultPreferences =
    normalizeBirthdayPreferences(rawDefault) ??
    DEFAULT_PEOPLE_SETTINGS.birthdayNotifications.default;

  const relationships: Partial<Record<Relationship, NotificationPreferences>> =
    {};

  if (rawRelationships && typeof rawRelationships === "object") {
    const relationshipMap = rawRelationships as Record<string, unknown>;
    for (const relationship of RELATIONSHIPS) {
      const normalized = normalizeBirthdayPreferences(
        relationshipMap[relationship],
      );
      if (!normalized) continue;
      relationships[relationship] = normalized;
    }
  }

  return {
    birthdayNotifications: {
      default: defaultPreferences,
      relationships,
    },
  };
}

export function buildBirthdayNotificationPreferences(
  enabled: boolean,
  offsetsDays: number[],
  channelIds?: string[],
): NotificationPreferences {
  if (!enabled) {
    return { enabled: false, rules: [] };
  }

  const offsets = normalizeNotificationOffsetsDays(offsetsDays);
  if (offsets.length === 0) {
    return { enabled: false, rules: [] };
  }

  return {
    enabled: true,
    rules: [
      {
        event: "birthday",
        offsets_days: offsets,
        ...(channelIds?.length ? { channel_ids: [...channelIds] } : {}),
      },
    ],
  };
}

export function getBirthdayNotificationRule(
  preferences: NotificationPreferences,
): NotificationRule | null {
  return preferences.rules.find((rule) => rule.event === "birthday") ?? null;
}

export function resolvePeopleBirthdayNotificationPreferences(
  payload: Pick<PersonPayload, "relationship" | "notifications">,
  settings: PeopleSettings,
): ResolvedPeopleBirthdayPreferences {
  const normalizedSettings = normalizePeopleSettings(settings);

  if (payload.notifications !== undefined) {
    const explicit = normalizeBirthdayPreferences(payload.notifications);
    if (explicit) {
      return {
        preferences: explicit,
        origin: { kind: "person" },
      };
    }
  }

  const relationshipPreference =
    normalizedSettings.birthdayNotifications.relationships[
      payload.relationship
    ];
  if (relationshipPreference) {
    return {
      preferences: relationshipPreference,
      origin: { kind: "relationship", relationship: payload.relationship },
    };
  }

  return {
    preferences: normalizedSettings.birthdayNotifications.default,
    origin: { kind: "default" },
  };
}
