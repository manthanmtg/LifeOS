"use client";

import { AlertTriangle } from "lucide-react";

interface PayoffRunwayProps {
  startDate: string;
  today: Date;
  progressPercent: number;
  baselinePayoffDate: string | null;
  simulatedPayoffDate?: string | null;
  monthsSaved?: number;
  extraMonthlyLabel?: string;
  warning?: string;
}

function monthYear(value: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export default function PayoffRunway({
  startDate,
  today,
  progressPercent,
  baselinePayoffDate,
  simulatedPayoffDate,
  monthsSaved = 0,
  extraMonthlyLabel,
  warning,
}: PayoffRunwayProps) {
  if (warning || !baselinePayoffDate) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-warning"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm font-semibold">
          {warning ?? "Payoff projection is unavailable for this schedule."}
        </p>
      </div>
    );
  }

  const safeProgress = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const hasSimulation =
    !!simulatedPayoffDate && simulatedPayoffDate !== baselinePayoffDate;
  const simulatedPosition = hasSimulation
    ? Math.max(safeProgress + 6, Math.min(92, 100 - monthsSaved * 2))
    : null;
  const summary = `${safeProgress}% repaid. Baseline payoff ${monthYear(
    baselinePayoffDate,
  )}.${
    hasSimulation
      ? ` With ${extraMonthlyLabel ?? "extra"} extra monthly, projected payoff ${monthYear(
          simulatedPayoffDate,
        )}, ${monthsSaved} ${monthsSaved === 1 ? "month" : "months"} earlier.`
      : ""
  }`;

  return (
    <div className="space-y-4" aria-label="Payoff runway">
      <p className="sr-only">{summary}</p>
      <div
        role="progressbar"
        aria-label="Principal repaid"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgress}
        className="relative h-3 rounded-full border border-zinc-800 bg-zinc-950/70"
      >
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${safeProgress}%` }}
        />
        <span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-success shadow-lg shadow-success/20" />
        <span
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-accent shadow-lg shadow-accent/20"
          style={{ left: `${safeProgress}%` }}
          aria-hidden="true"
        />
        {simulatedPosition !== null && (
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-warning shadow-lg shadow-warning/20"
            style={{ left: `${simulatedPosition}%` }}
            aria-hidden="true"
          />
        )}
        <span
          className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-700 bg-zinc-950"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-zinc-500">
        <div>
          <p className="font-bold text-zinc-300">Start</p>
          <p>{monthYear(startDate)}</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-zinc-300">Today</p>
          <p>{monthYear(today)}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-zinc-300">Payoff</p>
          <p>{monthYear(baselinePayoffDate)}</p>
        </div>
      </div>

      {hasSimulation && (
        <p className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          Finish {monthsSaved} {monthsSaved === 1 ? "month" : "months"} earlier
          with {extraMonthlyLabel} extra monthly.
        </p>
      )}
    </div>
  );
}
