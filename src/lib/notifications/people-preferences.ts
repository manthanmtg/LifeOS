import type { NotificationPreferences, NotificationRule } from "./contracts";
import { normalizeNotificationOffsetsDays } from "./preferences";
import { NotificationPreferencesSchema } from "./schemas";
import type { PeopleSettings } from "@/modules/people/config";
import {
  DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
  DEFAULT_CONTACT_REMINDER_CADENCE_DAYS,
  DEFAULT_CONTACT_REMINDER_NOTIFICATION_PREFERENCES,
  DEFAULT_PEOPLE_SETTINGS,
} from "@/modules/people/config";
import {
  RELATIONSHIPS,
  type Relationship,
  type PersonPayload,
} from "@/modules/people/types";

export const PEOPLE_BIRTHDAY_EVENT = "birthday";
export const PEOPLE_CONTACT_REMINDER_EVENT = "contact_reminder";

export type PeopleNotificationEvent =
  | typeof PEOPLE_BIRTHDAY_EVENT
  | typeof PEOPLE_CONTACT_REMINDER_EVENT;

export type PeopleBirthdayPreferenceOrigin =
  | { kind: "person" }
  | { kind: "relationship"; relationship: Relationship }
  | { kind: "default" };

export interface ResolvedPeopleBirthdayPreferences {
  preferences: NotificationPreferences;
  origin: PeopleBirthdayPreferenceOrigin;
}

type PeopleNotificationCategory = {
  default: NotificationPreferences;
  relationships: Partial<Record<Relationship, NotificationPreferences>>;
};

type EventOverrideDraft =
  | { mode: "inherit" }
  | { mode: "off" }
  | {
      mode: "custom";
      offsetsDays: number[];
      channelIds?: string[];
      cadenceDays?: number;
    };

export interface PeopleNotificationPreferenceDraft {
  birthday?: EventOverrideDraft;
  contactReminder?: EventOverrideDraft;
}

function extractRule(
  preferences: NotificationPreferences,
  event: PeopleNotificationEvent,
): NotificationRule | undefined {
  return preferences.rules.find((rule) => rule.event === event);
}

function normalizeContactReminderCadenceDays(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 3650
    ? Number(value)
    : DEFAULT_CONTACT_REMINDER_CADENCE_DAYS;
}

export function normalizePeopleContactReminderCadenceDays(
  value: unknown,
): number {
  return normalizeContactReminderCadenceDays(value);
}

function normalizeRule(
  rule: NotificationRule,
  event: PeopleNotificationEvent,
): NotificationRule | null {
  if (rule.event !== event) return null;

  const offsets_days = normalizeNotificationOffsetsDays(
    rule.offsets_days,
    event === PEOPLE_CONTACT_REMINDER_EVENT ? [0] : [1],
  );

  if (event === PEOPLE_CONTACT_REMINDER_EVENT) {
    return {
      event,
      offsets_days,
      cadence_days: normalizeContactReminderCadenceDays(rule.cadence_days),
      ...(rule.channel_ids?.length
        ? { channel_ids: [...rule.channel_ids] }
        : {}),
    };
  }

  return {
    event,
    offsets_days,
    ...(rule.channel_ids?.length ? { channel_ids: [...rule.channel_ids] } : {}),
  };
}

function normalizeEventPreferences(
  value: unknown,
  event: PeopleNotificationEvent,
): NotificationPreferences | null {
  if (!value || typeof value !== "object") return null;

  const parsed = NotificationPreferencesSchema.safeParse(value);
  if (!parsed.success) return null;

  if (parsed.data.disabled_events?.includes(event)) {
    return { enabled: false, rules: [] };
  }

  if (!parsed.data.enabled) {
    return { enabled: false, rules: [] };
  }

  const rule = extractRule(parsed.data, event);
  if (!rule) return null;

  const normalizedRule = normalizeRule(rule, event);
  if (!normalizedRule) return { enabled: false, rules: [] };

  return {
    enabled: true,
    rules: [normalizedRule],
  };
}

function normalizeCategorySettings(
  value: unknown,
  event: PeopleNotificationEvent,
  fallback: NotificationPreferences,
): PeopleNotificationCategory {
  if (!value || typeof value !== "object") {
    return {
      default: fallback,
      relationships: {},
    };
  }

  const raw = value as Record<string, unknown>;
  const defaultPreferences =
    normalizeEventPreferences(raw.default, event) ?? fallback;
  const relationships: Partial<Record<Relationship, NotificationPreferences>> =
    {};

  if (raw.relationships && typeof raw.relationships === "object") {
    const relationshipMap = raw.relationships as Record<string, unknown>;
    for (const relationship of RELATIONSHIPS) {
      const normalized = normalizeEventPreferences(
        relationshipMap[relationship],
        event,
      );
      if (!normalized) continue;
      relationships[relationship] = normalized;
    }
  }

  return {
    default: defaultPreferences,
    relationships,
  };
}

