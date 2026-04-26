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

interface AiUsageEntry {
  payload: {
    provider: string;
    cost: number;
    input_tokens: number;
    output_tokens: number;
    date: string;
  };
}

export default function AiUsageWidget() {
  const [entries, setEntries] = useState<AiUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/content?module_type=ai_usage")
      .then((r) => r.json())
      .then((d) => setEntries(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { totalThisMonth, trend, topProvider, totalTokens, thisMonthLength } = useMemo(() => {
    const thisMonth = entries.filter((e) => {
      const d = new Date(e.payload.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const lastMonth = entries.filter((e) => {
      const d = new Date(e.payload.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    });

    const tThisMonth = thisMonth.reduce((s, e) => s + e.payload.cost, 0);
    const tLastMonth = lastMonth.reduce((s, e) => s + e.payload.cost, 0);
    const tr =
      tLastMonth > 0
        ? ((tThisMonth - tLastMonth) / tLastMonth) * 100
        : 0;

    const tProvider = Object.entries(
      thisMonth.reduce<Record<string, number>>((acc, e) => {
        acc[e.payload.provider] = (acc[e.payload.provider] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0];

    const tTokens = thisMonth.reduce(
      (s, e) => s + e.payload.input_tokens + e.payload.output_tokens,
      0,
    );

    return {
      totalThisMonth: tThisMonth,
      trend: tr,
      topProvider: tProvider,
      totalTokens: tTokens,
      thisMonthLength: thisMonth.length
    };
  }, [entries, now]);

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
        {entries.length === 0 ? (
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
