"use client";

import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "./helpers";
import type { WeightTrendPoint } from "./selectors";

const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

interface WeightTrendCardProps {
  trendPoints: WeightTrendPoint[];
}

export default function WeightTrendCard({ trendPoints }: WeightTrendCardProps) {
  if (trendPoints.length < 2) return null;

  const firstPoint = trendPoints[0];
  const lastPoint = trendPoints[trendPoints.length - 1];
  const delta = Number((lastPoint.weightKg - firstPoint.weightKg).toFixed(1));
  const trendTone =
    delta > 0 ? "text-warning" : delta < 0 ? "text-success" : "text-zinc-400";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={cn(labelCls, "mb-0")}>Weight Trend</p>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Scale className="h-3.5 w-3.5" />
          <span className={trendTone}>
            {delta > 0 ? "+" : ""}
            {delta} kg
          </span>
        </div>
      </div>

      <div className="flex h-20 items-end gap-1">
        {trendPoints.map((point) => (
          <div
            key={point.id}
            className="flex-1 rounded-t-sm bg-accent/20 transition-colors hover:bg-accent/40"
            style={{ height: `${point.heightPercent}%` }}
            title={`${point.weightKg} kg (${formatDate(point.date)})`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{formatDate(firstPoint.date)}</span>
        <span>{formatDate(lastPoint.date)}</span>
      </div>
    </div>
  );
}
