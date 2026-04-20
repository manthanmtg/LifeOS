import { describe, it, expect } from "vitest";
import {
  formatDate,
  highlightCode,
  withLineNumbers,
} from "../components/types";

describe("Snippets module helpers", () => {
  describe("formatDate", () => {
    it("formats ISO date string correctly", () => {
      expect(formatDate("2023-10-27T10:00:00.000Z")).toContain("Oct 27, 2023");
    });

    it("returns empty string for invalid date", () => {
      expect(formatDate("invalid-date")).toBe("");
    });

    it("returns empty string for empty input", () => {
      expect(formatDate("")).toBe("");
    });
  });

  describe("highlightCode", () => {
    it("highlights keywords", () => {
      const code = "const x = 1;";
      const highlighted = highlightCode(code);
      expect(highlighted).toContain("text-accent");
      expect(highlighted).toContain("const");
    });

    it("highlights strings", () => {
      const code = 'const x = "hello";';
      const highlighted = highlightCode(code);
      expect(highlighted).toContain("text-success");
      expect(highlighted).toContain('"hello"');
    });

    it("handles special characters by escaping them", () => {
      const code = "if (a < b && b > c)";
      const highlighted = highlightCode(code);
      expect(highlighted).toContain("&lt;");
      expect(highlighted).toContain("&gt;");
      expect(highlighted).toContain("&amp;&amp;");
    });
  });

  describe("withLineNumbers", () => {
    it("adds line numbers with correct formatting", () => {
      const code = "line1\nline2";
      const result = withLineNumbers(code);
      expect(result).toContain("01");
      expect(result).toContain("02");
      expect(result).toContain("text-zinc-600");
    });
  });
});
