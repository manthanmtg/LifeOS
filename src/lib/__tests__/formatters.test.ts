import { describe, expect, it } from "vitest";

import { formatCurrency, formatNumber } from "../formatters";

describe("formatters", () => {
  it("formats western integers with default locale commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats western numbers with fixed decimals", () => {
    expect(formatNumber(1234.56, "western", 2)).toBe("1,234.56");
  });

  it("pads western decimal places when the value has fewer decimals", () => {
    expect(formatNumber(1200.5, "western", 3)).toBe("1,200.500");
  });

  it("formats western numbers with rounding", () => {
    expect(formatNumber(12.3456, "western", 2)).toBe("12.35");
    expect(formatNumber(-12.3456, "western", 2)).toBe("-12.35");
  });

  it("formats western zero with configured decimals", () => {
    expect(formatNumber(0, "western", 2)).toBe("0.00");
  });

  it("formats indian style for short values without commas", () => {
    expect(formatNumber(123, "indian")).toBe("123");
    expect(formatNumber(-999, "indian", 2)).toBe("-999.00");
  });

  it("formats indian style at thousands boundary", () => {
    expect(formatNumber(1234, "indian")).toBe("1,234");
  });

  it("formats indian style at lakh boundary", () => {
    expect(formatNumber(123456, "indian")).toBe("1,23,456");
  });

  it("formats indian style for large values", () => {
    expect(formatNumber(12345678.9, "indian", 2)).toBe("1,23,45,678.90");
    expect(formatNumber(-7654321, "indian")).toBe("-76,54,321");
  });

  it("normalizes negative zero to zero in formatted output", () => {
    expect(formatNumber(-0.004, "indian", 2)).toBe("0.00");
    expect(formatNumber(-0.004, "western", 2)).toBe("0.00");
  });

  it("formats currency with configured symbol and format", () => {
    expect(formatCurrency(1234.5, "₹", "indian", 1)).toBe("₹1,234.5");
    expect(formatCurrency(-1234.5, "$", "western", 2)).toBe("$-1,234.50");
  });

  it("formats currency without forcing a symbol", () => {
    expect(formatCurrency(1234.5, "", "western", 2)).toBe("1,234.50");
  });
});
