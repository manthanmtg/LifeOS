"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  Edit3,
  Percent,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CURR_SYM,
  downloadTextFile,
  exportSchedulePDF,
  formatMoney,
  toCSV,
} from "../lib/emi-utils";
import {
  buildLoanWorkspaceViewModel,
  type LoanSection,
} from "../lib/emi-view-model";
import type { EmiLoan, EmiTrackerSettings } from "../types";
import PayoffRunway from "./PayoffRunway";
import LoanOverviewTab from "./LoanOverviewTab";
import LoanAnalysis from "./LoanAnalysis";
import ScheduleTable from "./ScheduleTable";
import ActivityTab from "./ActivityTab";
import DocumentList from "./DocumentList";

interface LoanDetailsProps {
  loan: EmiLoan;
  settings: EmiTrackerSettings;
  activeSection: LoanSection;
  onSectionChange: (section: LoanSection) => void;
  onBack: () => void;
  onUpdate: (payload: EmiLoan["payload"]) => Promise<void>;
  onEdit: () => void;
  isSubmitting: boolean;
}

const SECTIONS: Array<{ id: LoanSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "insights", label: "Insights" },
  { id: "schedule", label: "Schedule" },
  { id: "activity", label: "Activity" },
  { id: "documents", label: "Documents" },
];

function pressableClass() {
  return "transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";
}

