import { describe, expect, it } from "vitest";
import { CATEGORIES, PRIORITIES } from "../types";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CURR_SYM,
  EMPTY_FORM,
  PRIORITY_DOT,
  STATUS_STYLES,
} from "../constants";

describe("maintenance constants", () => {
  it("covers all category keys in icon config", () => {
    expect(Object.keys(CATEGORY_ICONS).sort()).toEqual([...CATEGORIES].sort());
  });

  it("covers all category keys in color config", () => {
    expect(Object.keys(CATEGORY_COLORS).sort()).toEqual([...CATEGORIES].sort());
  });

  it("uses icon components for every category", () => {
    Object.values(CATEGORY_ICONS).forEach((Icon) => {
      expect(typeof Icon).toBe("function");
    });
  });

  it("covers all status keys in style config", () => {
    expect(Object.keys(STATUS_STYLES).sort()).toEqual([
      "completed",
      "overdue",
      "skipped",
      "upcoming",
    ]);
  });

  it("covers all priority keys in dot style config", () => {
    expect(Object.keys(PRIORITY_DOT).sort()).toEqual([...PRIORITIES].sort());
  });

  it("defines supported currency symbols for common currencies", () => {
    expect(CURR_SYM).toMatchObject({
      AUD: "A$",
      BRL: "R$",
      CAD: "C$",
      CHF: "CHF",
      EUR: "€",
      GBP: "£",
      INR: "₹",
      JPY: "¥",
      USD: "$",
      CNY: "¥",
    });
  });

  it("keeps empty form defaults stable and explicit", () => {
    expect(EMPTY_FORM).toEqual({
      name: "",
      description: "",
      category: "home",
      service_type: "self",
      frequency_months: undefined,
      last_completed: undefined,
      next_due: undefined,
      estimated_cost: undefined,
      currency: "INR",
      priority: "medium",
      status: "upcoming",
      is_recurring: true,
      reminder_enabled: true,
      history: [],
      tags: [],
      notes: "",
    });
  });

  it("does not expose unexpected empty-form mutation across reads", () => {
    expect(EMPTY_FORM.history).toEqual([]);
    expect(EMPTY_FORM.tags).toEqual([]);
  });
});
