import { describe, expect, it } from "vitest";
import {
  parseNonNegativeIntegerField,
  parseOptionalPositiveIntegerField,
} from "../components/types";

describe("Bookshelf module helpers", () => {
  it("parses optional positive integer fields before submission", () => {
    expect(parseOptionalPositiveIntegerField("", "Total pages")).toEqual({
      value: undefined,
    });
    expect(parseOptionalPositiveIntegerField("320", "Total pages")).toEqual({
      value: 320,
    });
    expect(parseOptionalPositiveIntegerField("10.5", "Total pages")).toEqual({
      error: "Total pages must be a positive whole number",
    });
  });

  it("parses non-negative current page fields before submission", () => {
    expect(parseNonNegativeIntegerField("", "Current page")).toEqual({
      value: 0,
    });
    expect(parseNonNegativeIntegerField("4.5", "Current page")).toEqual({
      error: "Current page must be zero or a positive whole number",
    });
  });
});
