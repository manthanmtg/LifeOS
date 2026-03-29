"use client";

import { useState, useEffect } from "react";
import { CompassTask } from "./types";
import { AlertCircle, Map, CheckCircle } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

export default function CompassWidget() {
  const [tasks, setTasks] = useState<CompassTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=compass_task")
      .then((r) => r.json())
      .then((d) => setTasks(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const inProgress = tasks.filter((t) => t.payload.status === "in_progress");
  const critical = inProgress.filter((t) => t.payload.priority === "p1");
  const review = tasks.filter((t) => t.payload.status === "review");

  return (
    <WidgetCard
      title="Compass"
      icon={Map}
      loading={loading}
      href="/admin/compass"
      accentColor="accent"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {review.length} in review
          </span>
          <span>{tasks.length} total</span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={inProgress.length}
          label={inProgress.length === 0 ? "no active tasks" : "in progress"}
        />
        {critical.length > 0 ? (
          <WidgetHighlight
            icon={AlertCircle}
            text={`${critical.length} critical path item${critical.length !== 1 ? "s" : ""}`}
            variant="danger"
          />
        ) : review.length > 0 ? (
          <WidgetHighlight
            icon={CheckCircle}
            text={`${review.length} awaiting review`}
            variant="warning"
          />
        ) : (
          <WidgetHighlight icon={Map} text="No items need attention" />
        )}
      </div>
    </WidgetCard>
  );
}
