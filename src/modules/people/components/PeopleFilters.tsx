"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  Heart, 
  Cake, 
  Clock, 
  Search,
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
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: Record<PeopleFilterType, number>;
}

export default function PeopleFilters({
  activeFilter,
  onFilterChange,
  relationshipFilter,
  onRelationshipChange,
  searchQuery,
  onSearchChange,
  counts
}: PeopleFiltersProps) {
  const mainFilters: Array<{ id: PeopleFilterType; label: string; icon: LucideIcon; color: string }> = [
    { id: "all", label: "All Contacts", icon: Users, color: "text-zinc-400" },
    { id: "favorites", label: "Favorites", icon: Heart, color: "text-pink-400" },
    { id: "upcoming", label: "Birthdays", icon: Cake, color: "text-warning" },
    { id: "stale", label: "Re-engage", icon: Clock, color: "text-danger" },
  ];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-accent transition-colors" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, company, interest, or tags..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl pl-12 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all placeholder:text-zinc-600 shadow-sm"
        />
      </div>

      {/* Main Buckets */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {mainFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all shrink-0 touch-manipulation relative group",
              activeFilter === f.id
                ? "bg-zinc-800 border-zinc-700 text-zinc-100 shadow-xl shadow-black/40"
                : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
            )}
          >
            <f.icon className={cn(
              "w-4 h-4 transition-colors",
              activeFilter === f.id ? f.color : "text-zinc-600 group-hover:text-zinc-400"
            )} />
            <span className="text-xs font-bold uppercase tracking-widest">
              {f.label}
            </span>
            
            {counts[f.id] > 0 && (
              <span className={cn(
                "ml-1 px-2 py-0.5 rounded-lg text-[10px] font-black min-w-[1.4rem] text-center transition-colors",
                activeFilter === f.id 
                  ? "bg-zinc-700 text-zinc-300" 
                  : "bg-zinc-800 text-zinc-600 group-hover:text-zinc-500"
              )}>
                {counts[f.id]}
              </span>
            )}

            {activeFilter === f.id && (
              <motion.div
                layoutId="active-people-tab"
                className="absolute inset-x-0 -bottom-1 h-1 bg-accent rounded-full mx-8"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Relationship Selector */}
      <div className="flex items-center gap-4 py-2 border-t border-zinc-900/50">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Filter:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none px-1">
          <button
            onClick={() => onRelationshipChange("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0",
              relationshipFilter === "all"
                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
            )}
          >
            All Types
          </button>
          {RELATIONSHIPS.map((rel) => (
            <button
              key={rel}
              onClick={() => onRelationshipChange(rel)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0",
                relationshipFilter === rel
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
              )}
            >
              {rel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
