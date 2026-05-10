"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Server,
  type LucideIcon,
} from "lucide-react";
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
  thisMonthLength: number;
}

type HighlightVariant = "default" | "accent" | "success" | "danger";

interface HighlightDetail {
  icon: LucideIcon;
  text: string;
  variant: HighlightVariant;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

function formatProviderName(provider: string) {
  return (
    PROVIDER_LABELS[provider.toLowerCase()] ??
    provider
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
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

  const { totalCount, totalThisMonth, trend, topProvider, thisMonthLength } =
    useMemo(() => {
      if (!summary) {
        return {
          totalCount: 0,
          totalThisMonth: 0,
          trend: 0,
          topProvider: null,
          thisMonthLength: 0,
        };
      }
      return summary;
    }, [summary]);

  const accentColor = trend > 0 ? "danger" : trend < 0 ? "success" : "accent";
  const highlight: HighlightDetail =
    trend !== 0
      ? {
          icon: trend > 0 ? TrendingUp : TrendingDown,
          text: `${trend > 0 ? "Up" : "Down"} ${Math.abs(trend).toFixed(0)}% vs last month`,
          variant: accentColor,
        }
      : topProvider
        ? {
            icon: Server,
            text: `Top provider: ${formatProviderName(topProvider[0])} · ${formatNumber(topProvider[1])} calls`,
            variant: "accent",
          }
        : {
            icon: Bot,
            text:
              totalCount === 0 ? "No usage tracked yet" : "No usage this month",
            variant: "default",
          };

  return (
    <WidgetCard
      title="AI Usage"
      icon={Bot}
      loading={loading}
      href="/admin/ai-usage"
      accentColor={accentColor}
    >
      <div className="space-y-3">
        <WidgetStat
          value={`$${formatNumber(totalThisMonth, "western", 2)}`}
          label={`this month · ${thisMonthLength} calls`}
        />
        <WidgetHighlight
          icon={highlight.icon}
          text={highlight.text}
          variant={highlight.variant}
        />
      </div>
    </WidgetCard>
  );
}
