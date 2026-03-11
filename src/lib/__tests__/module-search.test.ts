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
];

describe("module-search", () => {
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

    it("returns no results when every token cannot be matched", () => {
        expect(getModuleSearchResults(modules, "ghost query")).toHaveLength(0);
    });

    it("splits highlighted text into stable parts", () => {
        expect(highlightText("Expenses", [{ start: 0, end: 3 }])).toEqual([
            { text: "Exp", highlighted: true },
            { text: "enses", highlighted: false },
        ]);
    });
});
