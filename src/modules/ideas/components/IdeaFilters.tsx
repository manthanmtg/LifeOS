"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IDEA_PRIORITY_STYLES,
  IDEA_STATUS_LABELS,
  IDEA_STATUS_STYLES,
} from "../shared";

const STATUSES = ["raw", "exploring", "archived"] as const;
const PRIORITIES = ["all", "high", "medium", "low"] as const;

interface IdeaFiltersProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  priorityFilter: string;
  onPriorityChange: (v: string) => void;
}

export default function IdeaFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
}: IdeaFiltersProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, description, tags"
            aria-label="Search ideas"
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onStatusChange("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border transition-colors",
              statusFilter === "all"
                ? "bg-accent/15 border-accent/35 text-accent"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
            )}
          >
            All Status
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                statusFilter === s
                  ? IDEA_STATUS_STYLES[s]
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              {IDEA_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => onPriorityChange(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors",
                priorityFilter === p
                  ? p === "all"
                    ? "bg-accent/15 border-accent/35 text-accent"
                    : IDEA_PRIORITY_STYLES[p]
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
