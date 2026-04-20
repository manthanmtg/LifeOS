import React from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShoppingListTab } from "../types";

interface ShoppingListHeaderProps {
  activeTab: ShoppingListTab;
  onTabChange: (tab: ShoppingListTab) => void;
}

export default function ShoppingListHeader({
  activeTab,
  onTabChange,
}: ShoppingListHeaderProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Shopping List</span>
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
              Shopping List
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Build reusable lists, add items fast, and check them off in-store.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
          {(["active", "completed"] as ShoppingListTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
