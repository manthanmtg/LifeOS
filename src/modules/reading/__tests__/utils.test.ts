import { describe, it, expect } from "vitest";
import { PRIORITY_ORDER, PRIORITY_STYLES, extractDomain, formatDate, parseIsoDate } from "../utils";

describe("reading utils", () => {
  describe("extractDomain", () => {
    it("extracts domain from url", () => {
      expect(extractDomain("https://www.google.com/search?q=test")).toBe(
        "google.com",
      );
      expect(extractDomain("https://github.com/manthanmtg/LifeOS")).toBe(
        "github.com",
      );
    });

    it("returns empty string for invalid url", () => {
      expect(extractDomain("not-a-url")).toBe("");
    });
  });

  describe("formatDate", () => {
    it("formats iso string", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      expect(formatDate(date.toISOString())).toBe(date.toLocaleDateString());
    });

    it("returns empty string for empty input", () => {
      expect(formatDate("")).toBe("");
    });

    it("returns empty string for invalid date", () => {
      expect(formatDate("invalid")).toBe("");
      expect(formatDate(undefined)).toBe("");
    });

    it("accepts iso strings without time component", () => {
      expect(formatDate("2024-02-29T00:00:00.000Z")).toBe(
        new Date("2024-02-29T00:00:00.000Z").toLocaleDateString(),
      );
    });
  });

  describe("parseIsoDate", () => {
    it("returns a finite timestamp for valid iso strings", () => {
      const parsed = parseIsoDate("2026-05-21T17:29:00Z");
      expect(parsed).toBeTypeOf("number");
      expect(Number.isFinite(parsed)).toBe(true);
    });

    it("returns null for empty input", () => {
      expect(parseIsoDate("")).toBeNull();
    });

    it("returns null for malformed input", () => {
      expect(parseIsoDate("not-a-date")).toBeNull();
    });

    it("returns null for whitespace-only input", () => {
      expect(parseIsoDate("   ")).toBeNull();
    });
  });

  describe("priority helpers", () => {
    it("defines styles and ordering for all priorities", () => {
      expect(PRIORITY_ORDER).toEqual({ high: 0, medium: 1, low: 2 });
      expect(PRIORITY_STYLES.high).toContain("text-danger");
      expect(PRIORITY_STYLES.medium).toContain("text-warning");
      expect(PRIORITY_STYLES.low).toContain("text-success");
    });
  });
});
