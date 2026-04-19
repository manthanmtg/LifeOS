"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ScheduleRow } from "../types";
import { formatMoney } from "../lib/emi-utils";

interface PayoffChartProps {
  schedule: ScheduleRow[];
  currencySymbol: string;
  numberFormat: "western" | "indian";
}

const CustomTooltip = ({
  active,
  payload,
  label,
  currencySymbol,
  numberFormat,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  currencySymbol: string;
  numberFormat: "western" | "indian";
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          Month {label}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-400">Balance:</span>
            <span className="text-xs font-bold text-zinc-50">
              {formatMoney(payload[0].value, currencySymbol, 0, numberFormat)}
            </span>
          </div>
          <div className="h-px bg-zinc-800 my-1" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-400">Interest:</span>
            <span className="text-xs font-bold text-danger">
              {formatMoney(payload[1].value, currencySymbol, 0, numberFormat)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PayoffChart({
  schedule,
  currencySymbol,
  numberFormat,
}: PayoffChartProps) {
  const data = useMemo(() => {
    // Sample down if schedule is too long for the chart
    const step = Math.max(1, Math.floor(schedule.length / 60));
    return schedule
      .filter((_, i) => i % step === 0 || i === schedule.length - 1)
      .map((r) => ({
        month: r.index,
        date: r.due_date.slice(0, 10),
        balance: Math.round(r.closing_balance),
        interestPaid: Math.round(r.interest),
        principalPaid: Math.round(r.principal),
      }));
  }, [schedule]);

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-accent)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-accent)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-danger)"
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor="var(--color-danger)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 10, fontWeight: 800 }}
          />
          <YAxis
            hide
            domain={["auto", "auto"]}
            axisLine={false}
            tickFormatter={(value) =>
              `${currencySymbol}${value > 1000 ? (value / 1000).toFixed(0) + "k" : value}`
            }
          />
          <Tooltip
            content={
              <CustomTooltip
                currencySymbol={currencySymbol}
                numberFormat={numberFormat}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-accent)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorBalance)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="interestPaid"
            stroke="var(--color-danger)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorInterest)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
