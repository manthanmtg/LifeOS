"use client";

import { ChevronDown, Droplet } from "lucide-react";
import type { RainAnalytics, RainChartType, RainUnit } from "../types";
import { RainTrendChart } from "./RainTrendChart";
import { disclosureClass } from "./styles";

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
  const amount = (value: number) => `${value.toLocaleString()} ${displayUnit}`;
  const recentStats = [
    { label: "Last 7 days", value: amount(analytics.last7) },
    { label: "All-time total", value: amount(analytics.total) },
    {
      label: "Latest reading",
      value: analytics.latestEntry?.value ?? "—",
      detail: analytics.latestEntry?.sublabel,
    },
  ];
  const statistics = [
    { label: "Largest reading", value: amount(analytics.maxSingle) },
    { label: "Average reading", value: amount(analytics.avgPerEntry) },
    { label: "Days with readings", value: analytics.rainyDays },
    analytics.wettestDay,
    analytics.wettestMonth,
    analytics.averageRainyDay,
    analytics.drySpell && {
      ...analytics.drySpell,
      label: "Time since last reading",
      value:
        analytics.drySpell.label === "Updated today"
          ? "Less than a day"
          : analytics.drySpell.value,
    },
  ];

  return (
    <section
      aria-label="Rainfall overview"
      className="@container/rain-overview overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
    >
      <div className="grid @2xl/rain-overview:grid-cols-[minmax(15rem,1fr)_minmax(0,2.3fr)]">
        <div className="border-b border-zinc-800 bg-accent/5 px-5 py-5 sm:px-6 @2xl/rain-overview:border-r @2xl/rain-overview:border-b-0">
          <dl>
            <dt className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Droplet aria-hidden="true" className="size-4 text-accent" />
              Last 30 days
            </dt>
            <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 text-zinc-50">
              <span className="text-5xl leading-none font-semibold tracking-[-0.07em] tabular-nums">
                {analytics.last30.toLocaleString()}
              </span>
              <span className="text-lg font-medium text-zinc-500">
                {displayUnit}
              </span>
            </dd>
          </dl>
          {last30Trend && (
            <p className="mt-3 text-xs tabular-nums text-zinc-500">
              {last30Trend.value > 0 ? "+" : ""}
              {last30Trend.value.toFixed(1)}% vs. previous 30 days
            </p>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-zinc-800 pt-4 @min-[19rem]/rain-overview:grid-cols-3 @2xl/rain-overview:grid-cols-1 @2xl/rain-overview:gap-y-3">
            {recentStats.map(({ label, value, detail }) => (
              <div
                key={label}
                className="min-w-0 @2xl/rain-overview:flex @2xl/rain-overview:flex-wrap @2xl/rain-overview:items-baseline @2xl/rain-overview:justify-between @2xl/rain-overview:gap-x-2"
              >
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className="mt-1 text-sm font-medium tabular-nums text-zinc-100 @2xl/rain-overview:mt-0">
                  {value}
                </dd>
                {detail && (
                  <dd className="mt-0.5 text-xs text-zinc-500 @2xl/rain-overview:w-full @2xl/rain-overview:text-right">
                    {detail}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </div>

        <RainTrendChart
          chartData={analytics.chartData}
          chartType={chartType}
          displayUnit={displayUnit}
        />
      </div>

      <details className="group border-t border-zinc-800 px-5 sm:px-6">
        <summary className={disclosureClass}>
          Rainfall statistics
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-zinc-500 group-open:rotate-180"
          />
        </summary>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-zinc-800 py-5 @xl/rain-overview:grid-cols-3 @4xl/rain-overview:grid-cols-4">
          {statistics.map((item) =>
            item ? (
              <div key={item.label}>
                <dt className="text-xs text-zinc-500">{item.label}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-zinc-100">
                  {item.value}
                </dd>
                {"sublabel" in item && item.sublabel && (
                  <dd className="mt-0.5 text-xs text-zinc-500">
                    {item.sublabel}
                  </dd>
                )}
              </div>
            ) : null,
          )}
        </dl>
      </details>
    </section>
  );
}
