import type { NotificationCandidate, NotificationSettings } from "./contracts";

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function validateIanaTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function getFormatter(timezone: string) {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatterCache.set(timezone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = getFormatter(timezone).formatToParts(date);
  const values: Partial<Record<keyof ZonedParts, number>> = {};

  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second"
    ) {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

function toComparable(parts: ZonedParts): number {
  return (
    parts.year * 10_000_000_000 +
    parts.month * 100_000_000 +
    parts.day * 1_000_000 +
    parts.hour * 10_000 +
    parts.minute * 100 +
    parts.second
  );
}

function parseCalendarDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid calendar date: ${date}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function addDaysToCalendarDate(date: string, days: number): string {
  const { year, month, day } = parseCalendarDate(date);
  const utc = Date.UTC(year, month - 1, day + days, 0, 0, 0, 0);
  return new Date(utc).toISOString().slice(0, 10);
}

export function resolveLocalDateTimeToUtc(
  calendarDate: string,
  hour: number,
  timezone: string,
): Date {
  if (!validateIanaTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const { year, month, day } = parseCalendarDate(calendarDate);
  const desired: ZonedParts = {
    year,
    month,
    day,
    hour,
    minute: 0,
    second: 0,
  };
  const desiredComparable = toComparable(desired);
  const anchor = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  const start = anchor - 48 * 60 * 60 * 1000;
  const end = anchor + 48 * 60 * 60 * 1000;

  let firstAfterGap: Date | null = null;

  for (let instant = start; instant <= end; instant += 60 * 1000) {
    const date = new Date(instant);
    const parts = getZonedParts(date, timezone);
    const comparable = toComparable(parts);

    if (comparable === desiredComparable) {
      return date;
    }

    if (firstAfterGap === null && comparable > desiredComparable) {
      firstAfterGap = date;
    }
  }

  if (firstAfterGap) return firstAfterGap;
  throw new Error(`Could not resolve local delivery time for ${calendarDate}`);
}

export function isCandidateDue(
  candidate: NotificationCandidate,
  settings: NotificationSettings,
  now: Date,
): boolean {
  const scheduledAt = resolveLocalDateTimeToUtc(
    candidate.scheduled_date,
    settings.deliveryHour,
    settings.timezone,
  );

  if (scheduledAt.getTime() > now.getTime()) return false;

  const catchUpStartsAt =
    now.getTime() - settings.catchUpHours * 60 * 60 * 1000;
  return scheduledAt.getTime() >= catchUpStartsAt;
}
