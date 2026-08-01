import { describe, expect, it } from "vitest";

import {
  getBirthdayAgeTurning,
  getBirthdayOccurrenceDate,
  getCalendarDayDifference,
} from "../birthday";

describe("people birthday helpers", () => {
  it("builds annual occurrence dates from stored birthdays", () => {
    expect(getBirthdayOccurrenceDate("1992-04-25", 2027)).toBe("2027-04-25");
  });

  it("maps February 29 birthdays to March 1 in non-leap years", () => {
    expect(getBirthdayOccurrenceDate("2000-02-29", 2024)).toBe("2024-02-29");
    expect(getBirthdayOccurrenceDate("2000-02-29", 2025)).toBe("2025-03-01");
  });

  it("returns null for invalid birthday inputs", () => {
    expect(getBirthdayOccurrenceDate("2000-02-30", 2027)).toBeNull();
    expect(getBirthdayAgeTurning("not-a-date", 2027)).toBeNull();
  });

  it("calculates age using the occurrence year and leap-day policy", () => {
    expect(getBirthdayAgeTurning("1992-04-25", 2027)).toBe(35);
    expect(getBirthdayAgeTurning("2000-02-29", 2025)).toBe(24);
  });

  it("calculates UTC calendar day differences", () => {
    expect(getCalendarDayDifference("2026-12-31", "2027-01-01")).toBe(1);
    expect(getCalendarDayDifference("2027-01-01", "2026-12-31")).toBe(-1);
  });
});
