"use client";

import { useState, useMemo } from "react";
import { X, AlertTriangle, Calendar, Calculator } from "lucide-react";
import {
  amountInWords,
  computeEmiFromFormula,
  toDateInputValue,
  parseDateInputToISO,
} from "../lib/emi-utils";
import { EmiLoan, EmiTrackerSettings } from "../types";

interface LoanFormProps {
  onClose: () => void;
  onSubmit: (payload: EmiLoan["payload"]) => Promise<void>;
  editLoan: EmiLoan | null;
  settings: EmiTrackerSettings;
  isSaving: boolean;
  formError: string | null;
}

export default function LoanForm({
  onClose,
  onSubmit,
  editLoan,
  settings,
  isSaving,
  formError,
}: LoanFormProps) {
  const [title, setTitle] = useState(editLoan?.payload.title || "");
  const [lender] = useState(editLoan?.payload.lender_name || "");
  const [category, setCategory] = useState(
    editLoan?.payload.category || settings.categories[0],
  );
  const [currency, setCurrency] = useState(
    editLoan?.payload.currency || settings.defaultCurrency,
  );
  const [principal, setPrincipal] = useState(
    editLoan?.payload.principal || 1000000,
  );
  const [tenure, setTenure] = useState(editLoan?.payload.tenure_months || 120);
  const [interestRate, setInterestRate] = useState(
    editLoan?.payload.annual_interest_rate || 9.5,
  );
  const [emi, setEmi] = useState(editLoan?.payload.monthly_emi || 0);
  const [startDate, setStartDate] = useState(() =>
    editLoan?.payload.start_date
      ? toDateInputValue(editLoan.payload.start_date)
      : toDateInputValue(new Date().toISOString()),
  );
  const [dueDay, setDueDay] = useState(
    editLoan?.payload.due_day_of_month || settings.defaultDueDayOfMonth,
  );
  const [recastStrategy, setRecastStrategy] = useState(
    editLoan?.payload.recast_strategy || settings.defaultRecastStrategy,
  );

  const suggestedEmi = useMemo(() => {
    return computeEmiFromFormula(principal, interestRate, tenure);
  }, [principal, interestRate, tenure]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EmiLoan["payload"] = {
      title,
      lender_name: lender,
      category,
      currency,
      principal: Number(principal),
      tenure_months: Number(tenure),
      annual_interest_rate: Number(interestRate),
      monthly_emi: Number(emi) || suggestedEmi,
      interest_type: "floating",
      processing_fee_financed: false,
      start_date: parseDateInputToISO(startDate),
      due_day_of_month: Number(dueDay),
      recast_strategy: recastStrategy,
      status: editLoan?.payload.status || "active",
      payments: editLoan?.payload.payments || [],
      documents: editLoan?.payload.documents || [],
      rate_adjustments: editLoan?.payload.rate_adjustments || [],
    };
    onSubmit(payload);
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
      <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/40">
        <div>
          <h2 className="text-2xl font-black text-zinc-50 tracking-tight">
            {editLoan ? "Refine Loan Details" : "New Portfolio Asset"}
          </h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Configure your debt instrument
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-3 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 transition-all shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {formError && (
          <div className="p-5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-bold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="group">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block group-focus-within:text-accent transition-colors">
                Loan Narrative
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dream Mansion, Stealth Model X"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-inner font-medium placeholder:text-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none transition-all shadow-inner font-bold"
                >
                  {settings.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
                  Currency
                </label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none transition-all shadow-inner font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                Principal Amount
              </label>
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-6 shadow-inner space-y-3">
                <input
                  type="number"
                  required
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full bg-transparent text-3xl font-black text-zinc-50 focus:outline-none tabular-nums"
                />
                <p className="text-xs text-zinc-500 font-bold italic tracking-tight truncate">
                  {currency === "INR"
                    ? amountInWords(principal.toString())
                    : `${principal.toLocaleString()} ${currency}`}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block italic">
                  Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none font-black tabular-nums shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block italic">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none font-black tabular-nums shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                Monthly Installment (EMI)
              </label>
              <div className="bg-accent/5 border border-accent/20 rounded-3xl p-6 shadow-xl space-y-4">
                <input
                  type="number"
                  value={emi || ""}
                  onChange={(e) => setEmi(Number(e.target.value))}
                  placeholder={suggestedEmi.toString()}
                  className="w-full bg-transparent text-3xl font-black text-accent focus:outline-none tabular-nums placeholder:text-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setEmi(suggestedEmi)}
                  className="w-full py-2 bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-accent hover:text-zinc-50 transition-all shadow-lg"
                >
                  Auto-Calculate Suggestion
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
                  First Payment
                </label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-accent transition-colors" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-zinc-100 focus:outline-none shadow-inner text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
                  Due Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-3.5 text-zinc-100 focus:outline-none shadow-inner font-black tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                Strategy
              </p>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="recast"
                    checked={recastStrategy === "keep_emi_adjust_tenure"}
                    onChange={() => setRecastStrategy("keep_emi_adjust_tenure")}
                    className="accent-accent"
                  />
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">
                    Adjust Tenure
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="recast"
                    checked={recastStrategy === "keep_tenure_adjust_emi"}
                    onChange={() => setRecastStrategy("keep_tenure_adjust_emi")}
                    className="accent-accent"
                  />
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">
                    Adjust EMI
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3.5 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-50 font-bold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              disabled={isSaving}
              className="px-10 py-3.5 rounded-2xl bg-accent text-zinc-50 font-black text-sm shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isSaving
                ? "Synchronizing..."
                : editLoan
                  ? "Apply Updates"
                  : "Deploy Asset"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
