import { describe, it, expect } from "vitest";
import { extractDomain, formatDate } from "../utils";

describe("reading utils", () => {
  describe("extractDomain", () => {
    it("extracts domain from url", () => {
      expect(extractDomain("https://www.google.com/search?q=test")).toBe("google.com");
      expect(extractDomain("https://github.com/manthanmtg/LifeOS")).toBe("github.com");
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

    it("returns empty string for invalid date", () => {
      expect(formatDate("invalid")).toBe("");
      expect(formatDate(undefined)).toBe("");
    });
  });
});
