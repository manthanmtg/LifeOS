import { describe, it, expect } from "vitest";
import {
  formatMoney,
  amountInWords,
  computeEmiFromFormula,
  roundTo,
  toDateInputValue,
  getOutstandingAsOf,
} from "../emi-utils";
import { ScheduleRow } from "../../types";

describe("emi-utils", () => {
  describe("roundTo", () => {
    it("should round to specified decimals", () => {
      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.2355, 2)).toBe(1.24);
      expect(roundTo(100.999, 0)).toBe(101);
    });
  });

  describe("formatMoney", () => {
    it("should format money in western format by default", () => {
      expect(formatMoney(1234567.89, "$")).toBe("$1,234,568");
      expect(formatMoney(1000, "€")).toBe("€1,000");
    });

    it("should format money in indian format if specified", () => {
      expect(formatMoney(1234567.89, "₹", 0, "indian")).toBe("₹12,34,568");
      expect(formatMoney(100000, "₹", 0, "indian")).toBe("₹1,00,000");
    });

    it("should fallback to 0 for invalid numbers", () => {
      expect(formatMoney(NaN, "$")).toBe("$0");
      expect(formatMoney(Infinity, "$")).toBe("$0");
    });
  });

  describe("toDateInputValue", () => {
    it("should return YYYY-MM-DD from an ISO string", () => {
      expect(toDateInputValue("2026-05-24T12:00:00Z")).toBe("2026-05-24");
    });

    it("should return empty string for invalid dates", () => {
      expect(toDateInputValue("invalid date")).toBe("");
    });
  });

  describe("amountInWords", () => {
    it("should correctly convert numeric strings to Indian words", () => {
      expect(amountInWords("1234")).toBe("One Thousand Two Hundred Thirty Four Rupees");
      expect(amountInWords("100000")).toBe("One Lakh Rupees");
      expect(amountInWords("150.50")).toBe("One Hundred Fifty Rupees and Fifty Paise");
      expect(amountInWords("0")).toBe("Zero Rupees");
    });

    it("should strip non-numeric characters", () => {
      expect(amountInWords("$1,234.00")).toBe("One Thousand Two Hundred Thirty Four Rupees");
    });

    it("should return empty string if no numbers are present", () => {
      expect(amountInWords("abc")).toBe("");
    });
  });

  describe("computeEmiFromFormula", () => {
    it("should return correct EMI", () => {
      // 100,000 principal, 10% annual rate, 12 months
      const emi = computeEmiFromFormula(100000, 10, 12);
      expect(Math.round(emi)).toBe(8792);
    });

    it("should handle 0% interest rate", () => {
      const emi = computeEmiFromFormula(120000, 0, 12);
      expect(emi).toBe(10000);
    });

    it("should handle 0 months", () => {
      const emi = computeEmiFromFormula(100000, 10, 0);
      expect(emi).toBe(0);
    });
  });

  describe("getOutstandingAsOf", () => {
    const mockSchedule: ScheduleRow[] = [
      {
        index: 1,
        due_date: "2026-01-01T12:00:00.000Z",
        opening_balance: 1000,
        emi: 100,
        interest: 10,
        principal: 90,
        prepayment: 0,
        closing_balance: 910,
        annual_rate: 10,
      },
      {
        index: 2,
        due_date: "2026-02-01T12:00:00.000Z",
        opening_balance: 910,
        emi: 100,
        interest: 9,
        principal: 91,
        prepayment: 0,
        closing_balance: 819,
        annual_rate: 10,
      },
    ];

    it("should return correct outstanding before any payments", () => {
      const asOf = new Date("2025-12-01T12:00:00.000Z");
      const res = getOutstandingAsOf(mockSchedule, asOf);
      expect(res.outstanding).toBe(1000); // 0th opening
      expect(res.nextDue?.index).toBe(1);
      expect(res.lastDue).toBeNull();
    });

    it("should return correct outstanding exactly on the first payment date", () => {
      const asOf = new Date("2026-01-01T12:00:00.000Z");
      const res = getOutstandingAsOf(mockSchedule, asOf);
      expect(res.outstanding).toBe(1000);
      expect(res.nextDue?.index).toBe(1);
      expect(res.lastDue).toBeNull();
    });

    it("should return correct outstanding between payments", () => {
      const asOf = new Date("2026-01-15T12:00:00.000Z");
      const res = getOutstandingAsOf(mockSchedule, asOf);
      expect(res.outstanding).toBe(910); // closing of 1st
      expect(res.nextDue?.index).toBe(2);
      expect(res.lastDue?.index).toBe(1);
    });

    it("should return correct outstanding after all payments", () => {
      const asOf = new Date("2026-03-01T12:00:00.000Z");
      const res = getOutstandingAsOf(mockSchedule, asOf);
      expect(res.outstanding).toBe(819); // closing of 2nd
      expect(res.nextDue).toBeNull();
      expect(res.lastDue?.index).toBe(2);
    });

    it("should return 0/nulls if schedule is empty", () => {
      const res = getOutstandingAsOf([], new Date());
      expect(res.outstanding).toBe(0);
      expect(res.nextDue).toBeNull();
      expect(res.lastDue).toBeNull();
    });
  });
});
