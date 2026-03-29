"use client";

import { Home, ChevronRight, Search, List, LayoutGrid, Plus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BillsHeaderProps {
  breadcrumb: { id: string | null; name: string }[];
  onNavigate: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onAddBill: () => void;
  onAddFolder: () => void;
}

export default function BillsHeader({
  breadcrumb,
  onNavigate,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAddBill,
  onAddFolder,
}: BillsHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Top Bar: Breadcrumb + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar py-1">
          {breadcrumb.map((crumb, i) => (
            <div key={crumb.id ?? "root"} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />}
              {i === breadcrumb.length - 1 ? (
                <span className="text-lg font-bold text-zinc-100 px-2 py-1 bg-zinc-800/50 rounded-lg">
                  {crumb.name}
                </span>
              ) : (
                <button
                  onClick={() => onNavigate(crumb.id)}
                  className="text-sm font-bold text-zinc-500 hover:text-accent px-2 py-1 rounded-lg hover:bg-accent/5 transition-all flex items-center gap-1.5"
                >
                  {crumb.id === null ? (
                    <>
                      <Home className="w-4 h-4" />
                      <span className="hidden sm:inline">Portal</span>
                    </>
                  ) : (
                    crumb.name
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddFolder}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-zinc-300 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-600 rounded-xl transition-all active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          <button
            onClick={onAddBill}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-black text-zinc-950 bg-accent hover:bg-accent-hover rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Search + View Toggles */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-2 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search bills by name, description, tags..."
            className="w-full bg-zinc-950/30 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-950/30 p-1 rounded-xl shrink-0">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === "grid"
                ? "bg-accent text-zinc-950 shadow-md"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === "list"
                ? "bg-accent text-zinc-950 shadow-md"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
