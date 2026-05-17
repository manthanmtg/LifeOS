"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  History,
  Files,
  Edit3,
  Settings,
  TrendingUp,
  Info,
  Calculator,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  CURR_SYM,
  computeSchedule,
  getOutstandingAsOf,
  roundTo,
  toCSV,
  downloadTextFile,
  exportSchedulePDF,
} from "../lib/emi-utils";
import { EmiLoan, EmiTrackerSettings } from "../types";
import PayoffChart from "./PayoffChart";
import ScheduleTable from "./ScheduleTable";
import PaymentList from "./PaymentList";
import DocumentList from "./DocumentList";
import RateAdjustmentList from "./RateAdjustmentList";
import LoanAnalysis from "./LoanAnalysis";

interface LoanDetailsProps {
  loan: EmiLoan;
  settings: EmiTrackerSettings;
  onUpdate: (payload: EmiLoan["payload"]) => Promise<void>;
  onEdit: () => void;
  isSubmitting: boolean;
}

type Tab =
  | "overview"
  | "analysis"
  | "schedule"
  | "payments"
  | "documents"
  | "adjustments";

export default function LoanDetails({
  loan,
  settings,
  onUpdate,
  onEdit,
  isSubmitting,
}: LoanDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [now] = useState(() => new Date());

  const decimals = settings.roundingDecimals;
  const numberFormat = settings.numberFormat;
  const sym = CURR_SYM[loan.payload.currency] || loan.payload.currency;

  const schedule = useMemo(
    () => computeSchedule(loan.payload, decimals),
    [loan.payload, decimals],
  );

  const simulatedSchedule = useMemo(() => {
    if (extraMonthly === 0) return schedule;
    const simulatedPayload = {
      ...loan.payload,
      monthly_emi: loan.payload.monthly_emi + extraMonthly,
    };
    return computeSchedule(simulatedPayload, decimals);
  }, [loan.payload, extraMonthly, schedule, decimals]);

  const { outstanding, nextDue } = useMemo(() => {
    return getOutstandingAsOf(schedule.rows, now);
  }, [schedule, now]);

  const { paidInterest, remainingInterest } = useMemo(() => {
    let paid = 0;
    schedule.rows.forEach((r) => {
      if (new Date(r.due_date) < now) paid += r.interest;
    });
    return {
      paidInterest: paid,
      remainingInterest: schedule.totals.total_interest - paid,
    };
  }, [schedule, now]);

  const totalPrincipal = loan.payload.principal;
  const totalInterest = schedule.totals.total_interest;
  const totalPayable = totalPrincipal + totalInterest;
  const principalPaid = totalPrincipal - outstanding;
  const progressPercent = Math.min(
    100,
    Math.max(0, (principalPaid / totalPrincipal) * 100),
  );

  const interestSavedTotal = useMemo(() => {
    const originalInterest = schedule.totals.total_interest;
    const simulatedInterest = simulatedSchedule.totals.total_interest;
    return Math.max(0, originalInterest - simulatedInterest);
  }, [schedule, simulatedSchedule]);

  const tenureSaved = useMemo(() => {
    return Math.max(0, schedule.rows.length - simulatedSchedule.rows.length);
  }, [schedule, simulatedSchedule]);

  const tabs: {
    id: Tab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: "overview", label: "Simulator", icon: Calculator },
    { id: "analysis", label: "Analysis", icon: BarChart3 },
    { id: "schedule", label: "Schedule", icon: Info },
    { id: "payments", label: "History", icon: History },
    { id: "documents", label: "Vault", icon: Files },
    { id: "adjustments", label: "Rates", icon: TrendingUp },
  ];

  const handleUpdatePayments = async (
    payments: EmiLoan["payload"]["payments"],
  ) => {
    await onUpdate({ ...loan.payload, payments });
  };

  const handleUpdateDocs = async (
    documents: EmiLoan["payload"]["documents"],
  ) => {
    await onUpdate({ ...loan.payload, documents });
  };

  const handleUpdateAdjustments = async (
    rate_adjustments: EmiLoan["payload"]["rate_adjustments"],
  ) => {
    await onUpdate({ ...loan.payload, rate_adjustments });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-accent shadow-lg shadow-accent/5">
            <Calculator className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-50 tracking-tight">
              {loan.payload.title}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500 border-r border-zinc-800 pr-3">
                {loan.payload.lender_name || "Private Loan"}
              </span>
              <span className="text-xs font-bold text-zinc-400">
                {loan.payload.category}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-zinc-800/80 text-zinc-300 hover:text-zinc-50 border border-zinc-700/50 hover:bg-zinc-700 transition-all font-bold text-sm shadow-md"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
          <button aria-label="Loan settings" className="p-2.5 rounded-2xl bg-zinc-800/80 text-zinc-400 hover:text-zinc-50 border border-zinc-700/50 transition-all shadow-md">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
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
        ].map((m, i) => (
          <div
            key={i}
            className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 shadow-sm hover:border-zinc-700/50 transition-all group overflow-hidden relative"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
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

      <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-zinc-800 text-accent shadow-[0_0_15px_rgba(var(--color-accent),0.1)] border border-accent/20"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40",
            )}
          >
            <tab.icon
              className={cn(
                "w-3.5 h-3.5",
                activeTab === tab.id ? "animate-pulse" : "",
              )}
            />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-300">
                        Payoff Projection
                      </h3>
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
                        sub: loan.payload.processing_fee_financed
                          ? "Financed"
                          : "Upfront",
                      },
                      {
                        label: "Recast Strategy",
                        value:
                          loan.payload.recast_strategy ===
                          "keep_tenure_adjust_emi"
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
                        Visualize how extra monthly payments impact your loan
                        tenure and interest.
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
                        onChange={(e) =>
                          setExtraMonthly(Number(e.target.value))
                        }
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
                        <span className="text-lg font-bold text-accent/80">
                          Months
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 font-medium mt-2 italic">
                        Earlier payoff date
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analysis" && (
              <LoanAnalysis
                loan={loan}
                schedule={schedule}
                currencySymbol={sym}
                numberFormat={numberFormat}
                decimals={decimals}
              />
            )}

            {activeTab === "schedule" && (
              <ScheduleTable
                schedule={schedule}
                currencySymbol={sym}
                decimals={decimals}
                numberFormat={numberFormat}
                onExportCSV={() => {
                  const csv = toCSV(schedule.rows);
                  downloadTextFile(
                    `${loan.payload.title}_schedule.csv`,
                    csv,
                    "text/csv",
                  );
                }}
                onPrintPDF={() => {
                  exportSchedulePDF(
                    loan.payload.title,
                    schedule,
                    sym,
                    decimals,
                    numberFormat,
                  );
                }}
              />
            )}

            {activeTab === "payments" && (
              <PaymentList
                payments={loan.payload.payments}
                currencySymbol={sym}
                decimals={decimals}
                numberFormat={numberFormat}
                isSubmitting={isSubmitting}
                onAdd={async (p) => {
                  await handleUpdatePayments([...loan.payload.payments, p]);
                }}
                onDelete={async (idx) => {
                  const next = [...loan.payload.payments];
                  next.splice(idx, 1);
                  await handleUpdatePayments(next);
                }}
              />
            )}

            {activeTab === "documents" && (
              <DocumentList
                documents={loan.payload.documents}
                isSubmitting={isSubmitting}
                onAdd={async (d) => {
                  await handleUpdateDocs([...loan.payload.documents, d]);
                }}
                onDelete={async (idx) => {
                  const next = [...loan.payload.documents];
                  next.splice(idx, 1);
                  await handleUpdateDocs(next);
                }}
              />
            )}

            {activeTab === "adjustments" && (
              <RateAdjustmentList
                adjustments={loan.payload.rate_adjustments}
                isSubmitting={isSubmitting}
                onAdd={async (a) => {
                  await handleUpdateAdjustments([
                    ...loan.payload.rate_adjustments,
                    a,
                  ]);
                }}
                onDelete={async (idx) => {
                  const next = [...loan.payload.rate_adjustments];
                  next.splice(idx, 1);
                  await handleUpdateAdjustments(next);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
