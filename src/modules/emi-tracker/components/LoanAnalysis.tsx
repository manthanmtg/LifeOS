"use client";

import { useMemo, useState } from "react";
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
import type { EmiLoan, ScheduleResult } from "../types";

interface LoanAnalysisProps {
  loan: EmiLoan;
  schedule: ScheduleResult;
  currencySymbol: string;
  numberFormat: "western" | "indian";
  decimals: number;
}

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function TooltipContent({
  active,
  payload,
  label,
  currencySymbol,
  numberFormat,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
  currencySymbol: string;
  numberFormat: "western" | "indian";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      {payload.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between gap-6 py-1"
        >
          <span className="text-sm text-zinc-400">{item.name}</span>
          <span className="font-mono text-sm font-bold text-zinc-50">
            {formatMoney(item.value, currencySymbol, 0, numberFormat)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LoanAnalysis({
  loan,
  schedule,
  currencySymbol,
  numberFormat,
  decimals,
}: LoanAnalysisProps) {
  const [now] = useState(() => new Date());
  const metrics = useMemo(() => {
    let principalPaid = 0;
    let interestPaid = 0;
    let principalRemaining = 0;
    let interestRemaining = 0;

    for (const row of schedule.rows) {
      if (new Date(row.due_date).getTime() < now.getTime()) {
        principalPaid += row.principal;
        interestPaid += row.interest;
      } else {
        principalRemaining += row.principal;
        interestRemaining += row.interest;
      }
    }

    return {
      principalPaid,
      interestPaid,
      principalRemaining,
      interestRemaining,
      totalPrincipal: loan.payload.principal,
      totalInterest: schedule.totals.total_interest,
      totalRepayment: loan.payload.principal + schedule.totals.total_interest,
    };
  }, [loan.payload.principal, now, schedule]);

  const trendData = useMemo(() => {
    const step =
      schedule.rows.length > 180 ? 12 : schedule.rows.length > 72 ? 6 : 3;
    return schedule.rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ index }) => index % step === 0 || index === schedule.rows.length - 1,
      )
      .map(({ row, index }) => ({
        label: new Date(row.due_date).getFullYear().toString(),
        balance: Math.round(row.closing_balance),
        "Cumulative interest": Math.round(
          schedule.rows
            .slice(0, index + 1)
            .reduce((sum, item) => sum + item.interest, 0),
        ),
      }));
  }, [schedule.rows]);

  const composition = [
    {
      label: "Principal paid",
      value: metrics.principalPaid,
      className: "bg-success",
    },
    {
      label: "Principal remaining",
      value: metrics.principalRemaining,
      className: "bg-zinc-700",
    },
    {
      label: "Interest paid",
      value: metrics.interestPaid,
      className: "bg-danger",
    },
    {
      label: "Interest remaining",
      value: metrics.interestRemaining,
      className: "bg-warning",
    },
  ];
  const compositionTotal = composition.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const interestCostPercent = pct(
    metrics.totalInterest,
    metrics.totalPrincipal,
  );
  const principalInterestRatio =
    metrics.totalInterest > 0
      ? metrics.totalPrincipal / metrics.totalInterest
      : Number.POSITIVE_INFINITY;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-xl font-black text-zinc-100">Paid and remaining</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Principal and interest split across paid and projected rows.
        </p>
        <p className="sr-only">
          Principal paid{" "}
          {formatMoney(
            metrics.principalPaid,
            currencySymbol,
            decimals,
            numberFormat,
          )}
          . Principal remaining{" "}
          {formatMoney(
            metrics.principalRemaining,
            currencySymbol,
            decimals,
            numberFormat,
          )}
          . Interest paid{" "}
          {formatMoney(
            metrics.interestPaid,
            currencySymbol,
            decimals,
            numberFormat,
          )}
          . Interest remaining{" "}
          {formatMoney(
            metrics.interestRemaining,
            currencySymbol,
            decimals,
            numberFormat,
          )}
          .
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40">
          <div className="flex h-6">
            {composition.map((item) => (
              <div
                key={item.label}
                className={item.className}
                style={{ width: `${pct(item.value, compositionTotal)}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {composition.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-4"
            >
              <p className="text-sm font-bold text-zinc-300">{item.label}</p>
              <p className="mt-2 font-mono text-lg font-black text-zinc-50">
                {formatMoney(
                  item.value,
                  currencySymbol,
                  decimals,
                  numberFormat,
                )}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {pct(item.value, compositionTotal).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-xl font-black text-zinc-100">Balance over time</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Closing balance compared with cumulative interest.
        </p>
        <div className="mt-5 h-[260px] rounded-lg border border-zinc-800 bg-zinc-950/35 p-2 md:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient
                  id="analysisBalance"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="analysisInterest"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-danger)"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-danger)"
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
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-zinc-500)", fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip
                content={
                  <TooltipContent
                    currencySymbol={currencySymbol}
                    numberFormat={numberFormat}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Closing balance"
                stroke="var(--color-accent)"
                strokeWidth={3}
                fill="url(#analysisBalance)"
                animationDuration={250}
              />
              <Area
                type="monotone"
                dataKey="Cumulative interest"
                name="Cumulative interest"
                stroke="var(--color-danger)"
                strokeDasharray="5 5"
                strokeWidth={2}
                fill="url(#analysisInterest)"
                animationDuration={250}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Principal amount",
            formatMoney(
              metrics.totalPrincipal,
              currencySymbol,
              decimals,
              numberFormat,
            ),
            "Original loan amount",
          ],
          [
            "Interest cost",
            formatMoney(
              metrics.totalInterest,
              currencySymbol,
              decimals,
              numberFormat,
            ),
            `${interestCostPercent.toFixed(1)}% of principal`,
          ],
          [
            "Principal-to-interest ratio",
            Number.isFinite(principalInterestRatio)
              ? principalInterestRatio.toFixed(2)
              : "∞",
            "Higher means lower interest burden",
          ],
          [
            "Total projected repayment",
            formatMoney(
              metrics.totalRepayment,
              currencySymbol,
              decimals,
              numberFormat,
            ),
            "Principal plus projected interest",
          ],
        ].map(([label, value, sub]) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <p className="text-sm font-bold text-zinc-500">{label}</p>
            <p className="mt-2 whitespace-nowrap font-mono text-2xl font-black text-zinc-50">
              {value}
            </p>
            <p className="mt-2 text-sm text-zinc-500">{sub}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
