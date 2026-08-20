"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  CloudLightning,
  CloudRain,
  Droplets,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RainAnalytics, RainChartType, RainUnit } from "../types";
import { RainTrendChart } from "./RainTrendChart";

function StatCard({
  label,
  value,
  unit,
  trend,
  icon: Icon,
  accentClass,
  delay = 0,
}: {
  label: string;
  value: string;
  unit: RainUnit;
  trend?: { value: number; label: string };
  icon: typeof CloudRain;
  accentClass: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm transition-colors hover:border-zinc-700"
    >
      <div
        className={cn(
          "absolute right-0 top-0 h-24 w-24 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
          accentClass,
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight text-zinc-50 tabular-nums">
            {value}
            <span className="ml-1.5 text-sm font-medium text-zinc-500">
              {unit}
            </span>
          </p>
          {trend ? (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
                trend.value > 0
                  ? "text-success"
                  : trend.value < 0
                    ? "text-danger"
                    : "text-zinc-500",
              )}
            >
              {trend.value > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend.value < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value.toFixed(1)}% {trend.label}
              </span>
            </div>
          ) : null}
        </div>
        <div className={cn("rounded-xl border p-2.5", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function InsightCard({
  title,
  value,
  sublabel,
  icon: Icon,
  tone = "accent",
}: {
  title: string;
  value: string;
  sublabel: string;
  icon: typeof Calendar;
  tone?: "accent" | "success" | "warning";
}) {
  const toneStyles = {
    accent: "border-accent/20 bg-accent/5 text-accent",
    success: "border-success/20 bg-success/5 text-success",
    warning: "border-warning/20 bg-warning/5 text-warning",
  } satisfies Record<string, string>;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg border p-2", toneStyles[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {title}
          </p>
          <p className="truncate text-sm font-semibold text-zinc-100">
            {value}
          </p>
          <p className="truncate text-xs text-zinc-500">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}

export function RainOverview({
  analytics,
  last30Trend,
  displayUnit,
  chartType,
}: {
  analytics: RainAnalytics;
  last30Trend?: { value: number; label: string };
  displayUnit: RainUnit;
  chartType: RainChartType;
}) {
  return (
    <div className="@container/rain-overview space-y-4">
      <div className="grid grid-cols-1 gap-3 @sm/rain-overview:grid-cols-2 @3xl/rain-overview:grid-cols-4">
        <StatCard
          label="Total"
          value={String(analytics.total)}
          unit={displayUnit}
          icon={CloudRain}
          accentClass="bg-accent/20"
        />
        <StatCard
          label="Last 7 Days"
          value={String(analytics.last7)}
          unit={displayUnit}
          icon={Calendar}
          accentClass="bg-accent/20"
          delay={0.05}
        />
        <StatCard
          label="Last 30 Days"
          value={String(analytics.last30)}
          unit={displayUnit}
          trend={last30Trend}
          icon={TrendingUp}
          accentClass="bg-warning/20"
          delay={0.1}
        />
        <StatCard
          label="Avg / Entry"
          value={String(analytics.avgPerEntry)}
          unit={displayUnit}
          icon={Droplets}
          accentClass="bg-accent/20"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 @5xl/rain-overview:grid-cols-5">
        <div className="grid grid-cols-1 gap-3 @sm/rain-overview:grid-cols-2 @3xl/rain-overview:grid-cols-3 @5xl/rain-overview:col-span-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-accent/20 bg-accent/10 p-2">
                <CloudLightning className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Max Single
                </p>
                <p className="text-lg font-bold tabular-nums text-zinc-100">
                  {analytics.maxSingle}{" "}
                  <span className="text-xs text-zinc-500">{displayUnit}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-success/20 bg-success/10 p-2">
                <Calendar className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Rainy Days
                </p>
                <p className="text-lg font-bold tabular-nums text-zinc-100">
                  {analytics.rainyDays}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-2">
                <Droplets className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Daily window
                </p>
                <p className="text-lg font-bold tabular-nums text-zinc-100">
                  {analytics.dailyData.length}
                </p>
              </div>
            </div>
          </div>
          {analytics.latestEntry ? (
            <InsightCard
              title={analytics.latestEntry.label}
              value={analytics.latestEntry.value}
              sublabel={analytics.latestEntry.sublabel}
              icon={Calendar}
              tone="accent"
            />
          ) : null}
          {analytics.wettestMonth ? (
            <InsightCard
              title={analytics.wettestMonth.label}
              value={analytics.wettestMonth.value}
              sublabel={analytics.wettestMonth.sublabel}
              icon={CloudRain}
              tone="warning"
            />
          ) : null}
          {analytics.wettestDay ? (
            <InsightCard
              title={analytics.wettestDay.label}
              value={analytics.wettestDay.value}
              sublabel={analytics.wettestDay.sublabel}
              icon={CloudLightning}
              tone="accent"
            />
          ) : null}
          {analytics.averageRainyDay ? (
            <InsightCard
              title={analytics.averageRainyDay.label}
              value={analytics.averageRainyDay.value}
              sublabel={analytics.averageRainyDay.sublabel}
              icon={Droplets}
              tone="success"
            />
          ) : null}
          {analytics.drySpell ? (
            <InsightCard
              title={analytics.drySpell.label}
              value={analytics.drySpell.value}
              sublabel={analytics.drySpell.sublabel}
              icon={Calendar}
              tone="warning"
            />
          ) : null}
        </div>
        <RainTrendChart
          analytics={analytics}
          chartType={chartType}
          displayUnit={displayUnit}
        />
      </div>
    </div>
  );
}
