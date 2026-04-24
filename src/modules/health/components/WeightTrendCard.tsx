"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "./helpers";
import type { WeightTrendPoint } from "./selectors";
import { motion, AnimatePresence } from "framer-motion";

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

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendTone =
    delta > 0
      ? "text-warning bg-warning/10 border-warning/20"
      : delta < 0
        ? "text-success bg-success/10 border-success/20"
        : "text-zinc-400 bg-zinc-800/40 border-zinc-700/40";

  return (
    <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md p-6 transition-all hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5 group">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className={cn(labelCls, "mb-0")}>Weight Trend</p>
          <p className="text-2xl font-black italic tracking-tighter text-zinc-100 mt-1">
            {lastPoint.weightKg}{" "}
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold not-italic ml-1">
              kg
            </span>
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs tabular-nums transition-transform group-hover:scale-110",
            trendTone,
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>
            {delta > 0 ? "+" : ""}
            {delta} kg
          </span>
        </div>
      </div>

      <div className="flex h-24 items-end gap-1.5 px-1">
        <AnimatePresence mode="popLayout">
          {trendPoints.map((point, i) => (
            <motion.div
              key={point.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${point.heightPercent}%`, opacity: 1 }}
              transition={{
                delay: i * 0.02,
                duration: 0.5,
                ease: [0.33, 1, 0.68, 1],
              }}
              className="group/bar relative flex-1"
            >
              <div
                className="w-full h-full rounded-t-lg bg-gradient-to-t from-accent/10 via-accent/30 to-accent/50 transition-all group-hover/bar:from-accent/30 group-hover/bar:to-accent/70 group-hover/bar:shadow-[0_0_15px_-3px_rgba(var(--accent-rgb),0.4)]"
                title={`${point.weightKg} kg (${formatDate(point.date)})`}
              />
              {/* Tooltip-like value on hover */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 whitespace-nowrap">
                  {point.weightKg}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">
        <div className="flex flex-col">
          <span className="text-zinc-700 text-[8px] tracking-widest mb-0.5">
            START
          </span>
          <span>{formatDate(firstPoint.date)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-zinc-700 text-[8px] tracking-widest mb-0.5">
            LATEST
          </span>
          <span>{formatDate(lastPoint.date)}</span>
        </div>
      </div>
    </div>
  );
}
