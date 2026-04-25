import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function SettingsLoading() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
