"use client";

import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  type BookStatus,
} from "./types";

export type SortField = "created_at" | "title" | "author" | "rating";
export type SortDirection = "asc" | "desc";

interface BookshelfFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  totalVisible: number;
  totalBooks: number;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "created_at", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "rating", label: "Rating" },
];

export default function BookshelfFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  totalVisible,
  totalBooks,
}: BookshelfFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, author, tags..."
            aria-label="Search books"
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35 transition-shadow"
          />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value as SortField)}
            aria-label="Sort field"
            className="bg-zinc-950/70 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/35"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")
            }
            aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
            className={cn(
              "p-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:text-zinc-200 transition-colors",
              sortDirection === "desc" && "rotate-180",
            )}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Count */}
        <p className="text-xs text-zinc-500 ml-auto tabular-nums">
          {totalVisible}
          {totalVisible !== totalBooks && ` / ${totalBooks}`}
        </p>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onStatusFilterChange("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs border transition-all duration-200",
            statusFilter === "all"
              ? "bg-accent/15 border-accent/35 text-accent"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700",
          )}
        >
          All
        </button>
        {STATUSES.map((item: BookStatus) => (
          <button
            key={item}
            onClick={() => onStatusFilterChange(item)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border transition-all duration-200",
              statusFilter === item
                ? STATUS_STYLES[item]
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700",
            )}
          >
            {STATUS_LABELS[item]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
