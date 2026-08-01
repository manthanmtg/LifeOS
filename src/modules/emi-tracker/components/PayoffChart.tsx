"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../lib/emi-utils";
import type { ScheduleRow } from "../types";

interface PayoffChartProps {
  baselineSchedule: ScheduleRow[];
  simulatedSchedule: ScheduleRow[];
  currencySymbol: string;
  numberFormat: "western" | "indian";
}

type TooltipPayload = Array<{
  dataKey: string;
  value: number;
  name: string;
}>;

function CustomTooltip({
  active,
  payload,
  label,
  currencySymbol,
  numberFormat,
}: {
  active?: boolean;
  payload?: TooltipPayload;
  label?: string;
  currencySymbol: string;
  numberFormat: "western" | "indian";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        Payment {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div
            key={item.dataKey}
            className="flex items-center justify-between gap-6"
          >
            <span className="text-sm text-zinc-400">{item.name}</span>
            <span className="font-mono text-sm font-black text-zinc-50">
              {formatMoney(item.value, currencySymbol, 0, numberFormat)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PayoffChart({
  baselineSchedule,
  simulatedSchedule,
  currencySymbol,
  numberFormat,
}: PayoffChartProps) {
  const data = useMemo(() => {
    const maxLength = Math.max(
      baselineSchedule.length,
      simulatedSchedule.length,
    );
    const step = Math.max(1, Math.floor(maxLength / 72));
    const rows = [];
    for (let index = 0; index < maxLength; index += step) {
      const baseline =
        baselineSchedule[index] ??
        baselineSchedule[baselineSchedule.length - 1];
      const simulated =
        simulatedSchedule[index] ??
        simulatedSchedule[simulatedSchedule.length - 1];
      if (!baseline && !simulated) continue;
      rows.push({
        month: index + 1,
        baseline: Math.max(0, Math.round(baseline?.closing_balance ?? 0)),
        simulated: Math.max(0, Math.round(simulated?.closing_balance ?? 0)),
      });
    }
    if (maxLength > 0 && rows.at(-1)?.month !== maxLength) {
      rows.push({
        month: maxLength,
        baseline: Math.max(
          0,
          Math.round(baselineSchedule.at(-1)?.closing_balance ?? 0),
        ),
        simulated: Math.max(
          0,
          Math.round(simulatedSchedule.at(-1)?.closing_balance ?? 0),
        ),
      });
    }
    return rows;
  }, [baselineSchedule, simulatedSchedule]);

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-zinc-500">
        Baseline payoff has {baselineSchedule.length} payments. Current
        simulation has {simulatedSchedule.length} payments.
      </p>
      <div className="h-[240px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/35 p-2 md:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="baselineBalance" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-warning)"
                  stopOpacity={0.22}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-warning)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="simulatedBalance" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-zinc-800)"
              strokeOpacity={0.55}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "var(--color-zinc-500)",
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <YAxis hide domain={["auto", "auto"]} />
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
              dataKey="baseline"
              name="Baseline"
              stroke="var(--color-warning)"
              strokeDasharray="5 5"
              strokeWidth={2}
              fill="url(#baselineBalance)"
              animationDuration={250}
            />
            <Area
              type="monotone"
              dataKey="simulated"
              name="Simulated"
              stroke="var(--color-accent)"
              strokeWidth={3}
              fill="url(#simulatedBalance)"
              animationDuration={250}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-6 border-t border-dashed border-warning" />
          Baseline
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-accent" />
          Simulated
        </span>
      </div>
    </div>
  );
}
