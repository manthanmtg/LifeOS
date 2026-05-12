"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function BookSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse space-y-4"
        >
          <div className="flex gap-4">
            <SkeletonBlock className="h-24 w-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
              <div className="flex gap-1 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-3 w-3 rounded-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <SkeletonBlock className="h-2 w-12" />
              <SkeletonBlock className="h-2 w-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-5 w-14 rounded-full" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
