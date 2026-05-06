import { DashboardSkeleton, SkeletonBlock } from "@/components/ui/Skeletons";

export default function AdminDashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading admin dashboard"
      aria-busy="true"
      aria-live="polite"
      className="animate-fade-in-up"
    >
      <header className="mb-8">
        <SkeletonBlock className="h-8 w-56 mb-2" />
        <SkeletonBlock className="h-4 w-80" />
      </header>
      <DashboardSkeleton />
    </div>
  );
}
