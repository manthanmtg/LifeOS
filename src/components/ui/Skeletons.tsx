"use client";

import { cn } from "@/lib/utils";

const DASHBOARD_SKELETON_KEYS = [...Array(9).keys()];
const ADMIN_STATS_KEYS = [...Array(4).keys()];
const BLOG_SOCIAL_LINK_KEYS = [...Array(4).keys()];
const BLOG_GRID_KEYS = [...Array(4).keys()];
const BLOG_POST_DETAIL_WIDTHS = [95, 100, 88, 100, 92, 85, 100, 78];
const BLOG_POST_META_WIDTHS = [100, 90, 82, 100, 75, 95];
const PUBLIC_MODULE_KEYS = [...Array(6).keys()];

/** Shimmer overlay for skeleton elements */
function Shimmer() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-zinc-700/10 to-transparent" />
  );
}

/** Generic pulsing block */
export function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-zinc-800/50",
        className,
      )}
      style={style}
    >
      <Shimmer />
    </div>
  );
}

/** Skeleton for dashboard widget cards — matches WIDGET_MAX_HEIGHT (280px) */
export function WidgetSkeleton() {
  return (
    <div
      style={{ maxHeight: 280 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between h-full animate-pulse overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-4 w-4 rounded" />
      </div>
      <div>
        <SkeletonBlock className="h-8 w-20 mb-2" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <SkeletonBlock className="h-3 w-32" />
      </div>
    </div>
  );
}

/** Skeleton for the admin dashboard grid */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {DASHBOARD_SKELETON_KEYS.map((i) => (
        <WidgetSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a generic content list */
export function ContentListSkeleton({ length = 5 }: { length?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-5 w-2/5" />
              <SkeletonBlock className="h-3 w-3/5" />
            </div>
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for an admin module page (content list) */
export function AdminModuleSkeleton({
  withHeader = true,
}: {
  withHeader?: boolean;
}) {
  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      {withHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ADMIN_STATS_KEYS.map((i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse"
          >
            <SkeletonBlock className="h-3 w-16 mb-2" />
            <SkeletonBlock className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Content list */}
      <ContentListSkeleton />
    </div>
  );
}

/** Skeleton for blog post list page */
export function BlogListSkeleton() {
  return (
    <div className="flex-1 px-6 py-14 md:py-16">
      <div className="max-w-6xl mx-auto">
        {/* Hero section */}
        <div className="border border-zinc-800 rounded-3xl bg-zinc-900/70 p-6 md:p-8 mb-8 animate-pulse">
          <SkeletonBlock className="h-3 w-20 mb-3" />
          <SkeletonBlock className="h-10 w-3/4 mb-3" />
          <SkeletonBlock className="h-4 w-1/2 mb-6" />
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5"
              >
                <SkeletonBlock className="h-6 w-8 mb-1" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <SkeletonBlock className="h-10 w-full rounded-xl mb-3" />
        <div className="flex flex-wrap gap-2 mb-6">
          {BLOG_SOCIAL_LINK_KEYS.map((i) => (
            <SkeletonBlock key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>

        {/* Featured post */}
        <div className="border border-zinc-800 rounded-3xl bg-zinc-900/60 p-6 md:p-8 mb-6 animate-pulse">
          <SkeletonBlock className="h-3 w-16 mb-3" />
          <SkeletonBlock className="h-8 w-3/4 mb-3" />
          <SkeletonBlock className="h-4 w-full mb-2" />
          <SkeletonBlock className="h-4 w-2/3 mb-5" />
          <div className="flex gap-4">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-5 w-14 rounded-full" />
          </div>
        </div>

        {/* Grid of posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BLOG_GRID_KEYS.map((i) => (
            <div
              key={i}
              className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-5 animate-pulse"
            >
              <SkeletonBlock className="h-5 w-3/4 mb-2" />
              <SkeletonBlock className="h-3 w-full mb-1" />
              <SkeletonBlock className="h-3 w-2/3 mb-4" />
              <div className="flex justify-between">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a single blog post page */
export function BlogPostSkeleton() {
  return (
    <div className="flex-1 px-6 py-14 md:py-16">
      <div className="max-w-3xl mx-auto">
        <SkeletonBlock className="h-3 w-24 mb-6" />
        <SkeletonBlock className="h-10 w-full mb-3" />
        <SkeletonBlock className="h-10 w-2/3 mb-6" />
        <div className="flex gap-4 mb-8">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-5 w-14 rounded-full" />
        </div>
        <div className="space-y-4">
          {BLOG_POST_DETAIL_WIDTHS.map((w, i) => (
            <SkeletonBlock key={i} className="h-4" style={{ width: `${w}%` }} />
          ))}
          <SkeletonBlock className="h-48 w-full rounded-xl" />
          {BLOG_POST_META_WIDTHS.map((w, i) => (
            <SkeletonBlock
              key={`b-${i}`}
              className="h-4"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for public module pages */
export function PublicModuleSkeleton() {
  return (
    <div className="flex-1 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 animate-pulse">
          <SkeletonBlock className="h-8 w-48 mb-2" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-3">
          {PUBLIC_MODULE_KEYS.map((i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse"
            >
              <SkeletonBlock className="h-4 w-1/3 mb-2" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the public portfolio / showcase page */
export function PortfolioSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8"
    >
      <div className="grid items-center gap-[clamp(2rem,5vw,4.5rem)] py-[clamp(2.75rem,6vw,5.5rem)] motion-safe:animate-pulse min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SkeletonBlock className="h-7 w-36 rounded-full" />
          <SkeletonBlock className="h-16 w-5/6 rounded-lg lg:h-24" />
          <SkeletonBlock className="h-6 w-2/3 rounded-md" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-12 w-36 rounded-full" />
            <SkeletonBlock className="h-12 w-28 rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="aspect-[1.23] w-full max-w-[40rem] rounded-xl" />
      </div>
      <div className="flex gap-8 border-y border-zinc-800 py-5 motion-safe:animate-pulse">
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-3 w-12" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Skeleton for finance/ledger-style lists (expenses, transactions) */
export function FinanceListSkeleton({ length = 5 }: { length?: number }) {
  return (
    <div className="divide-y divide-zinc-800/30">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className="p-4 flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800/50 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-4 w-1/3" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-2 w-12" />
                <SkeletonBlock className="h-2 w-16" />
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <SkeletonBlock className="h-5 w-20 ml-auto" />
            <SkeletonBlock className="h-2 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
