"use client";

import { HeartPulse, AlertTriangle, Pill, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthProfile } from "./types";

interface HealthMetricsProps {
  profiles: HealthProfile[];
  alertCount: number;
}

export default function HealthMetrics({
  profiles,
  alertCount,
}: HealthMetricsProps) {
  const totalActiveMeds = profiles.reduce(
    (sum, p) =>
      sum + p.payload.medications.filter((m) => m.status === "active").length,
    0,
  );
  const totalActiveConditions = profiles.reduce(
    (sum, p) =>
      sum + p.payload.conditions.filter((c) => c.status !== "resolved").length,
    0,
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Profiles */}
      <div className="bg-zinc-900 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <HeartPulse className="w-4 h-4 text-accent" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-50">{profiles.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            Profile{profiles.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Active Alerts */}
      <div
        className={cn(
          "bg-zinc-900 rounded-2xl p-4 flex items-start gap-3 border",
          alertCount > 0 ? "border-warning/30" : "border-zinc-800",
        )}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            alertCount > 0 ? "bg-warning/10" : "bg-zinc-800",
          )}
        >
          <AlertTriangle
            className={cn(
              "w-4 h-4",
              alertCount > 0 ? "text-warning" : "text-zinc-600",
            )}
          />
        </div>
        <div>
          <p
            className={cn(
              "text-2xl font-bold",
              alertCount > 0 ? "text-warning" : "text-zinc-50",
            )}
          >
            {alertCount}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            Alert{alertCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Active Medications */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Pill className="w-4 h-4 text-accent" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-50">{totalActiveMeds}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            Active Med{totalActiveMeds !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Active Conditions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-warning" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-50">
            {totalActiveConditions}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-0.5">
            Condition{totalActiveConditions !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
