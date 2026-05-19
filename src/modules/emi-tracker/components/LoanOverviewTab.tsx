"use client";

import { Info, TrendingUp } from "lucide-react";
import { formatMoney, roundTo } from "../lib/emi-utils";
import { EmiLoan, ScheduleResult } from "../types";
import PayoffChart from "./PayoffChart";

interface LoanOverviewTabProps {
  loan: EmiLoan;
  simulatedSchedule: ScheduleResult;
  extraMonthly: number;
  setExtraMonthly: (val: number) => void;
  sym: string;
  numberFormat: "western" | "indian";
  interestSavedTotal: number;
  tenureSaved: number;
}

export default function LoanOverviewTab({
  loan,
  simulatedSchedule,
  extraMonthly,
  setExtraMonthly,
  sym,
  numberFormat,
  interestSavedTotal,
  tenureSaved,
}: LoanOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-300">Payoff Projection</h3>
            <p className="text-[10px] text-zinc-500 font-medium italic mt-1 uppercase tracking-widest">
              Principal vs. Interest distribution
            </p>
          </div>
        </div>
        <PayoffChart
          schedule={simulatedSchedule.rows}
          currencySymbol={sym}
          numberFormat={numberFormat}
        />
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-lg">
        <h3 className="text-sm font-bold text-zinc-300 mb-6 flex items-center gap-2">
          <Info className="w-4 h-4 text-accent" />
          Technical Profile
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Interest Type",
              value: loan.payload.interest_type,
              sub: "Rate model",
            },
            {
              label: "Processing Fee",
              value: loan.payload.processing_fee_amount
                ? formatMoney(
                    loan.payload.processing_fee_amount,
                    sym,
                    0,
                    numberFormat,
                  )
                : "None",
              sub: loan.payload.processing_fee_financed ? "Financed" : "Upfront",
            },
            {
              label: "Recast Strategy",
              value:
                loan.payload.recast_strategy === "keep_tenure_adjust_emi"
                  ? "Keep Tenure"
                  : "Keep EMI",
              sub: "Default behavior",
            },
            {
              label: "Start Date",
              value: loan.payload.start_date.slice(0, 10),
              sub: "Initial disbursement",
            },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {item.label}
              </p>
              <p className="text-sm font-bold text-zinc-200 capitalize">
                {item.value}
              </p>
              <p className="text-[10px] text-zinc-500 font-medium italic">
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              &quot;What If&quot; Simulator
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Visualize how extra monthly payments impact your loan tenure and interest.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold px-1">
              <span className="text-zinc-400 uppercase tracking-widest">
                Extra Monthly Payment
              </span>
              <span className="text-accent text-sm font-black tabular-nums">
                {formatMoney(extraMonthly, sym, 0, numberFormat)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={loan.payload.monthly_emi * 2}
              step={roundTo(loan.payload.monthly_emi / 20, 0)}
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-3xl p-6 shadow-xl flex flex-col justify-center gap-6 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">
              Potential Savings
            </p>
            <h4 className="text-3xl font-black text-zinc-50 tracking-tight">
              {formatMoney(interestSavedTotal, sym, 0, numberFormat)}
            </h4>
            <p className="text-xs text-zinc-400 font-medium mt-2">
              Total Interest Saved
            </p>
          </div>
          <div className="relative z-10 pt-4 border-t border-accent/10">
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">
              Tenure Reduction
            </p>
            <h4 className="text-2xl font-black text-zinc-50 tracking-tight">
              {tenureSaved}{" "}
              <span className="text-lg font-bold text-accent/80">Months</span>
            </h4>
            <p className="text-xs text-zinc-400 font-medium mt-2 italic">
              Earlier payoff date
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
