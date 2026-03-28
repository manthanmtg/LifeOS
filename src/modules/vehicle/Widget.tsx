"use client";

import { useState, useEffect } from "react";
import { Car, AlertTriangle, Fuel, Wrench } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

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
        summary && (
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
        <div className="py-2 space-y-4">
          <div>
            <p className="text-4xl font-bold text-zinc-50 tracking-tight">
              {summary.total}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium italic">
              vehicle{summary.total !== 1 ? "s" : ""} tracked
            </p>
          </div>

          {summary.alertCount > 0 ? (
            <div className="p-3 rounded-xl border border-warning/20 bg-warning/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <p className="text-[13px] text-warning font-medium leading-relaxed">
                  {summary.alertCount} expiry/service alert
                  {summary.alertCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 ml-5.5">
                needs your attention
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
              <p className="text-[11px] text-zinc-500 text-center font-medium">
                All clear, no alerts.
              </p>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
