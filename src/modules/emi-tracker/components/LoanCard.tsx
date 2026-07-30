"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURR_SYM, formatMoney } from "../lib/emi-utils";
import type { EmiLoan, ScheduleRow } from "../types";

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

function statusLabel(status: EmiLoan["payload"]["status"]) {
  if (status === "closed") return "Closed";
  if (status === "archived") return "Archived";
  return "Active";
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
  const sym = CURR_SYM[loan.payload.currency] || `${loan.payload.currency} `;
  const pct = Math.round(progress * 100);

  return (
    <button
      type="button"
      onClick={() => onClick(loan._id)}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "relative min-h-[148px] w-full overflow-hidden rounded-3xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        isSelected
          ? "border-accent/40 bg-zinc-800/85"
          : "border-zinc-800 bg-zinc-900/55 hover:border-zinc-700 hover:bg-zinc-900/80",
      )}
    >
      {isSelected && (
        <span className="absolute inset-y-0 left-0 w-1.5 bg-accent" />
      )}

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black leading-tight text-zinc-50">
              {loan.payload.title}
            </h3>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-bold",
                loan.payload.status === "active"
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400",
              )}
            >
              {statusLabel(loan.payload.status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            {loan.payload.lender_name ? `${loan.payload.lender_name} · ` : ""}
            {loan.payload.category}
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-500" />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-zinc-500">Balance left</p>
        <p className="mt-1 break-words font-mono text-xl font-black text-zinc-50">
          {formatMoney(outstanding, sym, decimals, numberFormat)}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {nextDue
            ? `Due ${nextDue.due_date.slice(0, 10)} · ${formatMoney(
                nextDue.emi,
                sym,
                decimals,
                numberFormat,
              )}`
            : "No upcoming EMI"}
        </p>
      </div>

      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/80"
          role="progressbar"
          aria-label={`${loan.payload.title} principal paid`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-500">
          <span>
            <strong className="block font-mono text-zinc-300">{pct}%</strong>
            paid
          </span>
          <span>
            <strong className="block font-mono text-zinc-300">
              {loan.payload.annual_interest_rate}%
            </strong>
            rate
          </span>
          <span>
            <strong className="block font-mono text-zinc-300">
              {formatMoney(
                loan.payload.monthly_emi,
                sym,
                decimals,
                numberFormat,
              )}
            </strong>
            EMI
          </span>
        </div>
      </div>
    </button>
  );
}
