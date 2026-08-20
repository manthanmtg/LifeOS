"use client";

import { Users, Heart, Cake, Clock, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RELATIONSHIPS } from "../types";
import type { PeopleFilterType } from "../insights";

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
  }> = [
    { id: "all", label: "Everyone", icon: Users },
    { id: "favorites", label: "Inner Circle", icon: Heart },
    { id: "upcoming", label: "Birthdays", icon: Cake },
    { id: "stale", label: "Catch Up", icon: Clock },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {mainFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              activeFilter === f.id
                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900",
            )}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
            {counts[f.id] > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.2rem] text-center",
                  activeFilter === f.id
                    ? "bg-accent text-zinc-950"
                    : "bg-zinc-800 text-zinc-600",
                )}
              >
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Relationship dropdown */}
      <select
        value={relationshipFilter}
        onChange={(e) => onRelationshipChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 outline-none focus:border-accent/40 transition-colors sm:ml-auto"
      >
        <option value="all">All types</option>
        {RELATIONSHIPS.map((rel) => (
          <option key={rel} value={rel}>
            {rel.charAt(0).toUpperCase() + rel.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
