"use client";

import { useState, useEffect } from "react";
import { BarChart3, ArrowUp, ArrowDown, Activity } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

export default function AnalyticsWidget() {
  const [todayCount, setTodayCount] = useState(0);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=analytics", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        setTodayCount(d.data?.todayCount ?? 0);
        setYesterdayCount(d.data?.yesterdayCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const trend = todayCount - yesterdayCount;

  return (
    <WidgetCard
      title="Insights"
      icon={BarChart3}
      loading={loading}
      href="/admin/analytics"
    >
      <div className="space-y-3">
        <WidgetStat value={todayCount} label="engagements today" />

        {trend !== 0 ? (
          <WidgetHighlight
            icon={trend > 0 ? ArrowUp : ArrowDown}
            text={`${Math.abs(trend)} ${trend > 0 ? "more" : "fewer"} than yesterday`}
            subtext={
              trend > 0 ? "Engagement is climbing" : "Activity dip detected"
            }
            variant={trend > 0 ? "success" : "warning"}
          />
        ) : (
          <WidgetHighlight
            icon={Activity}
            text="Steady as she goes"
            subtext="Same activity as yesterday"
            variant="default"
          />
        )}
      </div>
    </WidgetCard>
  );
}
