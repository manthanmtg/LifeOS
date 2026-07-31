import type { NotificationPreferences } from "./contracts";
import { DEFAULT_RECURRING_NOTIFICATION_OFFSETS } from "./contracts";
import { NotificationPreferencesSchema } from "./schemas";

export function normalizeNotificationOffsetsDays(
  offsets: unknown,
  fallback: number[] = DEFAULT_RECURRING_NOTIFICATION_OFFSETS,
): number[] {
  const values = Array.isArray(offsets) ? offsets : fallback;
  const normalized = [...new Set(values)]
    .filter((value): value is number => Number.isInteger(value))
    .filter((value) => value >= 0 && value <= 365)
    .sort((a, b) => a - b)
    .slice(0, 10);

  return normalized.length > 0
    ? normalized
    : DEFAULT_RECURRING_NOTIFICATION_OFFSETS;
}

export function resolveRecurringExpenseNotificationPreferences(
  payload: unknown,
  defaultOffsetsDays: unknown,
): NotificationPreferences {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const explicit = NotificationPreferencesSchema.safeParse(
    record.notifications,
  );
  if (explicit.success) return explicit.data;

  const enabled = record.enable_reminders !== false;
  if (!enabled) return { enabled: false, rules: [] };

  return {
    enabled: true,
    rules: [
      {
        event: "renewal",
        offsets_days: normalizeNotificationOffsetsDays(defaultOffsetsDays),
      },
    ],
  };
}

export function buildRecurringRenewalNotificationPreferences(
  enabled: boolean,
  offsetsDays: number[],
): NotificationPreferences {
  if (!enabled) return { enabled: false, rules: [] };

  return {
    enabled: true,
    rules: [
      {
        event: "renewal",
        offsets_days: normalizeNotificationOffsetsDays(offsetsDays),
      },
    ],
  };
}

export function getRecurringRenewalOffsets(
  preferences: NotificationPreferences,
  fallback: number[] = DEFAULT_RECURRING_NOTIFICATION_OFFSETS,
): number[] {
  const rule = preferences.rules.find((item) => item.event === "renewal");
  return normalizeNotificationOffsetsDays(rule?.offsets_days, fallback);
}
