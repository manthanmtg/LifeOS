"use client";

import { useState, useEffect, useMemo } from "react";
import { Bot, TrendingUp, TrendingDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { formatNumber } from "@/lib/formatters";

interface AiUsageSummary {
  totalCount: number;
  totalThisMonth: number;
  trend: number;
  topProvider: [string, number] | null;
  totalTokens: number;
  thisMonthLength: number;
}

export default function AiUsageWidget() {
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=ai_usage")
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const {
    totalCount,
    totalThisMonth,
    trend,
    topProvider,
    totalTokens,
    thisMonthLength,
  } = useMemo(() => {
    if (!summary) {
      return {
        totalCount: 0,
        totalThisMonth: 0,
        trend: 0,
        topProvider: null,
        totalTokens: 0,
        thisMonthLength: 0,
      };
    }
    return summary;
  }, [summary]);

  const accentColor = trend > 0 ? "danger" : trend < 0 ? "success" : "accent";

  return (
    <WidgetCard
      title="AI Usage"
      icon={Bot}
      loading={loading}
      href="/admin/ai-usage"
      accentColor={accentColor}
      footer={
        <div className="flex items-center justify-between">
          {trend !== 0 ? (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                trend > 0 ? "text-danger" : "text-success",
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend).toFixed(0)}% vs last month
            </span>
          ) : (
            <div />
          )}
          {topProvider && (
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Top: {topProvider[0]}
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={`$${formatNumber(totalThisMonth, "western", 2)}`}
          label={`this month · ${thisMonthLength} calls`}
        />
        {totalCount === 0 ? (
          <WidgetHighlight icon={Bot} text="No usage tracked yet" />
        ) : totalTokens > 0 ? (
          <WidgetHighlight
            icon={Cpu}
            text={`${formatNumber(totalTokens / 1000, "western", 1)}K tokens used`}
            variant="accent"
          />
        ) : (
          <WidgetHighlight icon={Bot} text="No usage this month" />
        )}
      </div>
    </WidgetCard>
  );
}
