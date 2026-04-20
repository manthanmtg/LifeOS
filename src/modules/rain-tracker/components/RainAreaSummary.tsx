"use client";

import { CloudRain, MapPin, Radar } from "lucide-react";
import type { RainAreaPortfolioSummary, RainUnit } from "../types";

interface RainAreaSummaryProps {
  summary: RainAreaPortfolioSummary;
  displayUnit: RainUnit;
}

export function RainAreaSummary({
  summary,
  displayUnit,
}: RainAreaSummaryProps) {
  return (
    <div className="border-b border-zinc-800/80 p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Areas
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
            {summary.totalAreas}
          </p>
          <p className="text-[11px] text-zinc-500">
            {summary.activeAreas} active
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Last 7d
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
            {summary.last7Total}
          </p>
          <p className="text-[11px] text-zinc-500">{displayUnit} logged</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Quiet
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
            {summary.staleAreaCount}
          </p>
          <p className="text-[11px] text-zinc-500">need fresh logs</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        {summary.wettestArea ? (
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-accent/20 bg-accent/10 p-2 text-accent">
              <CloudRain className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {summary.wettestArea.label}
              </p>
              <p className="truncate text-sm font-semibold text-zinc-100">
                {summary.wettestArea.value}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                {summary.wettestArea.sublabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                No rainfall totals yet
              </p>
              <p className="text-[11px] text-zinc-500">
                Start logging entries to compare areas.
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
          <MapPin className="h-3.5 w-3.5 text-zinc-600" />
          Area cards below keep the latest reading and entry count visible.
        </div>
      </div>
    </div>
  );
}
