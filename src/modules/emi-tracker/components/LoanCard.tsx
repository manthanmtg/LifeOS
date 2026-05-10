"use client";

import { cn } from "@/lib/utils";
import { formatMoney, CURR_SYM } from "../lib/emi-utils";
import { EmiLoan, ScheduleRow } from "../types";

interface LoanCardProps {
  loan: EmiLoan;
  outstanding: number;
  nextDue: ScheduleRow | null;
  progress: number;
  isSelected: boolean;
  onClick: (id: string) => void;
  decimals: number;
  numberFormat: "western" | "indian";
}

export default function LoanCard({
  loan,
  outstanding,
  nextDue,
  progress,
  isSelected,
  onClick,
  decimals,
  numberFormat,
}: LoanCardProps) {
  const sym = CURR_SYM[loan.payload.currency] || loan.payload.currency;

  return (
    <button
      onClick={() => onClick(loan._id)}
      className={cn(
        "w-full text-left border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group",
        isSelected
          ? "bg-zinc-800/80 border-accent/50 shadow-lg shadow-accent/5 ring-1 ring-accent/20"
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40",
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent shadow-[4px_0_12px_rgba(var(--color-accent),0.3)]" />
      )}

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="max-w-[65%]">
          <h4
            className={cn(
              "text-sm font-bold truncate transition-colors",
              isSelected
                ? "text-zinc-50"
                : "text-zinc-300 group-hover:text-zinc-100",
            )}
          >
            {loan.payload.title}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium leading-relaxed">
            {loan.payload.lender_name ? `${loan.payload.lender_name} · ` : ""}
            <span className="text-zinc-400">{loan.payload.category}</span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isSelected ? "text-accent" : "text-zinc-200",
            )}
          >
            {formatMoney(outstanding, sym, decimals, numberFormat)}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-1">
            {nextDue ? `Due ${nextDue.due_date.slice(0, 10)}` : "Closed"}
          </p>
        </div>
      </div>

      <div className="mt-4 relative z-10">
        <div className="flex items-center justify-between text-[10px] mb-1.5 px-0.5">
          <span className="text-zinc-500 font-bold uppercase tracking-tighter">
            Principal Paid
          </span>
          <span
            className={cn(
              "font-black tracking-tighter",
              isSelected ? "text-accent" : "text-zinc-400",
            )}
          >
            {(progress * 100).toFixed(0)}%
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-zinc-950/80 border border-zinc-50/[0.03] overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out shadow-[0_0_8px]",
              isSelected
                ? "bg-accent shadow-accent/40"
                : "bg-zinc-700 shadow-transparent",
            )}
            style={{ width: `${(progress * 100).toFixed(0)}%` }}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-50/[0.05] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
              Monthly EMI
            </span>
            <span
              className={cn(
                "text-xs font-bold",
                isSelected ? "text-zinc-100" : "text-zinc-400",
              )}
            >
              {formatMoney(
                loan.payload.monthly_emi,
                sym,
                decimals,
                numberFormat,
              )}
            </span>
          </div>
          <div className="flex flex-col text-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
              Rate
            </span>
            <span
              className={cn(
                "text-xs font-bold",
                isSelected ? "text-zinc-100" : "text-zinc-400",
              )}
            >
              {loan.payload.annual_interest_rate}%
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
              Tenure
            </span>
            <span
              className={cn(
                "text-xs font-bold",
                isSelected ? "text-zinc-100" : "text-zinc-400",
              )}
            >
              {loan.payload.tenure_months} mo
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
