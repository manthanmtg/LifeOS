"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioStatusFilter } from "../lib/emi-view-model";

interface LoanFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  status: PortfolioStatusFilter;
  onStatusChange: (status: PortfolioStatusFilter) => void;
  counts: { active: number; closed: number; all: number };
  density?: "toolbar" | "navigator";
}

const PRESSABLE =
  "transition-colors duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

const OPTIONS: Array<{ id: PortfolioStatusFilter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];

export default function LoanFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  counts,
  density = "toolbar",
}: LoanFiltersProps) {
  const isNavigator = density === "navigator";

  return (
    <div
      data-testid="loan-filters"
      className={cn(
        "flex gap-3",
        isNavigator
          ? "flex-col"
          : "flex-col rounded-lg border border-zinc-800 bg-zinc-900/45 p-3 lg:flex-row lg:items-center",
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={`loan-search-${density}`} className="sr-only">
          Search by loan or lender
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id={`loan-search-${density}`}
            placeholder="Search by loan or lender"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className={cn(
              "min-h-[44px] w-full rounded-md border border-zinc-800 bg-zinc-950/45 py-3 pl-10 pr-3 text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
              !isNavigator && "lg:min-w-[320px]",
            )}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Loan status filter"
        className="grid min-h-[44px] grid-cols-3 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/35"
      >
        {OPTIONS.map((option, index) => {
          const selected = status === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatusChange(option.id)}
              className={cn(
                "min-h-[44px] px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60",
                PRESSABLE,
                index > 0 && "border-l border-zinc-800",
                selected
                  ? "bg-accent text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100",
              )}
            >
              {option.label} {counts[option.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
