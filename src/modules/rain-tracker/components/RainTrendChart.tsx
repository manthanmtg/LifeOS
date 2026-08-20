"use client";

import { motion } from "framer-motion";
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
import { CloudRain } from "lucide-react";
import type { RainAnalytics, RainChartType, RainUnit } from "../types";

interface RainTrendChartProps {
  analytics: RainAnalytics;
  chartType: RainChartType;
  displayUnit: RainUnit;
}

export function RainTrendChart({
  analytics,
  chartType,
  displayUnit,
}: RainTrendChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="flex min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 @5xl/rain-overview:col-span-3"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-zinc-300">
            Rainfall Trend
          </h3>
          <p className="text-xs text-zinc-600">
            Monthly totals across the last 12 months
          </p>
        </div>
        <span className="text-[10px] font-medium text-zinc-600">
          Displaying {displayUnit}
        </span>
      </div>

      {analytics.chartData.length > 0 ? (
        <div className="min-h-[220px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart
                data={analytics.chartData}
                margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-zinc-800)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-zinc-600)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-zinc-600)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ stroke: "var(--color-zinc-700)" }}
                  contentStyle={{
                    backgroundColor: "var(--color-zinc-950)",
                    borderColor: "var(--color-zinc-800)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 8px 32px -8px rgba(0, 0, 0, 0.6)",
                  }}
                  itemStyle={{
                    color: "var(--color-zinc-100)",
                    fontWeight: 600,
                  }}
                  formatter={(value) => [
                    `${value ?? 0} ${displayUnit}`,
                    "Rainfall",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="displayAmount"
                  stroke="var(--color-accent)"
                  fill="url(#rainGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={analytics.chartData}
                margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.4}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-zinc-800)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-zinc-600)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-zinc-600)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.02)" }}
                  contentStyle={{
                    backgroundColor: "var(--color-zinc-950)",
                    borderColor: "var(--color-zinc-800)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 8px 32px -8px rgba(0, 0, 0, 0.6)",
                  }}
                  itemStyle={{
                    color: "var(--color-zinc-100)",
                    fontWeight: 600,
                  }}
                  formatter={(value) => [
                    `${value ?? 0} ${displayUnit}`,
                    "Rainfall",
                  ]}
                />
                <Bar
                  dataKey="displayAmount"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <CloudRain className="h-8 w-8 text-zinc-700" />
          </div>
          <p className="text-sm text-zinc-600">
            Add more entries to unlock the monthly chart.
          </p>
        </div>
      )}
    </motion.div>
  );
}
