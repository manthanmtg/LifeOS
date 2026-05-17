import PublicFooter from "@/components/shell/PublicFooter";
import PublicHeader from "@/components/shell/PublicHeader";
import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function ResumeLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading resume"
        className="flex-1 bg-zinc-950 px-6 py-10 md:px-10 md:py-14"
      >
        <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <SkeletonBlock className="h-12 w-64 max-w-full" />
              <SkeletonBlock className="h-5 w-44" />
            </div>
            <SkeletonBlock className="h-20 w-20 shrink-0 rounded-full md:h-24 md:w-24" />
          </div>

          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <section className="space-y-4" aria-hidden="true">
              <SkeletonBlock className="h-7 w-32" />
              <SkeletonBlock className="h-32 w-full" />
              <SkeletonBlock className="h-32 w-full" />
            </section>
            <section className="space-y-4" aria-hidden="true">
              <SkeletonBlock className="h-7 w-32" />
              <SkeletonBlock className="h-64 w-full" />
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
