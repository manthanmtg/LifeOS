"use client";

import { useState, useEffect } from "react";
import { HeartPulse, AlertTriangle, Calendar, Pill } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { cn } from "@/lib/utils";

interface HealthSummary {
  total: number;
  alertCount: number;
  activeMedCount: number;
  latestVisit: { date: string; type: string } | null;
}

export default function HealthWidget() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=health_profile", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <WidgetCard
      title="Health"
      icon={HeartPulse}
      loading={loading}
      href="/admin/health"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            {summary.latestVisit ? (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Calendar className="w-3 h-3" />
                Last: {summary.latestVisit.type}
              </span>
            ) : (
              <span className="text-zinc-600">No visits logged</span>
            )}
            {summary.activeMedCount > 0 && (
              <span className="flex items-center gap-1.5 text-accent">
                <Pill className="w-3 h-3" />
                {summary.activeMedCount} med
                {summary.activeMedCount !== 1 ? "s" : ""}
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
              health profile{summary.total !== 1 ? "s" : ""}
            </p>
          </div>

          {summary.alertCount > 0 ? (
            <div className="p-3 rounded-xl border border-warning/20 bg-warning/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <p className="text-[13px] text-warning font-medium leading-relaxed">
                  {summary.alertCount} alert
                  {summary.alertCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 ml-5.5">
                refills or vaccinations due
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
              <p className="text-[11px] text-zinc-500 text-center font-medium">
                All clear, no alerts.
              </p>
            </div>
          )}

          {summary.activeMedCount > 0 && (
            <div
              className={cn("flex items-center gap-2 text-xs text-zinc-500")}
            >
              <Pill className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                {summary.activeMedCount} active medication
                {summary.activeMedCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
