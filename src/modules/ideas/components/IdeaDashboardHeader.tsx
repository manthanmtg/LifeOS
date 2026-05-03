"use client";

import { Plus, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdeaMetrics } from "../insights";
import type { IdeaRecord } from "../shared";
import { IDEA_STATUS_LABELS } from "../shared";

interface IdeaDashboardHeaderProps {
  showSettings: boolean;
  stats: IdeaMetrics;
  spotlight: IdeaRecord | null;
  onToggleSettings: () => void;
  onCreateIdea: () => void;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "success" | "danger";
}) {
  const toneClass = {
    default: "text-zinc-50",
    accent: "text-accent",
    success: "text-success",
    danger: "text-danger",
  }[tone];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-zinc-700 hover:bg-zinc-900/60">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn("text-lg font-semibold", toneClass)}>{value}</p>
    </div>
  );
}

export default function IdeaDashboardHeader({
  showSettings,
  stats,
  spotlight,
  onToggleSettings,
  onCreateIdea,
}: IdeaDashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl animate-pulse" />
      <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-success/10 blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                Idea Dump
              </h1>
              <p className="mt-1 text-zinc-400">
                Capture raw thoughts, review the strongest concepts, and move
                the best ones into execution.
              </p>
            </div>

            {spotlight ? (
              <div className="rounded-2xl border border-accent/20 bg-zinc-950/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-accent/10 p-2 text-accent">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Current Spotlight
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-50">
                      {spotlight.payload.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {IDEA_STATUS_LABELS[spotlight.payload.status]} ·{" "}
                      {spotlight.payload.priority} priority
                      {spotlight.payload.category
                        ? ` · ${spotlight.payload.category}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 xl:pt-1">
            <button
              type="button"
              onClick={onToggleSettings}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm transition-colors",
                showSettings
                  ? "bg-accent/15 text-accent"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
              aria-label="Toggle settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCreateIdea}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" /> New Idea
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard
            label="Needs Review"
            value={stats.reviewCount}
            tone={stats.reviewCount > 0 ? "danger" : "success"}
          />
          <StatCard label="Promoted" value={stats.promoted} tone="success" />
          <StatCard label="Exploring" value={stats.exploring} tone="accent" />
          <StatCard
            label="Top Category"
            value={stats.topCategory ?? "None yet"}
            tone="default"
          />
        </div>
      </div>
    </div>
  );
}
