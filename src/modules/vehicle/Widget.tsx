"use client";

import { useState, useEffect } from "react";
import { Car, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { WidgetSkeleton } from "@/components/ui/Skeletons";

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
  const fuelSummary =
    summary && summaryReady && summary.fuelCostThisMonth > 0
      ? `${Math.round(summary.fuelCostThisMonth).toLocaleString()} spent on fuel this month`
      : "No fuel logs this month";
  const serviceSummary =
    summary && summaryReady && summary.latestService?.description
      ? `Latest: ${summary.latestService.description}`
      : "No service logs yet";

  return (
    <WidgetCard
      title="Vehicles"
      icon={Car}
      loading={loading}
      href="/admin/vehicle"
    >
      {loading ? (
        <WidgetSkeleton />
      ) : hasError || !summary ? (
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
              subtext={`${fuelSummary} · ${serviceSummary}`}
              variant="warning"
            />
          ) : (
            <WidgetHighlight
              icon={Car}
              text="All vehicles are up to date"
              subtext={`${fuelSummary} · ${serviceSummary}`}
              variant="success"
            />
          )}
        </motion.div>
      )}
    </WidgetCard>
  );
}
