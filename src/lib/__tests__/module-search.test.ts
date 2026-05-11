import { describe, expect, it } from "vitest";
import { getModuleSearchResults, highlightText } from "@/lib/module-search";
import type { AdminModuleItem } from "@/lib/admin-modules";

const modules: AdminModuleItem[] = [
  {
    key: "expenses",
    href: "/admin/expenses",
    name: "Expenses",
    description: "Track spending, categories, and day-to-day costs.",
    tags: ["money", "finance", "budget"],
    icon: "DollarSign",
  },
  {
    key: "todo",
    href: "/admin/todo",
    name: "Todo",
    description: "Task capture, prioritization, and completion flow.",
    tags: ["tasks", "checklist", "productivity"],
    icon: "CheckSquare",
  },
  {
    key: "ai-usage",
    href: "/admin/ai-usage",
    name: "AI Usage",
    description: "Track provider costs and token limits.",
    tags: ["ai", "providers", "budget"],
    icon: "Bot",
  },
];

describe("module-search", () => {
  it("returns every module in registry order for a blank query", () => {
    const results = getModuleSearchResults(modules, "   ");

    expect(results.map((result) => result.item.key)).toEqual([
      "expenses",
      "todo",
      "ai-usage",
    ]);
    expect(results.map((result) => result.score)).toEqual([3, 2, 1]);
  });

  it("scores direct name matches ahead of tag matches", () => {
    const results = getModuleSearchResults(modules, "exp");

    expect(results[0]?.item.key).toBe("expenses");
  });

  it("matches across tags and descriptions", () => {
    const financeResults = getModuleSearchResults(modules, "finance");
    const taskResults = getModuleSearchResults(modules, "prior");

    expect(financeResults[0]?.item.key).toBe("expenses");
    expect(taskResults[0]?.item.key).toBe("todo");
  });

  it("matches hyphenated module slugs as searchable words", () => {
    const results = getModuleSearchResults(modules, "usage");

    expect(results[0]?.item.key).toBe("ai-usage");
  });

  it("requires every query token to match the same module", () => {
    const results = getModuleSearchResults(modules, "budget provider");

    expect(results).toHaveLength(1);
    expect(results[0]?.item.key).toBe("ai-usage");
  });

  it("supports subsequence matches without marking substring highlights", () => {
    const results = getModuleSearchResults(modules, "tsk");

    expect(results[0]?.item.key).toBe("todo");
    expect(results[0]?.matchedTags).toEqual([{ tag: "tasks", matches: [] }]);
  });

  it("returns no results when every token cannot be matched", () => {
    expect(getModuleSearchResults(modules, "ghost query")).toHaveLength(0);
  });

  it("splits highlighted text into stable parts", () => {
    expect(highlightText("Expenses", [{ start: 0, end: 3 }])).toEqual([
      { text: "Exp", highlighted: true },
      { text: "enses", highlighted: false },
    ]);
  });

  it("omits empty highlight fragments around adjacent ranges", () => {
    expect(
      highlightText("Budget", [
        { start: 0, end: 3 },
        { start: 3, end: 6 },
      ]),
    ).toEqual([
      { text: "Bud", highlighted: true },
      { text: "get", highlighted: true },
    ]);
  });
});
