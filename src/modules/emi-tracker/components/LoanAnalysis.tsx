"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import { formatMoney } from "../lib/emi-utils";
import { ScheduleResult, EmiLoan } from "../types";

interface LoanAnalysisProps {
  loan: EmiLoan;
  schedule: ScheduleResult;
  currencySymbol: string;
  numberFormat: "western" | "indian";
  decimals: number;
}

interface HistoryDataPoint {
  month: string;
  Principal: number;
  Interest: number;
  Total: number;
  isPaid: boolean;
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  payload?: {
    value: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartEntry[];
  label?: string;
  currencySymbol: string;
  numberFormat: "western" | "indian";
}

// Stable Tooltip Component
const CustomTooltip = ({
  active,
  payload,
  label,
  currencySymbol,
  numberFormat,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          {label}
        </p>
        {payload.map((entry, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 py-1"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-zinc-300">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-zinc-100 italic">
              {formatMoney(entry.value, currencySymbol, 0, numberFormat)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Stable Legend Component for Distribution
const DistributionLegend = (props: { payload?: ChartEntry[] }) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload?.map((entry, index: number) => (
        <div
          key={index}
          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}
        </div>
      ))}
    </div>
  );
};

// Stable Legend Component for Cost
const CostLegend = (props: {
  payload?: ChartEntry[];
  totalPrincipal: number;
  totalInterest: number;
}) => {
  const { payload, totalPrincipal, totalInterest } = props;
  const total = totalPrincipal + totalInterest;
  return (
    <div className="flex flex-wrap justify-center gap-6 mt-4">
      {payload?.map((entry, index: number) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </div>
          <span className="text-xs font-black text-zinc-300 italic">
            {total > 0
              ? (((entry.payload?.value ?? entry.value) / total) * 100).toFixed(
                  1,
                )
              : "0.0"}
            %
          </span>
        </div>
      ))}
    </div>
  );
};

export default function LoanAnalysis({
  loan,
  schedule,
  currencySymbol,
  numberFormat,
}: LoanAnalysisProps) {
  const [now] = useState(() => new Date());

  // 1. Current Progress Metrics
  const metrics = useMemo(() => {
    let paidPrincipal = 0;
    let paidInterest = 0;
    let remainingPrincipal = 0;
    let remainingInterest = 0;

    schedule.rows.forEach((row) => {
      const isPaid = new Date(row.due_date) < now;
      if (isPaid) {
        paidPrincipal += row.principal;
        paidInterest += row.interest;
      } else {
        remainingPrincipal += row.principal;
        remainingInterest += row.interest;
      }
    });

    return {
      paidPrincipal,
      paidInterest,
      remainingPrincipal,
      remainingInterest,
      totalInterest: schedule.totals.total_interest,
      totalPrincipal: loan.payload.principal,
    };
  }, [schedule, loan.payload.principal, now]);

  // 2. Data for Pie Charts
  const distributionData = useMemo(
    () => [
      {
        name: "Principal Paid",
        value: metrics.paidPrincipal,
        color: "#10b981",
      },
      {
        name: "Principal Remaining",
        value: metrics.remainingPrincipal,
        color: "#3f3f46",
      },
      { name: "Interest Paid", value: metrics.paidInterest, color: "#f43f5e" },
      {
        name: "Interest Remaining",
        value: metrics.remainingInterest,
        color: "#71717a",
      },
    ],
    [metrics],
  );

  const totalCostData = useMemo(
    () => [
      {
        name: "Total Principal",
        value: metrics.totalPrincipal,
        color: "#10b981",
      },
      {
        name: "Total Interest",
        value: metrics.totalInterest,
        color: "#f43f5e",
      },
    ],
    [metrics],
  );

  // 3. Data for Stacked History (Sampling every 6 months for performance if long tenure)
  const historyData = useMemo(() => {
    const data: HistoryDataPoint[] = [];
    let cumPrincipal = 0;
    let cumInterest = 0;

    const step =
      schedule.rows.length > 120 ? 6 : schedule.rows.length > 48 ? 3 : 1;

    schedule.rows.forEach((row, idx) => {
      cumPrincipal += row.principal;
      cumInterest += row.interest;

      if (idx % step === 0 || idx === schedule.rows.length - 1) {
        data.push({
          month: `M${row.index}`,
          Principal: Math.round(cumPrincipal),
          Interest: Math.round(cumInterest),
          Total: Math.round(cumPrincipal + cumInterest),
          isPaid: new Date(row.due_date) < now,
        });
      }
    });
    return data;
  }, [schedule, now]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="relative z-10 mb-6">
            <h3 className="text-sm font-bold text-zinc-300">
              Loan Status Distribution
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-black italic">
              Paid vs. Remaining Lifecycle
            </p>
          </div>
          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <CustomTooltip
                      currencySymbol={currencySymbol}
                      numberFormat={numberFormat}
                    />
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={<DistributionLegend />}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Total Principal
              </span>
              <span className="text-2xl font-black text-zinc-50 italic tracking-tighter">
                {formatMoney(
                  metrics.totalPrincipal,
                  currencySymbol,
                  0,
                  numberFormat,
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="relative z-10 mb-6">
            <h3 className="text-sm font-bold text-zinc-300">
              Projected Total Cost
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-black italic">
              Structural Overhead Ratio
            </p>
          </div>
          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalCostData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {totalCostData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <CustomTooltip
                      currencySymbol={currencySymbol}
                      numberFormat={numberFormat}
                    />
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={
                    <CostLegend
                      totalPrincipal={metrics.totalPrincipal}
                      totalInterest={metrics.totalInterest}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Total Interest
              </span>
              <span className="text-2xl font-black text-danger italic tracking-tighter">
                {formatMoney(
                  metrics.totalInterest,
                  currencySymbol,
                  0,
                  numberFormat,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300">
            Cumulative Liability Breakdown
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-black italic">
            Principal vs. Interest accumulation trend
          </p>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={historyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#27272a"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickFormatter={(v) =>
                  formatMoney(v, currencySymbol, 0, numberFormat).replace(
                    /[₹$€]/,
                    "",
                  )
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
              <Legend verticalAlign="top" align="right" />
              <Area
                type="monotone"
                dataKey="Interest"
                stackId="1"
                stroke="#f43f5e"
                fill="#f43f5e20"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Principal"
                stackId="1"
                stroke="#10b981"
                fill="#10b98120"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Total"
                stroke="#3f3f46"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-950/20 border border-zinc-800/50 flex flex-col gap-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Efficiency Ratio
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-100 italic">
              {metrics.totalInterest > 0
                ? (metrics.totalPrincipal / metrics.totalInterest).toFixed(2)
                : "∞"}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 text-xs text-nowrap">
              P:I Factor
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
            Factor above 1.0 means principal is higher than total interest
            expense.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-950/20 border border-zinc-800/50 flex flex-col gap-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Payoff Completion
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-accent italic">
              {((metrics.paidPrincipal / metrics.totalPrincipal) * 100).toFixed(
                1,
              )}
              %
            </span>
            <span className="text-[10px] font-bold text-zinc-500 text-xs uppercase">
              Principal
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
            Percentage of initial loan amount cleared from the lender&apos;s
            book.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-950/20 border border-zinc-800/50 flex flex-col gap-2">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Structural Overhead
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-danger italic">
              {((metrics.totalInterest / metrics.totalPrincipal) * 100).toFixed(
                1,
              )}
              %
            </span>
            <span className="text-[10px] font-bold text-zinc-500 text-xs uppercase text-nowrap">
              Debt Cost
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
            Direct cost of borrowing relative to the initial principal amount.
          </p>
        </div>
      </div>
    </div>
  );
}
