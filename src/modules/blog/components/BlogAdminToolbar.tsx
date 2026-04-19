"use client";

import { Plus, RefreshCw, Search } from "lucide-react";

interface BlogAdminToolbarProps {
  hasLocalDraft: boolean;
  filteredCount: number;
  search: string;
  showEditor: boolean;
  onCreatePost: () => void;
  onRestoreLocalDraft: () => void;
  onSearchChange: (value: string) => void;
}

export default function BlogAdminToolbar({
  hasLocalDraft,
  filteredCount,
  search,
  showEditor,
  onCreatePost,
  onRestoreLocalDraft,
  onSearchChange,
}: BlogAdminToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onCreatePost}
        aria-label="Create new post"
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-accent-hover"
      >
        <Plus className="h-4 w-4" />
        New Post
      </button>

      {hasLocalDraft && !showEditor && (
        <button
          onClick={onRestoreLocalDraft}
          aria-label="Restore previous local draft"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:text-zinc-100"
        >
          <RefreshCw className="h-4 w-4" />
          Restore local draft
        </button>
      )}

      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search posts, slugs, or tags..."
            aria-label="Search blog posts"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
          />
        </div>
        <span className="shrink-0 text-xs text-zinc-500">
          {filteredCount} post{filteredCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
