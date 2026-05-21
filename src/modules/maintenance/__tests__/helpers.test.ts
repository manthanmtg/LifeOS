import { describe, expect, it, vi } from "vitest";
import {
  addMonths,
  capitalize,
  computeStatus,
  daysUntilDue,
  dueProgressPercent,
  formatDate,
  formatFrequency,
  todayISO,
} from "../helpers";
import type { MaintenancePayload } from "../types";

describe("maintenance helpers", () => {
  it("formats frequency labels for common cadences", () => {
    expect(formatFrequency(undefined)).toBe("One-time");
    expect(formatFrequency(1)).toBe("Every month");
    expect(formatFrequency(2)).toBe("Every 2 months");
    expect(formatFrequency(6)).toBe("Every 6 months");
    expect(formatFrequency(12)).toBe("Every year");
    expect(formatFrequency(24)).toBe("Every 2 years");
    expect(formatFrequency(13)).toBe("Every 13 months");
  });

  it("formats dates for public display using en-IN locale", () => {
    expect(formatDate(undefined)).toBe("--");
    expect(formatDate("not-a-date")).toBe("--");
    expect(formatDate("2026-05-21T12:00:00.000Z")).toContain("2026");
    expect(formatDate("2026-05-21T12:00:00.000Z")).toMatch(/May/);
  });

  it("keeps completed and skipped statuses unchanged", () => {
    const task: MaintenancePayload = {
      name: "Smoke",
      category: "home",
      service_type: "self",
      currency: "USD",
      priority: "low",
      status: "completed",
      is_recurring: true,
      reminder_enabled: true,
      history: [],
      tags: [],
    };

    expect(computeStatus({ ...task, status: "completed" }, new Date())).toBe(
      "completed",
    );
    expect(computeStatus({ ...task, status: "skipped" }, new Date())).toBe(
      "skipped",
    );
  });

  it("classifies recurring tasks without due date as upcoming", () => {
    const task: MaintenancePayload = {
      name: "Oil Change",
      category: "vehicle",
      service_type: "managed",
      currency: "USD",
      priority: "medium",
      status: "upcoming",
      is_recurring: true,
      reminder_enabled: true,
      history: [],
      tags: [],
    };

    expect(computeStatus(task, new Date("2026-05-21T12:00:00.000Z"))).toBe(
      "upcoming",
    );
  });

  it("marks past due dates as overdue and future due dates as upcoming", () => {
    const task: MaintenancePayload = {
      name: "Filter",
      category: "electronics",
      service_type: "self",
      currency: "USD",
      priority: "medium",
      status: "upcoming",
      is_recurring: true,
      reminder_enabled: true,
      history: [],
      tags: [],
      next_due: "2026-05-20T00:00:00.000Z",
    };

    expect(computeStatus(task, new Date("2026-05-21T12:00:00.000Z"))).toBe(
      "overdue",
    );
    expect(
      computeStatus(
        { ...task, next_due: "2026-05-30T00:00:00.000Z" },
        new Date("2026-05-21T12:00:00.000Z"),
      ),
    ).toBe("upcoming");
  });

  it("computes days until due using local day boundaries", () => {
    expect(daysUntilDue(undefined, new Date("2026-05-21T12:00:00.000Z"))).toBe(
      null,
    );
    expect(
      daysUntilDue(
        "2026-05-22T00:00:00.000Z",
        new Date("2026-05-21T12:00:00.000Z"),
      ),
    ).toBe(1);
    expect(
      daysUntilDue(
        "2026-05-20T00:00:00.000Z",
        new Date("2026-05-21T12:00:00.000Z"),
      ),
    ).toBe(-1);
  });

  it("clamps due progress percent within 0 to 100", () => {
    const now = new Date("2026-05-21T12:00:00.000Z");

    expect(
      dueProgressPercent(
        "2026-05-20T12:00:00.000Z",
        "2026-05-19T12:00:00.000Z",
        now,
      ),
    ).toBe(100);

    expect(dueProgressPercent(undefined, "2026-06-01T12:00:00.000Z", now)).toBe(
      0,
    );
    expect(
      dueProgressPercent(
        "2026-05-22T12:00:00.000Z",
        "2026-05-23T12:00:00.000Z",
        now,
      ),
    ).toBe(0);
    expect(
      dueProgressPercent(
        "2026-05-20T12:00:00.000Z",
        "2026-05-22T12:00:00.000Z",
        now,
      ),
    ).toBe(50);
  });

  it("shifts month values and keeps ISO format", () => {
    expect(addMonths("2026-01-31T00:00:00.000Z", 1)).toContain("2026-03");
    expect(addMonths("2026-01-31T00:00:00.000Z", 2)).toContain("2026-03");
  });

  it("capitalizes and handles empty strings", () => {
    expect(capitalize("maintenance")).toBe("Maintenance");
    expect(capitalize("")).toBe("");
  });

  it("returns mocked system time via todayISO", () => {
    const now = new Date("2026-05-21T09:42:11.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(todayISO()).toBe(now.toISOString());
    vi.useRealTimers();
  });
});
