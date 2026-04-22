"use client";

import { Home, ChevronRight, Plus, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoHeaderProps {
  onAddTodo: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function TodoHeader({
  onAddTodo,
  viewMode,
  onViewModeChange,
}: TodoHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => (window.location.href = "/admin")}
              className="text-sm font-bold text-zinc-500 hover:text-accent px-2 py-1 rounded-lg hover:bg-accent/5 transition-all flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Portal</span>
            </button>
            <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
            <span className="text-lg font-black text-zinc-100 bg-zinc-800/50 px-3 py-1 rounded-xl">
              Tasks
            </span>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50" role="group" aria-label="View mode">
            <button
              onClick={() => onViewModeChange("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "list"
                  ? "bg-accent text-zinc-950 shadow-md"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "grid"
                  ? "bg-accent text-zinc-950 shadow-md"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onAddTodo}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-zinc-950 text-sm font-black rounded-xl hover:bg-accent-hover shadow-lg shadow-accent/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>
    </div>
  );
}
