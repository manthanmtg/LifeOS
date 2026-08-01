"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, roundTo } from "../lib/emi-utils";
import type { EmiLoan, ScheduleResult } from "../types";
import PayoffChart from "./PayoffChart";

const PRESSABLE =
  "transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

interface LoanOverviewTabProps {
  loan: EmiLoan;
  baselineSchedule: ScheduleResult;
  simulatedSchedule: ScheduleResult;
  extraMonthly: number;
  setExtraMonthly: (val: number) => void;
  sym: string;
  numberFormat: "western" | "indian";
  decimals: number;
  interestSavedTotal: number;
  tenureSaved: number;
}

export default function LoanOverviewTab({
  loan,
  baselineSchedule,
  simulatedSchedule,
  extraMonthly,
  setExtraMonthly,
  sym,
  numberFormat,
  decimals,
  interestSavedTotal,
  tenureSaved,
}: LoanOverviewTabProps) {
  const [termsOpen, setTermsOpen] = useState(false);
  const maxExtra = Math.max(loan.payload.monthly_emi * 2, 1);
  const step = Math.max(1, roundTo(loan.payload.monthly_emi / 20, 0));
  const presets = [0.05, 0.1, 0.25, 0.5].map((pct) => ({
    label: `+${Math.round(pct * 100)}%`,
    value: roundTo(loan.payload.monthly_emi * pct, 0),
  }));
  const baselinePayoff = baselineSchedule.rows.at(-1)?.due_date.slice(0, 10);
  const simulatedPayoff = simulatedSchedule.rows.at(-1)?.due_date.slice(0, 10);

  const setClampedExtra = (value: number) => {
    setExtraMonthly(
      Math.min(maxExtra, Math.max(0, Number.isFinite(value) ? value : 0)),
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-zinc-100">
                What if I pay more?
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Test a monthly extra payment without changing saved loan data.
              </p>
            </div>
            {extraMonthly > 0 && (
              <button
                type="button"
                onClick={() => setExtraMonthly(0)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                  PRESSABLE,
                )}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <label
                htmlFor="extra-monthly"
                className="text-sm font-bold text-zinc-300"
              >
                Extra each month
              </label>
              <input
                id="extra-monthly"
                type="number"
                min={0}
                max={maxExtra}
                inputMode="decimal"
                value={extraMonthly}
                onBlur={() => setClampedExtra(extraMonthly)}
                onChange={(event) =>
                  setClampedExtra(Number(event.target.value))
                }
                className="mt-2 min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 font-mono text-base font-bold text-zinc-100 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="min-w-0 space-y-4">
              <input
                aria-label="Extra monthly payment"
                type="range"
                min={0}
                max={maxExtra}
                step={step}
                value={extraMonthly}
                onChange={(event) =>
                  setClampedExtra(Number(event.target.value))
                }
                className="mt-7 w-full accent-accent"
              />
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setExtraMonthly(preset.value)}
                    className={cn(
                      "min-h-[44px] rounded-lg border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                      PRESSABLE,
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-accent/20 bg-accent/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-accent">
                <TrendingDown className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">
                  Payoff impact
                </p>
              </div>
              <p className="text-lg font-black text-zinc-50">
                {tenureSaved > 0
                  ? `Finish ${tenureSaved} ${tenureSaved === 1 ? "month" : "months"} earlier`
                  : "This amount does not change the projected payoff yet."}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {baselinePayoff ?? "—"} → {simulatedPayoff ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-success">
                Interest saved
              </p>
              <p className="mt-2 font-mono text-2xl font-black text-zinc-50">
                {formatMoney(interestSavedTotal, sym, decimals, numberFormat)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Baseline interest{" "}
                {formatMoney(
                  baselineSchedule.totals.total_interest,
                  sym,
                  decimals,
                  numberFormat,
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-lg font-black text-zinc-100">
            Baseline vs faster payoff
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Closing balance over time for the saved loan and current simulation.
          </p>
          <PayoffChart
            baselineSchedule={baselineSchedule.rows}
            simulatedSchedule={simulatedSchedule.rows}
            currencySymbol={sym}
            numberFormat={numberFormat}
          />
        </section>
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <button
          type="button"
          onClick={() => setTermsOpen((open) => !open)}
          className={cn(
            "flex min-h-[44px] w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 xl:pointer-events-none",
            PRESSABLE,
          )}
        >
          <div>
            <h3 className="text-lg font-black text-zinc-100">Loan terms</h3>
            <p className="text-sm text-zinc-500">
              Source terms used for projections.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-zinc-500 transition-transform xl:hidden",
              termsOpen && "rotate-180",
            )}
          />
        </button>

        <dl
          className={cn(
            "mt-5 grid gap-4 text-sm xl:grid",
            termsOpen ? "grid" : "hidden xl:grid",
          )}
        >
          {[
            ["Interest type", loan.payload.interest_type],
            [
              "Processing fee",
              loan.payload.processing_fee_amount
                ? formatMoney(
                    loan.payload.processing_fee_amount,
                    sym,
                    decimals,
                    numberFormat,
                  )
                : loan.payload.processing_fee_percent
                  ? `${loan.payload.processing_fee_percent}%`
                  : "None",
            ],
            [
              "Fee financed",
              loan.payload.processing_fee_financed ? "Yes" : "No",
            ],
            [
              "Rate behavior",
              loan.payload.recast_strategy === "keep_tenure_adjust_emi"
                ? "Keep payoff date, change EMI"
                : "Keep EMI, change payoff date",
            ],
            ["Start date", loan.payload.start_date.slice(0, 10)],
            ["Tenure", `${loan.payload.tenure_months} months`],
            ["Due day", `${loan.payload.due_day_of_month}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-4"
            >
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                {label}
              </dt>
              <dd className="mt-1 font-semibold text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
