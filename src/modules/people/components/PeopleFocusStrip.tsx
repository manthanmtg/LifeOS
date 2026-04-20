"use client";

import { CalendarClock, Clock3, Sparkles } from "lucide-react";
import type { PersonSummary } from "../insights";

interface PeopleFocusStripProps {
  summary: PersonSummary;
}

function formatCountdown(daysUntil: number) {
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

export default function PeopleFocusStrip({ summary }: PeopleFocusStripProps) {
  return (
    <div className="grid grid-cols-1 gap-3 mb-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-warning/20 bg-warning-muted/35 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10">
            <Clock3 className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning">
              Needs Attention
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {summary.staleCount > 0
                ? `${summary.staleCount} relationship${summary.staleCount === 1 ? "" : "s"} drifting`
                : "No stale relationships right now"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {summary.stalestPerson?.daysSince !== null &&
              summary.stalestPerson?.daysSince !== undefined
                ? `${summary.stalestPerson.name} has been quiet for ${summary.stalestPerson.daysSince} days.`
                : "Everyone has a recent touchpoint or is brand new."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
            {summary.nextBirthday ? (
              <CalendarClock className="h-4 w-4 text-accent" />
            ) : (
              <Sparkles className="h-4 w-4 text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              Next Warm Touch
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {summary.nextBirthday
                ? `${summary.nextBirthday.name}'s birthday is ${formatCountdown(summary.nextBirthday.daysUntil)}`
                : "No birthdays are coming up soon"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {summary.recentlyContactedCount > 0
                ? `${summary.recentlyContactedCount} people were contacted in the last 2 weeks.`
                : "A quick catch-up this week would raise the health score fast."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
