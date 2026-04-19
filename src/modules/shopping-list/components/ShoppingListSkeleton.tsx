"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function ShoppingListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-3 w-12" />
            </div>
            <SkeletonBlock className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-6 w-24 rounded-full" />
              <SkeletonBlock className="h-8 w-16 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
