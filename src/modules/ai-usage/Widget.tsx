"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=ai_usage", {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(body.error || "Summary unavailable");
        setSummary(body.data ?? null);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
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
        {failed ? (
          <>
            <WidgetStat value="—" label="usage summary unavailable" />
            <WidgetHighlight
              icon={AlertTriangle}
              text="Unable to load usage summary"
              subtext="Open AI Usage to retry"
              variant="warning"
            />
          </>
        ) : (
          <>
            <WidgetStat
              value={`$${formatNumber(totalThisMonth, "western", 2)}`}
              label={`this month · ${thisMonthLength} calls`}
            />
            <WidgetHighlight
              icon={highlight.icon}
              text={highlight.text}
              variant={highlight.variant}
            />
          </>
        )}
      </div>
    </WidgetCard>
  );
}
