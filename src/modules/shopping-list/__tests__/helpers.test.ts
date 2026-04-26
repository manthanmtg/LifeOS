import { describe, expect, it } from "vitest";
import { parseSmartEntry } from "../helpers";

describe("Shopping List Helpers - parseSmartEntry", () => {
  it("parses name only", () => {
    expect(parseSmartEntry("Milk")).toEqual({ name: "Milk" });
  });

  it("parses name with space-separated quantity and unit (original format)", () => {
    expect(parseSmartEntry("Milk 2 ltr")).toEqual({
      name: "Milk",
      quantity: "2",
      unit: "ltr",
    });
  });

  it("parses quantity and name (new format: quantity first)", () => {
    expect(parseSmartEntry("10 eggs")).toEqual({
      name: "eggs",
      quantity: "10",
      unit: undefined,
    });
  });

  it("parses quantity, unit, and name (new format: quantity + unit first)", () => {
    expect(parseSmartEntry("2kg Milk")).toEqual({
      name: "Milk",
      quantity: "2",
      unit: "kg",
    });
  });

  it("parses name, comma, quantity, and unit", () => {
    expect(parseSmartEntry("Apples, 1.5kg")).toEqual({
      name: "Apples",
      quantity: "1.5",
      unit: "kg",
    });
  });

  it("parses decimal quantities", () => {
    expect(parseSmartEntry("1.5 ltr Water")).toEqual({
      name: "Water",
      quantity: "1.5",
      unit: "ltr",
    });
  });

  it("handles leading/trailing spaces", () => {
    expect(parseSmartEntry("  2 kg  Apples  ")).toEqual({
      name: "Apples",
      quantity: "2",
      unit: "kg",
    });
  });
});
