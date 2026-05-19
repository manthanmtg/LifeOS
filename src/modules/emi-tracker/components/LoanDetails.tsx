"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  History,
  Files,
  TrendingUp,
  Info,
  Calculator,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CURR_SYM,
  computeSchedule,
  getOutstandingAsOf,
  toCSV,
  downloadTextFile,
  exportSchedulePDF,
} from "../lib/emi-utils";
import { EmiLoan, EmiTrackerSettings } from "../types";
import ScheduleTable from "./ScheduleTable";
import PaymentList from "./PaymentList";
import DocumentList from "./DocumentList";
import RateAdjustmentList from "./RateAdjustmentList";
import LoanAnalysis from "./LoanAnalysis";
import LoanHeader from "./LoanHeader";
import LoanKeyMetrics from "./LoanKeyMetrics";
import LoanOverviewTab from "./LoanOverviewTab";

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
      <LoanHeader loan={loan} onEdit={onEdit} />

      <LoanKeyMetrics
        totalPayable={totalPayable}
        totalPrincipal={totalPrincipal}
        totalInterest={totalInterest}
        outstanding={outstanding}
        principalPaid={principalPaid}
        paidInterest={paidInterest}
        remainingInterest={remainingInterest}
        progressPercent={progressPercent}
        nextDue={nextDue}
        sym={sym}
        numberFormat={numberFormat}
      />

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
              <LoanOverviewTab
                loan={loan}
                simulatedSchedule={simulatedSchedule}
                extraMonthly={extraMonthly}
                setExtraMonthly={setExtraMonthly}
                sym={sym}
                numberFormat={numberFormat}
                interestSavedTotal={interestSavedTotal}
                tenureSaved={tenureSaved}
              />
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
