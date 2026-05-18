"use client";

import { useState, useEffect } from "react";
import { Car, AlertTriangle, Fuel, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { cn } from "@/lib/utils";

interface VehicleSummary {
  total: number;
  alertCount: number;
  latestService: { description: string } | null;
  fuelCostThisMonth: number;
}

export default function VehicleWidget() {
  const [summary, setSummary] = useState<VehicleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=vehicle")
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {
        setHasError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const summaryReady = !loading && summary;
  const noVehicles = summaryReady ? summary.total === 0 : false;

  return (
    <WidgetCard
      title="Vehicles"
      icon={Car}
      loading={loading}
      href="/admin/vehicle"
      footer={
        summary &&
        summaryReady &&
        !hasError && (
          <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex min-w-0 items-center gap-1.5">
              <Fuel
                className={cn(
                  "w-3 h-3 shrink-0",
                  summary.fuelCostThisMonth > 0
                    ? "text-warning/80"
                    : "text-zinc-500",
                )}
              />
              <span
                className={cn(
                  "truncate",
                  summary.fuelCostThisMonth > 0
                    ? "text-warning/80"
                    : "text-zinc-500",
                )}
              >
                {summary.fuelCostThisMonth > 0
                  ? `${Math.round(summary.fuelCostThisMonth).toLocaleString()} fuel`
                  : "No logs"}
              </span>
            </span>
            {summary.latestService && (
              <span className="flex min-w-0 max-w-[120px] items-center gap-1.5 text-zinc-500">
                <Wrench className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {summary.latestService.description}
                </span>
              </span>
            )}
          </div>
        )
      }
    >
      {loading ? null : hasError || !summary ? (
        <WidgetHighlight
          icon={AlertTriangle}
          text="Unable to load vehicle summary"
          subtext="Please refresh to retry"
          variant="warning"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <WidgetStat value={summary.total} label="vehicles tracked" />
          {noVehicles ? (
            <WidgetHighlight
              icon={Car}
              text="No vehicles added yet"
              subtext="Service, fuel, and expiry reminders will show up here"
              variant="accent"
            />
          ) : summary.alertCount > 0 ? (
            <WidgetHighlight
              icon={AlertTriangle}
              text={`${summary.alertCount} expiry/service alert${summary.alertCount !== 1 ? "s" : ""}`}
              subtext="needs attention"
              variant="warning"
            />
          ) : (
            <WidgetHighlight
              icon={Car}
              text="All vehicles are up to date"
              subtext="No active service or document alerts"
              variant="success"
            />
          )}
        </motion.div>
      )}
    </WidgetCard>
  );
}
