"use client";

import { Search, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileType } from "./types";

export type SortOption = "name" | "recent" | "alerts";

interface HealthFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  typeFilter: ProfileType | "all";
  onTypeFilterChange: (val: ProfileType | "all") => void;
  sort: SortOption;
  onSortChange: (val: SortOption) => void;
  profileCount: number;
}

const inputCls =
  "bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600";

export default function HealthFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sort,
  onSortChange,
  profileCount,
}: HealthFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${profileCount} profile${profileCount !== 1 ? "s" : ""}...`}
          className={cn(inputCls, "w-full pl-10")}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as ProfileType | "all")}
            className={cn(inputCls, "pl-9 pr-8 appearance-none cursor-pointer")}
          >
            <option value="all">All Types</option>
            <option value="self">Self</option>
            <option value="family">Family</option>
            <option value="pet">Pet</option>
          </select>
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className={cn(inputCls, "pl-9 pr-8 appearance-none cursor-pointer")}
          >
            <option value="name">By Name</option>
            <option value="recent">Recent</option>
            <option value="alerts">Alerts First</option>
          </select>
        </div>
      </div>
    </div>
  );
}