export default function LoanDetails({
  loan,
  settings,
  activeSection,
  onSectionChange,
  onBack,
  onUpdate,
  onEdit,
  isSubmitting,
}: LoanDetailsProps) {
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [pendingSection, setPendingSection] = useState<LoanSection | null>(
    null,
  );
  const [now] = useState(() => new Date());
  const decimals = settings.roundingDecimals;
  const numberFormat = settings.numberFormat;
  const sym = CURR_SYM[loan.payload.currency] || `${loan.payload.currency} `;
  const model = useMemo(
    () => buildLoanWorkspaceViewModel(loan, extraMonthly, now, decimals),
    [loan, extraMonthly, now, decimals],
  );
  const warning = model.schedule.warnings[0];
  const unsettledPendingSection =
    pendingSection !== activeSection ? pendingSection : null;
  const pendingSectionLabel = unsettledPendingSection
    ? SECTIONS.find((section) => section.id === unsettledPendingSection)?.label
    : null;
  const isSectionPending =
    unsettledPendingSection !== null;
  const isWorkspaceBusy = isSubmitting || isSectionPending;

  const selectSection = (section: LoanSection) => {
    if (section === activeSection) return;
    setPendingSection(section);
    onSectionChange(section);
  };

  const facts = [
    {
      label: "Next EMI",
      value: model.nextDue
        ? formatMoney(model.nextDue.emi, sym, decimals, numberFormat)
        : "None",
      sub: model.nextDue
        ? model.nextDue.due_date.slice(0, 10)
        : "No upcoming due",
      icon: CalendarClock,
    },
    {
      label: "Monthly EMI",
      value: formatMoney(loan.payload.monthly_emi, sym, decimals, numberFormat),
      sub: "Current payment",
      icon: WalletCards,
    },
    {
      label: "Rate",
      value: `${model.currentAnnualRate}%`,
      sub: loan.payload.interest_type,
      icon: Percent,
    },
    {
      label: "Interest left",
      value: formatMoney(model.remainingInterest, sym, decimals, numberFormat),
      sub: "Projected",
      icon: WalletCards,
    },
  ];

  const updatePayments = async (payments: EmiLoan["payload"]["payments"]) => {
    await onUpdate({ ...loan.payload, payments });
  };
  const updateAdjustments = async (
    rate_adjustments: EmiLoan["payload"]["rate_adjustments"],
  ) => {
    await onUpdate({ ...loan.payload, rate_adjustments });
  };
  const updateDocuments = async (
    documents: EmiLoan["payload"]["documents"],
  ) => {
    await onUpdate({ ...loan.payload, documents });
  };

  return (
    <article className="min-w-0 space-y-5">
      <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/85 px-4 py-3 backdrop-blur xl:static xl:mx-0 xl:rounded-3xl xl:border xl:bg-zinc-900/60 xl:p-5">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-800 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 xl:hidden",
            pressableClass(),
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Loans
        </button>
        <div className="min-w-0 flex-1 xl:flex-none">
          <h2 className="truncate text-lg font-black text-zinc-50 xl:text-2xl">
            {loan.payload.title}
          </h2>
          <p className="truncate text-sm text-zinc-500">
            {loan.payload.lender_name ? `${loan.payload.lender_name} · ` : ""}
            {loan.payload.category} · {loan.payload.status}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-2xl bg-accent px-3 py-2 text-sm font-black text-zinc-50 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
            pressableClass(),
          )}
        >
          <Edit3 className="h-4 w-4" />
          <span className="hidden sm:inline">Edit loan</span>
          <span className="sm:hidden">Edit</span>
        </button>
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-zinc-950/20 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Balance left
              </p>
              <h3 className="mt-2 break-words font-mono text-4xl font-black tracking-tight text-zinc-50 md:text-5xl">
                {formatMoney(model.outstanding, sym, decimals, numberFormat)}
              </h3>
              <p className="mt-2 text-sm font-semibold text-zinc-400">
                {model.progressPercent}% of principal repaid
              </p>
            </div>
            <PayoffRunway
              startDate={loan.payload.start_date}
              today={now}
              progressPercent={model.progressPercent}
              baselinePayoffDate={model.baselinePayoffDate}
              simulatedPayoffDate={model.simulatedPayoffDate}
              monthsSaved={model.tenureSavedMonths}
              extraMonthlyLabel={formatMoney(
                extraMonthly,
                sym,
                decimals,
                numberFormat,
              )}
              warning={warning}
            />
          </div>

          <dl className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  <fact.icon className="h-4 w-4" />
                  <dt className="text-xs font-bold uppercase tracking-[0.12em]">
                    {fact.label}
                  </dt>
                </div>
                <dd className="font-mono text-lg font-black text-zinc-50">
                  {fact.value}
                </dd>
                <p className="mt-1 text-xs text-zinc-500 capitalize">
                  {fact.sub}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Loan sections"
        className="flex flex-wrap gap-2 rounded-3xl border border-zinc-800 bg-zinc-900/55 p-2"
      >
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`emi-section-${section.id}`}
            onClick={() => selectSection(section.id)}
            className={cn(
              "min-h-[44px] rounded-2xl px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              pressableClass(),
              activeSection === section.id
                ? "bg-accent text-zinc-50"
                : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {isWorkspaceBusy && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-bold text-accent shadow-lg shadow-zinc-950/20"
          >
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 rounded-full border-2 border-accent/25 border-t-accent motion-safe:animate-spin"
            />
            {isSubmitting
              ? "Saving loan updates…"
              : `Loading ${pendingSectionLabel ?? "section"}…`}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={`${loan._id}-${activeSection}`}
            id={`emi-section-${activeSection}`}
            role="tabpanel"
            aria-busy={isWorkspaceBusy}
            className={cn(
              "min-w-0 will-change-transform",
              isSectionPending && "pointer-events-none opacity-75",
            )}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {activeSection === "overview" && (
              <LoanOverviewTab
                loan={loan}
                baselineSchedule={model.schedule}
                simulatedSchedule={model.simulatedSchedule}
                extraMonthly={extraMonthly}
                setExtraMonthly={setExtraMonthly}
                sym={sym}
                numberFormat={numberFormat}
                decimals={decimals}
                interestSavedTotal={model.interestSaved}
                tenureSaved={model.tenureSavedMonths}
              />
            )}
            {activeSection === "insights" && (
              <LoanAnalysis
                loan={loan}
                schedule={model.schedule}
                currencySymbol={sym}
                numberFormat={numberFormat}
                decimals={decimals}
              />
            )}
            {activeSection === "schedule" && (
              <ScheduleTable
                schedule={model.schedule}
                currencySymbol={sym}
                decimals={decimals}
                numberFormat={numberFormat}
                onExportCSV={() => {
                  const csv = toCSV(model.schedule.rows);
                  downloadTextFile(
                    `${loan.payload.title}_schedule.csv`,
                    csv,
                    "text/csv",
                  );
                }}
                onPrintPDF={() => {
                  exportSchedulePDF(
                    loan.payload.title,
                    model.schedule,
                    sym,
                    decimals,
                    numberFormat,
                  );
                }}
              />
            )}
            {activeSection === "activity" && (
              <ActivityTab
                loan={loan}
                currencySymbol={sym}
                decimals={decimals}
                numberFormat={numberFormat}
                isSubmitting={isSubmitting}
                onUpdatePayments={updatePayments}
                onUpdateAdjustments={updateAdjustments}
              />
            )}
            {activeSection === "documents" && (
              <DocumentList
                documents={loan.payload.documents}
                isSubmitting={isSubmitting}
                onAdd={async (document) => {
                  await updateDocuments([...loan.payload.documents, document]);
                }}
                onDelete={async (index) => {
                  const next = [...loan.payload.documents];
                  next.splice(index, 1);
                  await updateDocuments(next);
                }}
              />
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </article>
  );
}
