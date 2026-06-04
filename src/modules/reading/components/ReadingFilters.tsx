"use client";

import { Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadingType } from "../types";

interface ReadingFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  allTypes: ReadingType[];
  allUniqueTags: string[];
}

const filterButtonBase =
  "px-3 py-1.5 rounded-lg text-xs border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export function ReadingFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  tagFilter,
  setTagFilter,
  allTypes,
  allUniqueTags,
}: ReadingFiltersProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/55 backdrop-blur-sm p-4 space-y-3 shadow-sm shadow-zinc-950/40">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, domain, notes"
            aria-label="Search reading queue"
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 hover:border-zinc-700 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "unread", label: "Unread" },
            { key: "read", label: "Read" },
            { key: "all", label: "All" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              aria-pressed={statusFilter === item.key}
              className={cn(
                filterButtonBase,
                statusFilter === item.key
                  ? "bg-accent/15 border-accent/35 text-accent font-medium"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            aria-pressed={typeFilter === "all"}
            className={cn(
              filterButtonBase,
              typeFilter === "all"
                ? "bg-accent/15 border-accent/35 text-accent font-medium"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
            )}
          >
            All Types
          </button>
          {allTypes.map((item) => (
            <button
              key={item}
              onClick={() => setTypeFilter(item)}
              aria-pressed={typeFilter === item}
              className={cn(
                filterButtonBase + " capitalize",
                typeFilter === item
                  ? "bg-accent/15 border-accent/35 text-accent font-medium"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {allUniqueTags.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 w-full flex-wrap">
            <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800/50">
              <Tag className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Tags
              </span>
            </div>
            <button
              onClick={() => setTagFilter("all")}
              aria-pressed={tagFilter === "all"}
              className={cn(
                filterButtonBase + " px-2.5 py-1",
                tagFilter === "all"
                  ? "bg-accent/15 border-accent/35 text-accent font-medium"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              All Tags
            </button>
            {allUniqueTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                aria-pressed={tagFilter === tag}
                className={cn(
                  filterButtonBase + " px-2.5 py-1",
                  tagFilter === tag
                    ? "bg-accent/15 border-accent/35 text-accent font-medium"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
