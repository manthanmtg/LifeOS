import { describe, expect, it, vi } from "vitest";
import {
  calculateNextDueDate,
  bmiCategory,
  createVaccinationRepeatDraft,
  calculateBMI,
  daysUntil,
  emptyPayload,
  formatDate,
  formatDateInput,
  getDueStatus,
  getInitials,
  getTodayDateInput,
  toISODate,
  uuid,
} from "../components/helpers";

describe("health helpers", () => {
  it("formats valid dates with en-IN locale style", () => {
    const date = "2026-04-19T14:30:00.000Z";
    const expected = new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    expect(formatDate(date)).toBe(expected);
  });

  it("returns em dash for missing or invalid date strings", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });

  it("formats datetime strings to date input slices", () => {
    expect(formatDateInput("2026-04-19T14:30:00.000Z")).toBe("2026-04-19");
    expect(formatDateInput("")).toBe("");
  });

  it("normalizes plain date strings and preserves iso timestamps", () => {
    expect(toISODate("2026-04-19")).toBe("2026-04-19T00:00:00.000Z");
    expect(toISODate("2026-04-19T14:30:00.000Z")).toBe(
      "2026-04-19T14:30:00.000Z",
    );
    expect(toISODate("")).toBe("");
  });

  it("derives due status from days until target date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));

    expect(getDueStatus("2026-04-25")).toBe("warning");
    expect(getDueStatus("2026-06-10")).toBe("ok");
    expect(getDueStatus("2026-04-10")).toBe("overdue");
    expect(getDueStatus()).toBe("none");

    vi.useRealTimers();
  });

  it("returns expected day offsets with today's midnight boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T00:01:00.000Z"));

    expect(daysUntil("2026-04-19")).toBe(0);
    expect(daysUntil("2026-04-20")).toBe(1);
    expect(daysUntil("2026-04-18")).toBe(-1);

    vi.useRealTimers();
  });

  it("extracts up to two initials from names", () => {
    expect(getInitials("Aria Patel")).toBe("AP");
    expect(getInitials("single")).toBe("S");
    expect(getInitials(" multiple   spaces  ")).toBe("MS");
  });

  it("calculates bmi and reports null for invalid measurements", () => {
    expect(calculateBMI(170, 65)).toBeCloseTo(22.49, 2);
    expect(calculateBMI(0, 65)).toBeNull();
    expect(calculateBMI(170, 0)).toBeNull();
    expect(calculateBMI(undefined, 65)).toBeNull();
  });

  it("maps bmi ranges into semantic categories", () => {
    expect(bmiCategory(17)).toEqual({
      label: "Underweight",
      color: "text-warning",
    });
    expect(bmiCategory(22.4)).toEqual({
      label: "Normal",
      color: "text-success",
    });
    expect(bmiCategory(27)).toEqual({
      label: "Overweight",
      color: "text-warning",
    });
    expect(bmiCategory(31)).toEqual({ label: "Obese", color: "text-danger" });
  });

  it("returns a stable shape for fresh empty health payloads", () => {
    const first = emptyPayload();
    const second = emptyPayload();

    expect(first).toMatchObject({
      name: "",
      type: "self",
      blood_group: "unknown",
      allergies: [],
      conditions: [],
      medications: [],
      vaccinations: [],
      visits: [],
      lab_results: [],
      measurements: [],
      documents: [],
      tags: [],
    });

    first.tags.push("seed");
    expect(second.tags).toHaveLength(0);
  });

  it("delegates uuid generation to the browser crypto API", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-0000-0000-000000000000",
    );

    expect(uuid()).toBe("00000000-0000-0000-0000-000000000000");

    vi.restoreAllMocks();
  });

  it("returns today's date input value using mocked clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T18:15:00.000Z"));

    expect(getTodayDateInput()).toBe("2026-04-19");

    vi.useRealTimers();
  });

  it("returns null for daysUntil when date input is missing", () => {
    expect(daysUntil()).toBeNull();
  });

  it("parses date only strings without UTC shift surprises", () => {
    expect(toISODate("2026-04-19")).toBe("2026-04-19T00:00:00.000Z");
    expect(daysUntil("2026-04-22")).toBeTypeOf("number");
  });

  it("calculates calendar-safe vaccine repeat due dates", () => {
    expect(calculateNextDueDate("2026-01-31", 1)).toBe("2026-02-28");
    expect(calculateNextDueDate("2024-01-31", 1)).toBe("2024-02-29");
    expect(calculateNextDueDate("2026-03-21", 12)).toBe("2027-03-21");
    expect(calculateNextDueDate("2026-03-21", undefined)).toBeUndefined();
  });

  it("creates a repeat draft without copying batch or certificate data", () => {
    expect(
      createVaccinationRepeatDraft({
        id: "vac-1",
        name: "Rabies",
        date_administered: "2026-03-21T00:00:00.000Z",
        next_due: "2027-03-21T00:00:00.000Z",
        provider: "Home Visit",
        batch_number: "BATCH-1",
        notes: "Annual booster",
        dose_label: "Booster",
        repeat_interval_months: 12,
        attachments: [
          {
            id: "attachment-1",
            filename: "certificate.pdf",
            data: "data:application/pdf;base64,Zm9v",
            content_type: "application/pdf",
            size: 3,
            uploaded_at: "2026-03-21T00:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject({
      name: "Rabies",
      provider: "Home Visit",
      notes: "Annual booster",
      dose_label: "Booster",
      repeat_interval_months: 12,
      batch_number: "",
      attachments: [],
    });
  });
});
