"use client";

import { useState, useEffect } from "react";
import { Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

export default function MaintenanceWidget() {
  const [summary, setSummary] = useState({
    total: 0,
    overdue: 0,
    upcoming: 0,
    completedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/maintenance/summary", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setSummary(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="Maintenance"
      icon={Wrench}
      loading={loading}
      href="/admin/maintenance"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-warning/80">
            <Clock className="w-3 h-3" /> {summary.upcoming} due soon
          </span>
          <span className="flex items-center gap-1.5 text-success/80">
            <CheckCircle2 className="w-3 h-3" /> {summary.completedThisMonth}{" "}
            done
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={summary.total} label="tasks tracked" />
        {summary.overdue > 0 ? (
          <WidgetHighlight
            icon={AlertTriangle}
            text={`${summary.overdue} overdue task${summary.overdue !== 1 ? "s" : ""}`}
            subtext="needs immediate attention"
            variant="danger"
          />
        ) : (
          <WidgetHighlight
            icon={Wrench}
            text="All tasks up to date"
            variant="success"
          />
        )}
      </div>
    </WidgetCard>
  );
}
