import { describe, expect, it } from "vitest";
import {
  buildSuggestionNames,
  filterLists,
  formatUpdatedDate,
  partitionItems,
  parseSmartEntry,
  summarizeList,
} from "../helpers";
import type { ShoppingListDocument } from "../types";

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

  it("handles invalid list updated date", () => {
    expect(formatUpdatedDate("nonsense")).toBe("Unknown date");
  });

  it("returns summary stats for complete and partial lists", () => {
    expect(
      summarizeList({
        title: "Errands",
        items: [
          { id: "item-1", name: "Milk", purchased: false },
          { id: "item-2", name: "Bread", purchased: true },
          { id: "item-3", name: "Fruit", purchased: true },
        ],
        is_completed: false,
      }),
    ).toEqual({
      totalItems: 3,
      purchasedItems: 2,
      remainingItems: 1,
      completionPercent: 67,
    });
  });

  it("handles summarizeList with missing payload safely", () => {
    expect(summarizeList(undefined)).toEqual({
      totalItems: 0,
      purchasedItems: 0,
      remainingItems: 0,
      completionPercent: 0,
    });
  });

  it("filters shopping lists by completion state, search query, and date", () => {
    const lists: ShoppingListDocument[] = [
      {
        _id: "active-later",
        module_type: "shopping_list",
        is_public: false,
        payload: { title: "Weekend", items: [], is_completed: false },
        created_at: "2026-04-20T08:00:00.000Z",
        updated_at: "2026-04-20T08:00:00.000Z",
      },
      {
        _id: "active-earlier",
        module_type: "shopping_list",
        is_public: false,
        payload: { title: "Work", items: [], is_completed: false },
        created_at: "2026-04-18T08:00:00.000Z",
        updated_at: "2026-04-18T08:00:00.000Z",
      },
      {
        _id: "completed-workout",
        module_type: "shopping_list",
        is_public: false,
        payload: { title: "Workout", items: [], is_completed: true },
        created_at: "2026-04-19T08:00:00.000Z",
        updated_at: "2026-04-19T08:00:00.000Z",
      },
    ];

    const activeWeekend = filterLists(lists, "active", "week");
    expect(activeWeekend).toHaveLength(1);
    expect(activeWeekend[0]._id).toBe("active-later");

    const completed = filterLists(lists, "completed", "");
    expect(completed).toHaveLength(1);
    expect(completed[0]._id).toBe("completed-workout");
  });

  it("partitions purchased and remaining items without mutating input", () => {
    const items = [
      { id: "a", name: "Milk", purchased: true },
      { id: "b", name: "Bread", purchased: false },
      { id: "c", name: "Eggs", purchased: true },
    ];

    const partition = partitionItems(items);

    expect(partition.purchasedItems).toHaveLength(2);
    expect(partition.remainingItems).toHaveLength(1);
    expect(items).toHaveLength(3);
  });

  it("builds and ranks list suggestions without duplicates", () => {
    const lists: ShoppingListDocument[] = [
      {
        _id: "list-1",
        module_type: "shopping_list",
        is_public: false,
        payload: {
          title: "Dinner",
          is_completed: false,
          items: [
            { id: "1", name: "Milk", purchased: false },
            { id: "2", name: "Bread", purchased: true },
          ],
        },
        created_at: "2026-04-15T00:00:00.000Z",
        updated_at: "2026-04-15T00:00:00.000Z",
      },
      {
        _id: "list-2",
        module_type: "shopping_list",
        is_public: false,
        payload: {
          title: "Groceries",
          is_completed: false,
          items: [
            { id: "3", name: "Milk", purchased: true },
            { id: "4", name: "Apples", purchased: false },
            { id: "5", name: "Apples", purchased: false },
            { id: "6", name: "Zucchini", purchased: false },
          ],
        },
        created_at: "2026-04-16T00:00:00.000Z",
        updated_at: "2026-04-16T00:00:00.000Z",
      },
    ];

    expect(buildSuggestionNames(lists, "list-1")).toEqual([
      "Apples",
      "Zucchini",
    ]);
  });
});
