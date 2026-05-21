"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  TYPES,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
  TYPE_STYLES,
} from "../types";

interface BingeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  totalVisible: number;
  totalItems: number;
}

export default function BingeFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  totalVisible,
  totalItems,
}: BingeFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, genre, platform..."
            aria-label="Search binge items"
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35 transition-shadow"
          />
        </div>
        <p className="text-xs text-zinc-500 ml-auto">
          {totalVisible}
          {totalVisible !== totalItems && ` / ${totalItems}`} items
        </p>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onStatusFilterChange("all")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center px-3 py-1.5 rounded-lg text-xs border transition-colors duration-200 touch-manipulation",
            statusFilter === "all"
              ? "bg-accent/15 border-accent/35 text-accent"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
          )}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onStatusFilterChange(s)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center px-3 py-1.5 rounded-lg text-xs border transition-colors duration-200 touch-manipulation",
              statusFilter === s
                ? STATUS_STYLES[s]
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Type filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onTypeFilterChange("all")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center px-3 py-1.5 rounded-lg text-xs border transition-colors duration-200 touch-manipulation",
            typeFilter === "all"
              ? "bg-accent/15 border-accent/35 text-accent"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
          )}
        >
          All Types
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onTypeFilterChange(t)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center px-3 py-1.5 rounded-lg text-xs border transition-colors duration-200 touch-manipulation",
              typeFilter === t
                ? TYPE_STYLES[t]
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
            )}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
