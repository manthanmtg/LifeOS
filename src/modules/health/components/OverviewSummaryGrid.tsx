"use client";

import { AlertCircle, Pill, Stethoscope, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { bmiCategory, calculateBMI } from "./helpers";
import type { ProfileOverviewSnapshot } from "./selectors";

interface OverviewSummaryGridProps {
  snapshot: ProfileOverviewSnapshot;
  visitCount: number;
}

export default function OverviewSummaryGrid({
  snapshot,
  visitCount,
}: OverviewSummaryGridProps) {
  const latestBMI = snapshot.latestMeasurement
    ? calculateBMI(
        snapshot.latestMeasurement.height_cm,
        snapshot.latestMeasurement.weight_kg,
      )
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      <div className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-zinc-900 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-50">
            {snapshot.activeConditionCount}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Conditions
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-zinc-900 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
          <Pill className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-50">
            {snapshot.activeMedicationCount}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Active Meds
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
          <Stethoscope className="h-4 w-4 text-zinc-400" />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-50">{visitCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Visits
          </p>
          {snapshot.totalVisitCostInr > 0 && (
            <p className="mt-0.5 text-[10px] text-zinc-600">
              ₹{snapshot.totalVisitCostInr.toLocaleString()} total
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
          <TrendingUp
            className={cn(
              "h-4 w-4",
              latestBMI ? bmiCategory(latestBMI).color : "text-zinc-600",
            )}
          />
        </div>
        <div>
          {latestBMI ? (
            <>
              <p
                className={cn(
                  "text-xl font-bold",
                  bmiCategory(latestBMI).color,
                )}
              >
                {latestBMI.toFixed(1)}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[10px] font-bold uppercase tracking-wider",
                  bmiCategory(latestBMI).color,
                )}
              >
                {bmiCategory(latestBMI).label}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-zinc-600">—</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                BMI
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
