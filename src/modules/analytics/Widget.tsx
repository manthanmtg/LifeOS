"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  ArrowUp,
  ArrowDown,
  Activity,
  AlertTriangle,
} from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

export default function AnalyticsWidget() {
  const [todayCount, setTodayCount] = useState(0);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=analytics", { signal: ac.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Summary request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        setTodayCount(data.data?.todayCount ?? 0);
        setYesterdayCount(data.data?.yesterdayCount ?? 0);
        setHasError(false);
      })
      .catch((error: unknown) => {
        if (
          ac.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setHasError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
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
        {hasError ? (
          <>
            <WidgetStat value="—" label="analytics summary unavailable" />
            <WidgetHighlight
              icon={AlertTriangle}
              text="Unable to load analytics summary"
              subtext="Open Analytics to retry"
              variant="warning"
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </WidgetCard>
  );
}
