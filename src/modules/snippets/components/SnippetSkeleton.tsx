"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function SnippetSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-pulse"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-3.5 w-3.5 rounded" />
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-3.5 w-12 rounded" />
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-6 w-6 rounded" />
              <SkeletonBlock className="h-6 w-6 rounded" />
            </div>
          </div>

          {/* Code block */}
          <div className="px-4 py-3 space-y-2">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-4/5" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/30 space-y-2">
            <SkeletonBlock className="h-2.5 w-full" />
            <div className="flex gap-1.5">
              <SkeletonBlock className="h-3.5 w-12 rounded" />
              <SkeletonBlock className="h-3.5 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
