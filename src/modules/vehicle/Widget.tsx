"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, AlertTriangle, Fuel, Wrench } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface VehicleSummary {
  total: number;
  alertCount: number;
  latestService: { description: string } | null;
  fuelCostThisMonth: number;
}

export default function VehicleWidget() {
  const [summary, setSummary] = useState<VehicleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=vehicle")
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Vehicles"
      icon={Car}
      loading={loading}
      href="/admin/vehicle"
      footer={
        summary && summary.total > 0 && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-warning/80">
              <Fuel className="w-3 h-3" />
              {summary.fuelCostThisMonth > 0
                ? `${Math.round(summary.fuelCostThisMonth).toLocaleString()} fuel`
                : "No fuel logs"}
            </span>
            {summary.latestService && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Wrench className="w-3 h-3" />
                {summary.latestService.description.slice(0, 18)}
              </span>
            )}
          </div>
        )
      }
    >
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-3"
        >
          <WidgetStat
            value={summary.total > 0 ? summary.alertCount : 0}
            label={
              summary.total > 0
                ? summary.alertCount > 0
                  ? "service alerts"
                  : "all systems clear"
                : "vehicles tracked"
            }
          />
          {summary.total === 0 ? (
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
              text={`${summary.total} vehicle${summary.total !== 1 ? "s" : ""} tracked`}
              variant="success"
            />
          )}
        </motion.div>
      )}
    </WidgetCard>
  );
}
