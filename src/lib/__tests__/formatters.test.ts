import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber } from "../formatters";

describe("formatNumber", () => {
  it("formats western numbers with comma grouping", () => {
    expect(formatNumber(1234567.89)).toBe("1,234,568");
  });

  it("supports configured decimal places", () => {
    expect(formatNumber(1234.5678, "western", 2)).toBe("1,234.57");
  });

  it("formats indian system with lakh/crore separators", () => {
    expect(formatNumber(1234567.89, "indian", 2)).toBe("12,34,567.89");
  });

  it("handles zero and negative values consistently", () => {
    expect(formatNumber(-12.5, "western", 0)).toBe("-13");
    expect(formatNumber(0, "indian")).toBe("0");
  });

  it("throws when decimals are invalid", () => {
    expect(() => formatNumber(12.34, "western", -1)).toThrow(RangeError);
  });
});

describe("formatCurrency", () => {
  it("prepends currency symbol after formatting", () => {
    expect(formatCurrency(1200.5, "₹", "indian", 1)).toBe("₹1,200.5");
  });
});
