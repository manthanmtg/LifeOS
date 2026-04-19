"use client";

import { Sparkles } from "lucide-react";
import { BlogAdminStats } from "@/modules/blog/types";

interface BlogAdminHeaderProps {
  stats: BlogAdminStats;
}

export default function BlogAdminHeader({ stats }: BlogAdminHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="absolute -top-10 right-0 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Blog Studio
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-50">
          Write, refine, and ship posts without losing momentum.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
          The editor keeps drafts moving with autosave, preview, readability
          checks, and fast status controls for every post.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 md:max-w-2xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="text-lg font-semibold text-zinc-100">
            {stats.published}
          </p>
          <p className="text-xs text-zinc-500">Published</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="text-lg font-semibold text-zinc-100">{stats.drafts}</p>
          <p className="text-xs text-zinc-500">Drafts in progress</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="text-lg font-semibold text-zinc-100">
            {stats.archived}
          </p>
          <p className="text-xs text-zinc-500">Archived for later</p>
        </div>
      </div>
    </div>
  );
}
