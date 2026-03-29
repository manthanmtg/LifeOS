"use client";

import { motion } from "framer-motion";
import {
  Users,
  Heart,
  Cake,
  Clock,
  Filter,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RELATIONSHIPS } from "../types";

export type PeopleFilterType = "all" | "favorites" | "upcoming" | "stale";

interface PeopleFiltersProps {
  activeFilter: PeopleFilterType;
  onFilterChange: (filter: PeopleFilterType) => void;
  relationshipFilter: string;
  onRelationshipChange: (rel: string) => void;
  counts: Record<PeopleFilterType, number>;
}

export default function PeopleFilters({
  activeFilter,
  onFilterChange,
  relationshipFilter,
  onRelationshipChange,
  counts,
}: PeopleFiltersProps) {
  const mainFilters: Array<{
    id: PeopleFilterType;
    label: string;
    icon: LucideIcon;
    color: string;
  }> = [
    { id: "all", label: "Everyone", icon: Users, color: "text-zinc-100" },
    {
      id: "favorites",
      label: "Inner Circle",
      icon: Heart,
      color: "text-accent",
    },
    { id: "upcoming", label: "Birthdays", icon: Cake, color: "text-warning" },
    { id: "stale", label: "Catch Up", icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-8 mb-10">
      {/* Primary Dimensional Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {mainFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-[1.75rem] border transition-all relative group overflow-hidden shadow-sm",
              activeFilter === f.id
                ? "bg-zinc-800/80 border-zinc-700 text-zinc-100 shadow-xl shadow-black/40 scale-[1.02]"
                : "bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700/50 hover:bg-zinc-900/50",
            )}
          >
            <f.icon
              className={cn(
                "w-4 h-4 transition-all duration-500",
                activeFilter === f.id
                  ? f.color
                  : "text-zinc-700 group-hover:text-zinc-500",
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] italic">
              {f.label}
            </span>

            {counts[f.id] > 0 && (
              <span
                className={cn(
                  "ml-1 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[1.6rem] text-center transition-all",
                  activeFilter === f.id
                    ? "bg-accent text-zinc-950 shadow-lg shadow-accent/20"
                    : "bg-zinc-800 text-zinc-600 group-hover:text-zinc-500",
                )}
              >
                {counts[f.id]}
              </span>
            )}

            {activeFilter === f.id && (
              <motion.div
                layoutId="active-filter-glow"
                className="absolute inset-0 bg-white/5 pointer-events-none"
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Secondary Taxonomic Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-y border-zinc-900/60">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
              <Filter className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">
              Filter by:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRelationshipChange("all")}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                relationshipFilter === "all"
                  ? "bg-accent/10 border-accent/30 text-accent shadow-lg shadow-accent/5"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900",
              )}
            >
              All Types
            </button>
            {RELATIONSHIPS.map((rel) => (
              <button
                key={rel}
                onClick={() => onRelationshipChange(rel)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                  relationshipFilter === rel
                    ? "bg-accent/10 border-accent/30 text-accent shadow-lg shadow-accent/5"
                    : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900",
                )}
              >
                {rel}
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 self-end md:self-auto" />
      </div>
    </div>
  );
}
