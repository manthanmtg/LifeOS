"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function TodoLoading() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="status"
      aria-label="Loading objectives"
      aria-live="polite"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="space-y-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-4 backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-6 w-6 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-3/5" />
              <SkeletonBlock className="h-2.5 w-1/3" />
            </div>
          </div>
          <div className="flex items-center gap-2 pl-9">
            <SkeletonBlock className="h-4 w-14 rounded-lg" />
            <SkeletonBlock className="h-4 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
