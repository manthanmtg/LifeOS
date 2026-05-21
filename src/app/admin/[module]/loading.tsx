import { AdminModuleSkeleton, SkeletonBlock } from "@/components/ui/Skeletons";

export default function AdminModuleLoading() {
  return (
    <div
      role="status"
      aria-label="Loading admin module"
      aria-busy="true"
      aria-live="polite"
      className="animate-fade-in-up space-y-6"
    >
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-52" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <AdminModuleSkeleton />
    </div>
  );
}
