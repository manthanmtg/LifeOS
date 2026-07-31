"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";

const CARD_KEYS = [0, 1, 2, 3];
const PANEL_KEYS = [0, 1, 2];

export default function AnalyticsModalSkeleton() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-zinc-950/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      role="status"
      aria-label="Loading recurring expense analytics"
    >
      <div className="h-[100dvh] w-full overflow-hidden border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-3xl sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-52" />
            <SkeletonBlock className="h-3 w-72 max-w-full" />
          </div>
          <SkeletonBlock className="h-11 w-11 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARD_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
            >
              <SkeletonBlock className="mb-3 h-3 w-24" />
              <SkeletonBlock className="mb-2 h-7 w-28" />
              <SkeletonBlock className="h-3 w-36" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PANEL_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
            >
              <SkeletonBlock className="mb-4 h-4 w-32" />
              <SkeletonBlock className="h-52 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
