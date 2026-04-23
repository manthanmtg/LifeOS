"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodoFilterType = "todo" | "done" | "today" | "overdue" | "high";

interface TodoFiltersProps {
  activeFilter: TodoFilterType;
  onFilterChange: (filter: TodoFilterType) => void;
  counts: Record<TodoFilterType, number>;
}

export default function TodoFilters({
  activeFilter,
  onFilterChange,
  counts,
}: TodoFiltersProps) {
  const filters: Array<{
    id: TodoFilterType;
    label: string;
    icon: React.ElementType;
    color: string;
    activeColor: string;
  }> = [
    {
      id: "todo",
      label: "Active",
      icon: Circle,
      color: "text-zinc-500",
      activeColor: "text-accent",
    },
    {
      id: "today",
      label: "Today",
      icon: Clock,
      color: "text-zinc-500",
      activeColor: "text-success",
    },
    {
      id: "overdue",
      label: "Overdue",
      icon: Calendar,
      color: "text-zinc-500",
      activeColor: "text-danger",
    },
    {
      id: "high",
      label: "Critical",
      icon: Flag,
      color: "text-zinc-500",
      activeColor: "text-warning",
    },
    {
      id: "done",
      label: "Done",
      icon: CheckCircle2,
      color: "text-zinc-500",
      activeColor: "text-zinc-300",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            aria-label={`${f.label} filter, ${counts[f.id] || 0} items`}
            aria-pressed={activeFilter === f.id}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all shrink-0 touch-manipulation relative group",
              activeFilter === f.id
                ? "bg-zinc-800 border-zinc-700 text-zinc-100 shadow-xl shadow-black/40"
                : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800",
            )}
          >
            <f.icon
              className={cn(
                "w-4 h-4 transition-colors",
                activeFilter === f.id
                  ? f.activeColor
                  : "text-zinc-600 group-hover:text-zinc-400",
              )}
            />
            <span className="text-xs font-bold uppercase tracking-wider">
              {f.label}
            </span>

            {counts[f.id] > 0 && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black min-w-[1.2rem] text-center transition-colors",
                  activeFilter === f.id
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-800 text-zinc-600 group-hover:text-zinc-500",
                )}
              >
                {counts[f.id]}
              </span>
            )}

            {activeFilter === f.id && (
              <motion.div
                layoutId="active-filter-tab"
                className="absolute inset-x-0 -bottom-1 h-1 bg-accent rounded-full mx-6"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
