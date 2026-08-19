"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExpenseSpaceAnalyticsResponse } from "../types";

export default function ExpenseSpaceCharts({
  analytics,
}: {
  analytics: ExpenseSpaceAnalyticsResponse;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <figure className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <figcaption className="mb-4">
          <p className="font-semibold text-zinc-50">Category allocation</p>
          <p className="mt-1 text-xs text-zinc-500">
            Bars compare spend; exact values are listed below the charts.
          </p>
        </figcaption>
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Spend by
          category
        </div>
        <div className="h-64 min-w-0" aria-hidden="true">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 320, height: 256 }}
          >
            <BarChart
              data={analytics.by_category.slice(0, 8)}
              layout="vertical"
            >
              <CartesianGrid stroke="var(--zinc-800)" strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: "var(--zinc-500)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--zinc-950)",
                  border: "1px solid var(--zinc-800)",
                  borderRadius: 12,
                }}
              />
              <Bar
                dataKey="amount"
                fill="var(--accent)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <figure className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <figcaption className="mb-4">
          <p className="font-semibold text-zinc-50">Monthly trend</p>
          <p className="mt-1 text-xs text-zinc-500">
            Calendar-month spend within the selected range.
          </p>
        </figcaption>
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full bg-success" /> Monthly spend
        </div>
        <div className="h-64 min-w-0" aria-hidden="true">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 320, height: 256 }}
          >
            <AreaChart data={analytics.by_month}>
              <CartesianGrid stroke="var(--zinc-800)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--zinc-500)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "var(--zinc-500)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--zinc-950)",
                  border: "1px solid var(--zinc-800)",
                  borderRadius: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--success)"
                fill="var(--success-muted)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
