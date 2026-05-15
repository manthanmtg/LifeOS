import { describe, it, expect } from "vitest";
import { formatNumber, formatCurrency } from "../formatters";

describe("formatters", () => {
  describe("formatNumber", () => {
    it("formats correctly in western system", () => {
      expect(formatNumber(1234.56, "western", 2)).toBe("1,234.56");
      expect(formatNumber(1234567.89, "western", 2)).toBe("1,234,567.89");
    });

    it("formats correctly in indian system", () => {
      expect(formatNumber(1234567, "indian", 0)).toBe("12,34,567");
      expect(formatNumber(100, "indian", 0)).toBe("100");
      expect(formatNumber(1000, "indian", 0)).toBe("1,000");
      expect(formatNumber(10000, "indian", 0)).toBe("10,000");
      expect(formatNumber(100000, "indian", 0)).toBe("1,00,000");
      expect(formatNumber(10000000, "indian", 0)).toBe("1,00,00,000");
    });

    it("handles decimals correctly in both systems", () => {
      expect(formatNumber(12345.6789, "indian", 2)).toBe("12,345.68");
      expect(formatNumber(12345.6789, "western", 2)).toBe("12,345.68");
    });

    it("handles zero correctly", () => {
      expect(formatNumber(0, "western", 0)).toBe("0");
      expect(formatNumber(0, "indian", 2)).toBe("0.00");
    });

    it("formats negative numbers without grouping the minus sign", () => {
      expect(formatNumber(-100, "indian", 0)).toBe("-100");
      expect(formatNumber(-1000, "indian", 0)).toBe("-1,000");
      expect(formatNumber(-100000, "indian", 0)).toBe("-1,00,000");
      expect(formatNumber(-1234567.89, "indian", 2)).toBe("-12,34,567.89");
      expect(formatNumber(-1234567.89, "western", 2)).toBe("-1,234,567.89");
    });

    it("defaults to western system", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
    });
  });

  describe("formatCurrency", () => {
    it("prefixes with symbol and formats correctly", () => {
      expect(formatCurrency(100, "₹", "indian")).toBe("₹100");
      expect(formatCurrency(1234567, "$", "western", 2)).toBe("$1,234,567.00");
      expect(formatCurrency(1234567, "₹", "indian", 0)).toBe("₹12,34,567");
    });

    it("preserves the sign after the currency symbol", () => {
      expect(formatCurrency(-100, "₹", "indian")).toBe("₹-100");
      expect(formatCurrency(-1234567.89, "$", "western", 2)).toBe(
        "$-1,234,567.89",
      );
    });
  });
});
