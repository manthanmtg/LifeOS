"use client";

import { useEffect, useState } from "react";
import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function ResumeViewer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Artificial delay to ensure shimmer is visible if loading is too fast
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-zinc-950 p-8 md:p-12 overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <SkeletonBlock className="h-12 w-64" />
              <SkeletonBlock className="h-6 w-48" />
            </div>
            <SkeletonBlock className="h-24 w-24 rounded-full" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            <div className="space-y-4">
              <SkeletonBlock className="h-8 w-32" />
              <SkeletonBlock className="h-32 w-full" />
              <SkeletonBlock className="h-32 w-full" />
            </div>
            <div className="space-y-4">
              <SkeletonBlock className="h-8 w-32" />
              <SkeletonBlock className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-zinc-900 overflow-hidden">
      <iframe
        src="/api/portfolio/resume"
        className="w-full h-full border-none"
        title="Resume PDF Viewer"
      />
    </div>
  );
}
