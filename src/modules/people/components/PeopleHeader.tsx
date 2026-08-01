"use client";

import Link from "next/link";
import { Home, Bell, ChevronRight, Plus, Search } from "lucide-react";

interface PeopleHeaderProps {
  onAddPerson: () => void;
  onOpenNotificationSettings: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  peopleSettingsLoading: boolean;
}

export default function PeopleHeader({
  onAddPerson,
  onOpenNotificationSettings,
  searchQuery,
  onSearchChange,
  peopleSettingsLoading,
}: PeopleHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/admin"
              className="text-sm font-bold text-zinc-500 hover:text-accent px-2 py-1 rounded-lg hover:bg-accent/5 transition-all flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Portal</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
            <span className="text-lg font-black text-zinc-100 bg-zinc-800/50 px-3 py-1 rounded-xl">
              People
            </span>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:flex-initial md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search names, notes, tags..."
              className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all"
            />
          </div>
          <button
            onClick={onOpenNotificationSettings}
            disabled={peopleSettingsLoading}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-800 rounded-xl text-sm font-black text-zinc-200 hover:text-zinc-100 hover:border-accent/30 hover:bg-accent/10 transition-all disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">People reminders</span>
          </button>
          <button
            onClick={onAddPerson}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-zinc-950 text-sm font-black rounded-xl hover:bg-accent-hover shadow-lg shadow-accent/20 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Someone</span>
          </button>
        </div>
      </div>
    </div>
  );
}
