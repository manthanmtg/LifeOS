"use client";

import { cn } from "@/lib/utils";
import { Search, Clock, Calendar, Flag } from "lucide-react";

export type TodoSortType = "recent" | "due_date" | "priority";

interface TodoToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: TodoSortType;
  onSortChange: (sort: TodoSortType) => void;
}

export default function TodoToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: TodoToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-2 rounded-2xl">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Deep search objectives..."
          aria-label="Search objectives"
          className="w-full bg-zinc-950/30 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-accent/20 transition-all font-medium"
        />
      </div>

      <div
        className="flex items-center gap-1 bg-zinc-950/30 p-1 rounded-xl shrink-0"
        role="group"
        aria-label="Sort options"
      >
        {(["recent", "due_date", "priority"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onSortChange(s)}
            className={cn(
              "p-2 rounded-lg transition-all",
              sortBy === s
                ? "bg-accent text-zinc-950 shadow-md"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
            )}
            title={`Sort by ${s.replace("_", " ")}`}
            aria-label={`Sort by ${s.replace("_", " ")}`}
            aria-pressed={sortBy === s}
          >
            {s === "recent" ? (
              <Clock className="w-4 h-4" />
            ) : s === "due_date" ? (
              <Calendar className="w-4 h-4" />
            ) : (
              <Flag className="w-4 h-4" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
