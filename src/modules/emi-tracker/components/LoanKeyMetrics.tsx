"use client";

import { Calculator, TrendingUp, Info, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "../lib/emi-utils";
import { ScheduleRow } from "../types";

interface LoanKeyMetricsProps {
  totalPayable: number;
  totalPrincipal: number;
  totalInterest: number;
  outstanding: number;
  principalPaid: number;
  paidInterest: number;
  remainingInterest: number;
  progressPercent: number;
  nextDue: ScheduleRow | null;
  sym: string;
  numberFormat: "western" | "indian";
}

export default function LoanKeyMetrics({
  totalPayable,
  totalPrincipal,
  totalInterest,
  outstanding,
  principalPaid,
  paidInterest,
  remainingInterest,
  progressPercent,
  nextDue,
  sym,
  numberFormat,
}: LoanKeyMetricsProps) {
  const metrics = [
    {
      label: "Total Payable",
      value: totalPayable,
      sub: "Principal + Interest",
      color: "text-zinc-100",
      icon: Calculator,
      amounts: `${formatMoney(totalPrincipal, sym, 0, numberFormat)} + ${formatMoney(totalInterest, sym, 0, numberFormat)}`,
    },
    {
      label: "Balance Left",
      value: outstanding,
      sub: `${progressPercent.toFixed(1)}% Paid`,
      color: "text-accent",
      icon: TrendingUp,
      amounts: `${formatMoney(principalPaid, sym, 0, numberFormat)} / ${formatMoney(totalPrincipal, sym, 0, numberFormat)}`,
    },
    {
      label: "Interest Paid",
      value: totalInterest,
      sub: "Across tenure",
      color: "text-accent",
      icon: Info,
      amounts: `${formatMoney(paidInterest, sym, 0, numberFormat)} + ${formatMoney(remainingInterest, sym, 0, numberFormat)} (Left)`,
    },
    {
      label: "Next EMI",
      value: nextDue?.emi || 0,
      sub: nextDue ? nextDue.due_date.slice(0, 10) : "Finalized",
      color: "text-warning",
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <div
          key={i}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 shadow-sm shadow-zinc-950/15 transition-all duration-200 group overflow-hidden relative hover:-translate-y-0.5 hover:bg-zinc-900/52 hover:border-zinc-700/70 hover:shadow-md hover:shadow-zinc-950/35"
        >
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-zinc-500 group-hover:text-zinc-300 group-hover:opacity-[0.08] transition-all duration-200">
            <m.icon className="w-20 h-20" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
            {m.label}
          </p>
          <h4 className={cn("text-lg font-black tracking-tight", m.color)}>
            {formatMoney(m.value, sym, 0, numberFormat)}
          </h4>
          <div className="mt-1 flex flex-col">
            {"amounts" in m && m.amounts && (
              <span className="text-[10px] text-zinc-500 font-bold tabular-nums italic">
                {m.amounts}
              </span>
            )}
            <p className="text-[10px] text-zinc-500 font-medium italic">
              {m.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
