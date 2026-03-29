"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Calculator } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { trackEvent } from "@/lib/analytics";
import { 
  EmiLoan, 
  EmiTrackerSettings 
} from "./types";
import { 
  computeSchedule, 
  getOutstandingAsOf, 
  calculateInterestSaved
} from "./lib/emi-utils";

// Components
import EMIMetrics from "./components/EMIMetrics";
import LoanList from "./components/LoanList";
import LoanForm from "./components/LoanForm";
import LoanDetails from "./components/LoanDetails";

const DEFAULTS: EmiTrackerSettings = {
  defaultCurrency: "INR",
  defaultDueDayOfMonth: 5,
  roundingDecimals: 2,
  numberFormat: "indian",
  defaultRecastStrategy: "keep_emi_adjust_tenure",
  categories: ["Home", "Car", "Education", "Personal", "Other"],
};

export default function EmiTrackerAdminView() {
  const { settings: rawSettings } = useModuleSettings<EmiTrackerSettings>(
    "emi-tracker",
    DEFAULTS
  );
  const settings = useMemo(() => ({ ...DEFAULTS, ...rawSettings }), [rawSettings]);

  const [loans, setLoans] = useState<EmiLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<EmiLoan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/content?module_type=emi_loan");
      const data = await res.json();
      if (data.success) {
        setLoans(data.data);
        if (data.data.length > 0 && !selectedId) {
          // setSelectedId(data.data[0]._id); // Don't auto-select to avoid heavy compute on load
        }
      }
    } catch (err) {
      console.error("Failed to fetch loans", err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const selectedLoan = useMemo(
    () => loans.find((l) => l._id === selectedId) || null,
    [loans, selectedId]
  );

  const loanCards = useMemo(() => {
    const now = new Date();
    const filtered = loans
      .filter(l => 
        l.payload.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.payload.lender_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return filtered.map((loan) => {
        const schedule = computeSchedule(loan.payload, settings.roundingDecimals);
        const { outstanding, nextDue } = getOutstandingAsOf(schedule.rows, now);
        const totalPrincipal = loan.payload.principal;
        const progress = Math.min(1, Math.max(0, (totalPrincipal - outstanding) / totalPrincipal));
        return { loan, outstanding, nextDue, progress };
      });
  }, [loans, searchQuery, settings.roundingDecimals]);

  const quickStats = useMemo(() => {
    const active = loans.filter((l) => l.payload.status === "active");
    const now = new Date();
    const currencies: Record<string, number> = {};
    let nearest: { loan: EmiLoan; row: { due_date: string } } | null = null;

    active.forEach((l) => {
      const schedule = computeSchedule(l.payload, settings.roundingDecimals);
      const { outstanding, nextDue } = getOutstandingAsOf(schedule.rows, now);
      currencies[l.payload.currency] = (currencies[l.payload.currency] || 0) + outstanding;

      if (nextDue) {
        if (!nearest || new Date(nextDue.due_date).getTime() < new Date((nearest as { row: { due_date: string } }).row.due_date).getTime()) {
          nearest = { loan: l, row: nextDue };
        }
      }
    });

    return {
      activeCount: active.length,
      outstandingByCurrency: Object.entries(currencies).map(([currency, amount]) => ({
        currency,
        amount,
      })),
      nearestDue: nearest,
    };
  }, [loans, settings.roundingDecimals]);

  const totalInterestSavedAcrossAll = useMemo(() => {
    return loans.reduce((acc, loan) => {
      const schedule = computeSchedule(loan.payload, settings.roundingDecimals);
      // We need an "original" schedule without prepayments to compare
      const originalPayload = { ...loan.payload, payments: loan.payload.payments.filter(p => p.kind !== 'prepayment') };
      const originalSchedule = computeSchedule(originalPayload, settings.roundingDecimals);
      return acc + calculateInterestSaved(schedule.rows, originalSchedule.totals.total_interest);
    }, 0);
  }, [loans, settings.roundingDecimals]);

  const handleSaveLoan = async (payload: EmiLoan["payload"]) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const method = editLoan ? "PUT" : "POST";
      const url = editLoan ? `/api/content/${editLoan._id}` : "/api/content";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editLoan ? { payload } : { module_type: "emi_loan", payload, is_public: false }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchLoans();
        setIsFormOpen(false);
        setEditLoan(null);
        if (!editLoan) setSelectedId(data.data._id);
        trackEvent({ module: "emi_tracker", action: editLoan ? "update" : "create", label: payload.title });
      } else {
        setFormError(data.error || "Failed to save loan");
      }
    } catch {
      console.error("Failed to save loan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLoanPayload = async (payload: EmiLoan["payload"]) => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/content/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (data.success) {
        setLoans(prev => prev.map(l => l._id === selectedId ? data.data : l));
        trackEvent({ module: "emi_tracker", action: "payload_update", label: selectedId });
      }
    } catch (err) {
      console.error("Update failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-transparent">
      {/* Top Metrics Section */}
      <EMIMetrics
        quickStats={quickStats}
        totalInterestSaved={totalInterestSavedAcrossAll}
        currency={settings.defaultCurrency}
        numberFormat={settings.numberFormat}
        decimals={settings.roundingDecimals}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar: Loan List */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-widest text-[11px]">My Portfolios</h3>
                <button
                    onClick={() => {
                        setEditLoan(null);
                        setIsFormOpen(true);
                    }}
                    className="p-2 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
             </div>
             
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-accent transition-colors" />
                <input 
                    placeholder="Search loans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-inner"
                />
             </div>
          </div>

          <LoanList
            loanCards={loanCards}
            selectedId={selectedId}
            onSelect={setSelectedId}
            decimals={settings.roundingDecimals}
            numberFormat={settings.numberFormat}
            loading={loading}
          />
        </div>

        {/* Main View: Loan Details or Form */}
        <div className="lg:col-span-8">
          {isFormOpen ? (
            <LoanForm
              onClose={() => {
                setIsFormOpen(false);
                setEditLoan(null);
              }}
              onSubmit={handleSaveLoan}
              editLoan={editLoan}
              settings={settings}
              isSaving={isSaving}
              formError={formError}
            />
          ) : selectedLoan ? (
            <LoanDetails
              loan={selectedLoan}
              settings={settings}
              isSubmitting={isSaving}
              onUpdate={handleUpdateLoanPayload}
              onEdit={() => {
                setEditLoan(selectedLoan);
                setIsFormOpen(true);
              }}
            />
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center text-center bg-zinc-900/20 border border-zinc-800/50 border-dashed rounded-[40px] p-12 transition-all group hover:bg-zinc-900/30">
              <div className="w-24 h-24 bg-zinc-800/50 rounded-[32px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Calculator className="w-10 h-10 text-zinc-600 group-hover:text-accent transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-zinc-300">Intelligent EMI Tracking</h3>
              <p className="text-zinc-500 max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                Select a loan from your portfolio or create a new one to unlock visualizations and payoff projections.
              </p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-8 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-2xl text-sm font-bold transition-all shadow-xl"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
