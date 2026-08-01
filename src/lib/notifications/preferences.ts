import { DEFAULT_RECURRING_NOTIFICATION_OFFSETS } from "./contracts";

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
