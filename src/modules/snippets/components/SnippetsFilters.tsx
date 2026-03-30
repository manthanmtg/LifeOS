"use client";

import { motion } from "framer-motion";
import { Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SnippetsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  langFilter: string;
  onLangFilterChange: (lang: string) => void;
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
  languageChips: string[];
  filteredCount: number;
  totalCount: number;
}

export default function SnippetsFilters({
  searchQuery,
  onSearchChange,
  langFilter,
  onLangFilterChange,
  favoritesOnly,
  onFavoritesToggle,
  languageChips,
  filteredCount,
  totalCount,
}: SnippetsFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, code, tags"
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
          />
        </div>

        <button
          onClick={onFavoritesToggle}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5",
            favoritesOnly
              ? "bg-warning/15 border-warning/30 text-warning"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
          )}
        >
          <Star
            className="w-3.5 h-3.5"
            fill={favoritesOnly ? "currentColor" : "none"}
          />{" "}
          Favorites
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onLangFilterChange("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border transition-colors",
              langFilter === "all"
                ? "bg-accent/15 border-accent/35 text-accent"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
            )}
          >
            All
          </button>
          {languageChips.map((lang) => (
            <button
              key={lang}
              onClick={() => onLangFilterChange(lang)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                langFilter === lang
                  ? "bg-accent/15 border-accent/35 text-accent"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {filteredCount !== totalCount && (
        <p className="text-[10px] text-zinc-500">
          Showing {filteredCount} of {totalCount} snippets
        </p>
      )}
    </motion.div>
  );
}
