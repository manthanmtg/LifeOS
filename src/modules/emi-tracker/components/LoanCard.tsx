"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURR_SYM, formatMoney } from "../lib/emi-utils";
import type { EmiLoan, ScheduleRow } from "../types";
import { financialValueClass } from "./financial-value";

interface LoanCardProps {
  loan: EmiLoan;
  outstanding: number;
  nextDue: ScheduleRow | null;
  progress: number;
  effectiveStatus: EmiLoan["payload"]["status"];
  isSelected: boolean;
  onClick: (id: string) => void;
  decimals: number;
  numberFormat: "western" | "indian";
  variant?: "portfolio" | "navigator";
}

function statusLabel(status: EmiLoan["payload"]["status"]) {
  if (status === "closed") return "Closed";
  if (status === "archived") return "Archived";
  return "Active";
}

const PRESSABLE =
  "transition-all duration-200 ease-out active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100";

export default function LoanCard({
  loan,
  outstanding,
  nextDue,
  progress,
  effectiveStatus,
  isSelected,
  onClick,
  decimals,
  numberFormat,
  variant = "portfolio",
}: LoanCardProps) {
  const sym = CURR_SYM[loan.payload.currency] || `${loan.payload.currency} `;
  const pct = Math.round(progress * 100);
  const balance = formatMoney(outstanding, sym, decimals, numberFormat);
  const dueLabel = nextDue
    ? `Due ${nextDue.due_date.slice(0, 10)} · ${formatMoney(
        nextDue.emi,
        sym,
        decimals,
        numberFormat,
      )}`
    : "No upcoming EMI";
  const isNavigator = variant === "navigator";

  return (
    <button
      type="button"
      onClick={() => onClick(loan._id)}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        isNavigator ? "min-h-[72px] p-3" : "min-h-[148px] p-4",
        PRESSABLE,
        isSelected
          ? "border-accent/50 bg-zinc-900/80"
          : "border-zinc-800 bg-zinc-900/45 hover:border-zinc-700 hover:bg-zinc-900/70",
      )}
    >
      {isSelected && (
        <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
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
                effectiveStatus === "active"
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400",
              )}
            >
              {statusLabel(effectiveStatus)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            {loan.payload.lender_name ? `${loan.payload.lender_name} · ` : ""}
            {loan.payload.category}
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </div>

      <div className={cn(isNavigator ? "mt-2" : "mt-4")}>
        <p className="text-xs font-semibold text-zinc-500">Balance left</p>
        <p
          data-financial-value={`loan-card-${loan._id}-balance`}
          className={cn("mt-1", financialValueClass(balance, "major"))}
        >
          {balance}
        </p>
        <p className="mt-1 text-sm text-zinc-400">{dueLabel}</p>
      </div>

      <div className={cn(isNavigator ? "mt-3" : "mt-4")}>
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
        <p className="mt-2 text-xs font-semibold text-zinc-500">
          <span className="font-mono tabular-nums text-zinc-300">{pct}%</span>{" "}
          principal paid
        </p>
      </div>
    </button>
  );
}
