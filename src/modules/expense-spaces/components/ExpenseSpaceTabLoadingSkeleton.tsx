"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";

type LoadingTab = "analytics" | "settings";

export default function ExpenseSpaceTabLoadingSkeleton({
  tab,
}: {
  tab: LoadingTab;
}) {
  return (
    <div
      role="status"
      aria-label={`Loading ${tab}`}
      aria-busy="true"
      className="space-y-5"
    >
      <span className="sr-only">Loading {tab}</span>
      {tab === "analytics" ? <AnalyticsSkeleton /> : <SettingsSkeleton />}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4"
          >
            <SkeletonBlock className="h-4 w-4 rounded-md" />
            <SkeletonBlock className="mt-4 h-6 w-3/5" />
            <SkeletonBlock className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TableCardSkeleton />
        <TableCardSkeleton />
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="mt-3 h-7 w-40" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <FieldSkeleton className="mt-4" height="h-24" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </section>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-7 w-56" />
          </div>
          <SkeletonBlock className="h-11 w-32 rounded-xl" />
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
            >
              <SkeletonBlock className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ChartCardSkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <SkeletonBlock className="h-5 w-36" />
      <SkeletonBlock className="mt-5 h-52 rounded-xl" />
    </section>
  );
}

function TableCardSkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <SkeletonBlock className="h-5 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-4 w-full" />
        ))}
      </div>
    </section>
  );
}

function FieldSkeleton({
  className,
  height = "h-11",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div className={className}>
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className={`mt-2 w-full rounded-xl ${height}`} />
    </div>
  );
}
