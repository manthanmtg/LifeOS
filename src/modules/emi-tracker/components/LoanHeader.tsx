"use client";

import { Calculator, Edit3, Settings } from "lucide-react";
import { EmiLoan } from "../types";

interface LoanHeaderProps {
  loan: EmiLoan;
  onEdit: () => void;
}

export default function LoanHeader({ loan, onEdit }: LoanHeaderProps) {
  return (
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
        <button
          aria-label={`Loan settings for ${loan.payload.title}`}
          className="p-2.5 rounded-2xl bg-zinc-800/80 text-zinc-400 hover:text-zinc-50 border border-zinc-700/50 transition-all shadow-md"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
