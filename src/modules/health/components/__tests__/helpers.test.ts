import { describe, expect, it, vi } from "vitest";

import {
  bmiCategory,
  calculateBMI,
  daysUntil,
  formatDate,
  formatDateInput,
  getDueStatus,
  getInitials,
  getTodayDateInput,
  toISODate,
  uuid,
} from "../helpers";

describe("health helpers", () => {
  it("formatDate returns an em dash for empty input", () => {
    expect(formatDate("")).toBe("—");
  });

  it("formatDate localizes supported date strings", () => {
    expect(formatDate("2026-01-02T00:00:00.000Z")).toBe("2 Jan 2026");
  });

  it("formatDateInput normalizes full timestamps", () => {
    expect(formatDateInput("2026-01-02T10:20:30.000Z")).toBe("2026-01-02");
  });

  it("formatDateInput handles undefined", () => {
    expect(formatDateInput(undefined)).toBe("");
  });

  it("getTodayDateInput is based on system date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T15:45:00.000Z"));

    expect(getTodayDateInput()).toBe("2026-05-21");

    vi.useRealTimers();
  });

  it("toISODate appends midnight when only date is provided", () => {
    expect(toISODate("2026-06-01")).toBe("2026-06-01T00:00:00.000Z");
  });

  it("toISODate passes through full ISO strings", () => {
    expect(toISODate("2026-06-01T12:00:00.000Z")).toBe(
      "2026-06-01T12:00:00.000Z",
    );
  });

  it("toISODate handles empty input", () => {
    expect(toISODate("")).toBe("");
  });

  it("daysUntil computes deltas from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T08:30:00.000Z"));

    expect(daysUntil("2026-05-21")).toBe(0);
    expect(daysUntil("2026-05-23")).toBe(2);
    expect(daysUntil("2026-05-19")).toBe(-2);

    vi.useRealTimers();
  });

  it("getDueStatus maps day distance to severity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T08:30:00.000Z"));

    expect(getDueStatus(undefined)).toBe("none");
    expect(getDueStatus("2026-05-19")).toBe("overdue");
    expect(getDueStatus("2026-05-29")).toBe("warning");
    expect(getDueStatus("2026-06-30")).toBe("ok");

    vi.useRealTimers();
  });

  it("getInitials returns a two-character uppercase abbreviation", () => {
    expect(getInitials("Alice Brown")).toBe("AB");
  });

  it("calculateBMI returns null for invalid inputs", () => {
    expect(calculateBMI(undefined, 70)).toBe(null);
    expect(calculateBMI(0, 70)).toBe(null);
    expect(calculateBMI(170, 0)).toBe(null);
  });

  it("calculateBMI computes BMI from centimeters and kilograms", () => {
    const bmi = calculateBMI(170, 63);
    expect(bmi).not.toBeNull();
    expect(Math.round((bmi as number) * 10) / 10).toBe(21.8);
  });

  it("bmiCategory groups BMI buckets", () => {
    expect(bmiCategory(18.4)).toEqual({
      label: "Underweight",
      color: "text-warning",
    });
    expect(bmiCategory(22)).toEqual({ label: "Normal", color: "text-success" });
    expect(bmiCategory(29.9)).toEqual({
      label: "Overweight",
      color: "text-warning",
    });
    expect(bmiCategory(30)).toEqual({ label: "Obese", color: "text-danger" });
  });

  it("uuid uses crypto.randomUUID", () => {
    const randomUUIDMock = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-0000-0000-000000000000");

    expect(uuid()).toBe("00000000-0000-0000-0000-000000000000");

    randomUUIDMock.mockRestore();
  });
});
