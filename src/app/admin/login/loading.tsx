import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function LoginLoading() {
  return (
    <div
      role="status"
      aria-label="Loading login"
      aria-busy="true"
      aria-live="polite"
      className="min-h-dvh flex items-center justify-center bg-zinc-950 text-zinc-50 relative overflow-hidden [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]"
    >
      <div className="absolute top-0 blur-[150px] bg-zinc-800/50 w-full h-[500px] rounded-full -translate-y-1/2" />

      <div className="w-full max-w-sm p-8 z-10 flex flex-col items-center">
        <div className="flex flex-col items-center mb-10 w-full">
          {/* Icon skeleton */}
          <SkeletonBlock className="w-14 h-14 rounded-2xl mb-4" />

          {/* Title skeleton */}
          <SkeletonBlock className="h-9 w-32 mb-2" />

          {/* Subtitle skeleton */}
          <SkeletonBlock className="h-4 w-56" />
        </div>

        {/* Form skeleton */}
        <div className="w-full space-y-4">
          <SkeletonBlock className="h-12 w-full rounded-lg" />
          <SkeletonBlock className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
