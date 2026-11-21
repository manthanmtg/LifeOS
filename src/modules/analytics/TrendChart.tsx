"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AnalyticsTrendPoint {
  date: string;
  displayDate: string;
  count: number;
}

export default function TrendChart({ data }: { data: AnalyticsTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-accent)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-accent)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-zinc-900)"
        />
        <XAxis
          dataKey="displayDate"
          stroke="var(--color-zinc-700)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          stroke="var(--color-zinc-700)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-zinc-950)",
            border: "1px solid var(--color-zinc-800)",
            borderRadius: "12px",
            fontSize: "12px",
          }}
          itemStyle={{
            color: "var(--color-zinc-50)",
            fontWeight: "bold",
          }}
          cursor={{
            stroke:
              "color-mix(in srgb, var(--color-zinc-50) 5%, transparent)",
            strokeWidth: 2,
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-accent)"
          fillOpacity={1}
          fill="url(#colorCount)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