export function normalizePeopleSettings(value: unknown): PeopleSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_PEOPLE_SETTINGS;
  }

  const raw = value as Record<string, unknown>;

  return {
    birthdayNotifications: normalizeCategorySettings(
      raw.birthdayNotifications,
      PEOPLE_BIRTHDAY_EVENT,
      DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
    ),
    contactNotifications: normalizeCategorySettings(
      raw.contactNotifications,
      PEOPLE_CONTACT_REMINDER_EVENT,
      DEFAULT_CONTACT_REMINDER_NOTIFICATION_PREFERENCES,
    ),
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
        event: PEOPLE_BIRTHDAY_EVENT,
        offsets_days: offsets,
        ...(channelIds?.length ? { channel_ids: [...channelIds] } : {}),
      },
    ],
  };
}

export function buildContactReminderNotificationPreferences(
  enabled: boolean,
  cadenceDays: number,
  offsetsDays: number[],
  channelIds?: string[],
): NotificationPreferences {
  if (!enabled) {
    return { enabled: false, rules: [] };
  }

  return {
    enabled: true,
    rules: [
      {
        event: PEOPLE_CONTACT_REMINDER_EVENT,
        offsets_days: normalizeNotificationOffsetsDays(offsetsDays, [0]),
        cadence_days: normalizeContactReminderCadenceDays(cadenceDays),
        ...(channelIds?.length ? { channel_ids: [...channelIds] } : {}),
      },
    ],
  };
}

export function buildPeopleNotificationPreferences(
  draft: PeopleNotificationPreferenceDraft,
): NotificationPreferences | undefined {
  const rules: NotificationRule[] = [];
  const disabledEvents: PeopleNotificationEvent[] = [];

  if (draft.birthday?.mode === "custom") {
    const rule = getBirthdayNotificationRule(
      buildBirthdayNotificationPreferences(
        true,
        draft.birthday.offsetsDays,
        draft.birthday.channelIds,
      ),
    );
    if (rule) rules.push(rule);
  } else if (draft.birthday?.mode === "off") {
    disabledEvents.push(PEOPLE_BIRTHDAY_EVENT);
  }

  if (draft.contactReminder?.mode === "custom") {
    const rule = getContactReminderNotificationRule(
      buildContactReminderNotificationPreferences(
        true,
        draft.contactReminder.cadenceDays ??
          DEFAULT_CONTACT_REMINDER_CADENCE_DAYS,
        draft.contactReminder.offsetsDays,
        draft.contactReminder.channelIds,
      ),
    );
    if (rule) rules.push(rule);
  } else if (draft.contactReminder?.mode === "off") {
    disabledEvents.push(PEOPLE_CONTACT_REMINDER_EVENT);
  }

  if (rules.length === 0 && disabledEvents.length === 0) {
    return undefined;
  }

  return {
    enabled: true,
    ...(disabledEvents.length ? { disabled_events: disabledEvents } : {}),
    rules,
  };
}

export function getBirthdayNotificationRule(
  preferences: NotificationPreferences,
): NotificationRule | null {
  return extractRule(preferences, PEOPLE_BIRTHDAY_EVENT) ?? null;
}

export function getContactReminderNotificationRule(
  preferences: NotificationPreferences,
): NotificationRule | null {
  return extractRule(preferences, PEOPLE_CONTACT_REMINDER_EVENT) ?? null;
}

function resolvePeopleEventNotificationPreferences(
  payload: Pick<PersonPayload, "relationship" | "notifications">,
  settings: PeopleSettings,
  event: PeopleNotificationEvent,
): ResolvedPeopleBirthdayPreferences {
  const normalizedSettings = normalizePeopleSettings(settings);

  if (payload.notifications !== undefined) {
    const explicit = normalizeEventPreferences(payload.notifications, event);
    if (explicit) {
      return {
        preferences: explicit,
        origin: { kind: "person" },
      };
    }
  }

  const category =
    event === PEOPLE_BIRTHDAY_EVENT
      ? normalizedSettings.birthdayNotifications
      : normalizedSettings.contactNotifications;
  const relationshipPreference = category.relationships[payload.relationship];
  if (relationshipPreference) {
    return {
      preferences: relationshipPreference,
      origin: { kind: "relationship", relationship: payload.relationship },
    };
  }

  return {
    preferences: category.default,
    origin: { kind: "default" },
  };
}

export function resolvePeopleBirthdayNotificationPreferences(
  payload: Pick<PersonPayload, "relationship" | "notifications">,
  settings: PeopleSettings,
): ResolvedPeopleBirthdayPreferences {
  return resolvePeopleEventNotificationPreferences(
    payload,
    settings,
    PEOPLE_BIRTHDAY_EVENT,
  );
}

export function resolvePeopleContactReminderNotificationPreferences(
  payload: Pick<PersonPayload, "relationship" | "notifications">,
  settings: PeopleSettings,
): ResolvedPeopleBirthdayPreferences {
  return resolvePeopleEventNotificationPreferences(
    payload,
    settings,
    PEOPLE_CONTACT_REMINDER_EVENT,
  );
}
