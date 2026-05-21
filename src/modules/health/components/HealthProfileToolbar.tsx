"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthFilterOption, HealthListFilter } from "./selectors";

interface HealthProfileToolbarProps {
  filterOptions: HealthFilterOption[];
  listFilter: HealthListFilter;
  onFilterChange: (filter: HealthListFilter) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
}

export default function HealthProfileToolbar({
  filterOptions,
  listFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  visibleCount,
  totalCount,
}: HealthProfileToolbarProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-4 shadow-sm shadow-zinc-950/45 space-y-3 backdrop-blur-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            aria-label="Search health profiles"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search names, tags, medications, vaccinations, doctors..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          />
        </label>
        <p className="text-xs text-zinc-500 lg:text-right">
          Showing {visibleCount} of {totalCount} profile
          {totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter health profiles"
      >
        {filterOptions.map((filter) => (
          <button
            key={filter.key}
            aria-pressed={listFilter === filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-2.5 sm:py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
              listFilter === filter.key
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            {filter.label} · {filter.count}
          </button>
        ))}
      </div>
    </div>
  );
}
