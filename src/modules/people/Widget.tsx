"use client";

import { useState, useEffect } from "react";
import { Users, Heart, Clock, Activity } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface PeopleSummary {
  total: number;
  favorites: number;
  staleCount: number;
  healthScore: number;
}

export default function PeopleWidget() {
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=person", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setSummary(data.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="People"
      icon={Users}
      loading={loading}
      href="/admin/people"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-accent/80">
              <Heart className="w-3 h-3" /> {summary.favorites} favorites
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Activity className="w-3 h-3" /> {summary.healthScore}% health
            </span>
          </div>
        )
      }
    >
      {summary && (
        <div className="space-y-3">
          <WidgetStat value={summary.total} label="people you know" />
          {summary.staleCount > 0 ? (
            <WidgetHighlight
              icon={Clock}
              text={`${summary.staleCount} to catch up with`}
              subtext="Haven't talked in 90+ days"
              variant="warning"
            />
          ) : (
            <WidgetHighlight
              icon={Users}
              text="Everyone's in touch"
              variant="success"
            />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
