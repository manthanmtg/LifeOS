import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, getCategoryColor } from "../types";

const forbiddenHuePattern =
  /\b(?:orange|purple|pink|cyan|rose|indigo|teal|violet|fuchsia|lime)-/;

describe("expense category styling", () => {
  it("uses semantic category chip classes for default and dynamic categories", () => {
    const defaultClasses = DEFAULT_CATEGORIES.map((category) =>
      getCategoryColor(category, DEFAULT_CATEGORIES),
    );
    const dynamicClasses = [
      getCategoryColor("Groceries", ["Groceries"]),
      getCategoryColor("Consulting", ["Groceries", "Consulting"]),
    ];

    [...defaultClasses, ...dynamicClasses].forEach((classes) => {
      expect(classes).not.toMatch(forbiddenHuePattern);
    });
  });
});
