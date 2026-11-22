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
import type { RainAnalytics, RainChartType, RainUnit } from "../types";

export function RainTrendChart({
  chartData,
  chartType,
  displayUnit,
}: {
  chartData: RainAnalytics["chartData"];
  chartType: RainChartType;
  displayUnit: RainUnit;
}) {
  const Chart = chartType === "area" ? AreaChart : BarChart;

  return (
    <div className="min-w-0 px-5 py-5 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">
            Monthly rainfall
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Most recent months with readings, up to 12
          </p>
        </div>
        {chartData.length > 0 && (
          <span className="text-xs font-medium text-zinc-500">
            {displayUnit}
          </span>
        )}
      </div>
      {chartData.length > 0 ? (
        <div className="h-44 w-full @2xl/rain-overview:h-48">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 300, height: 176 }}
          >
            <Chart
              aria-label={`Monthly rainfall in ${displayUnit}`}
              data={chartData}
              margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--color-zinc-800)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-zinc-500)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={14}
                tickMargin={9}
                height={25}
              />
              <YAxis
                tick={{ fill: "var(--color-zinc-500)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={46}
                tickMargin={8}
                tickCount={4}
                tickFormatter={(value: number) =>
                  value.toLocaleString(undefined, {
                    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
                    maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
                  })
                }
              />
              <Tooltip
                cursor={{
                  fill: "var(--color-zinc-900)",
                  stroke: "var(--color-zinc-700)",
                  strokeOpacity: 0.4,
                }}
                contentStyle={{
                  backgroundColor: "var(--color-zinc-950)",
                  borderColor: "var(--color-zinc-800)",
                  borderRadius: "8px",
                  color: "var(--color-zinc-100)",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "var(--color-zinc-100)" }}
                formatter={(value) => [
                  `${value ?? 0} ${displayUnit}`,
                  "Rainfall",
                ]}
              />
              {chartType === "area" ? (
                <Area
                  type="monotone"
                  dataKey="displayAmount"
                  stroke="var(--color-accent)"
                  fill="var(--color-accent)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={chartData.length === 1}
                  isAnimationActive={false}
                />
              ) : (
                <Bar
                  dataKey="displayAmount"
                  fill="var(--color-accent)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={42}
                  isAnimationActive={false}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500 @2xl/rain-overview:min-h-48">
          Monthly totals appear after the first reading.
        </div>
      )}
    </div>
  );
}
