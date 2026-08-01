import { describe, expect, it } from "vitest";

import type { NotificationCandidate } from "../contracts";
import {
  addDaysToCalendarDate,
  getCalendarDateInTimezone,
  isCandidateDue,
  resolveLocalDateTimeToUtc,
  validateIanaTimezone,
} from "../time";

const candidate: NotificationCandidate = {
  source: {
    module_type: "recurring_expense",
    document_id: "64f0f0f0f0f0f0f0f0f0f0f0",
    event: "renewal",
    event_date: "2026-07-31",
  },
  scheduled_date: "2026-07-30",
  offset_days: 1,
  message: {
    title: "Netflix renews tomorrow",
    body: "INR 649 · Monthly · 31 Jul 2026",
  },
};

describe("notification time helpers", () => {
  it("validates IANA timezone names", () => {
    expect(validateIanaTimezone("Asia/Kolkata")).toBe(true);
    expect(validateIanaTimezone("Mars/Base")).toBe(false);
  });

  it("adds calendar days across leap-day and month boundaries", () => {
    expect(addDaysToCalendarDate("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDaysToCalendarDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToCalendarDate("2026-07-31", 0)).toBe("2026-07-31");
  });

  it("resolves a configured local delivery hour to UTC", () => {
    expect(
      resolveLocalDateTimeToUtc("2026-07-30", 9, "Asia/Kolkata")
        .toISOString()
        .slice(0, 19),
    ).toBe("2026-07-30T03:30:00");
  });

  it("returns the calendar date in the configured timezone", () => {
    expect(
      getCalendarDateInTimezone(
        new Date("2026-12-31T20:00:00.000Z"),
        "Asia/Kolkata",
      ),
    ).toBe("2027-01-01");
    expect(
      getCalendarDateInTimezone(
        new Date("2027-01-01T02:00:00.000Z"),
        "America/Los_Angeles",
      ),
    ).toBe("2026-12-31");
  });

  it("treats a candidate as due only after the local delivery hour", () => {
    const settings = {
      enabled: true,
      timezone: "Asia/Kolkata",
      deliveryHour: 9,
      catchUpHours: 36,
    };

    expect(
      isCandidateDue(candidate, settings, new Date("2026-07-30T03:29:59.000Z")),
    ).toBe(false);
    expect(
      isCandidateDue(candidate, settings, new Date("2026-07-30T03:30:00.000Z")),
    ).toBe(true);
  });

  it("excludes candidates older than the catch-up window", () => {
    expect(
      isCandidateDue(
        candidate,
        {
          enabled: true,
          timezone: "UTC",
          deliveryHour: 9,
          catchUpHours: 1,
        },
        new Date("2026-07-30T10:00:01.000Z"),
      ),
    ).toBe(false);
  });
});
