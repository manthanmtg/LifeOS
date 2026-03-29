"use client";

import { useState } from "react";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { formatMoney, parseDateInputToISO } from "../lib/emi-utils";
import { PaymentKind, EmiLoan } from "../types";

interface PaymentListProps {
  payments: EmiLoan["payload"]["payments"];
  currencySymbol: string;
  decimals: number;
  numberFormat: "western" | "indian";
  onAdd: (payment: EmiLoan["payload"]["payments"][number]) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  isSubmitting: boolean;
}

export default function PaymentList({
  payments,
  currencySymbol,
  decimals,
  numberFormat,
  onAdd,
  onDelete,
  isSubmitting,
}: PaymentListProps) {
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState("");
  const [payKind, setPayKind] = useState<PaymentKind>("emi");
  const [payNote, setPayNote] = useState("");
  const [payReceipt, setPayReceipt] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!payDate || !Number.isFinite(amt) || amt <= 0) return;

    await onAdd({
      date: parseDateInputToISO(payDate),
      amount: amt,
      kind: payKind,
      note: payNote.trim() || undefined,
      receipt_url: payReceipt.trim() || undefined,
    });

    setPayAmount("");
    setPayNote("");
    setPayReceipt("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-300 mb-4">Log New Repayment</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">Date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">Amount</label>
            <input
              placeholder="0.00"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              {(["emi", "prepayment"] as PaymentKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPayKind(k)}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                    payKind === k ? "bg-accent text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">Note (Optional)</label>
            <input
              placeholder="Add a reference note..."
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-accent hover:bg-accent-hover text-zinc-50 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Log Payment
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 px-1">Repayment History</h3>
        {payments.length === 0 ? (
          <div className="bg-zinc-950/20 border border-zinc-800/50 rounded-2xl p-8 text-center">
            <p className="text-zinc-500 text-sm italic font-medium">No payments logged yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {payments.map((p, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl hover:border-zinc-700/80 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${p.kind === 'prepayment' ? 'bg-accent/10 text-accent' : 'bg-zinc-800 text-zinc-400'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-100">
                        {formatMoney(p.amount, currencySymbol, decimals, numberFormat)}
                      </p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                        p.kind === 'prepayment' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}>
                        {p.kind}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                      Date: {p.date.slice(0, 10)} {p.note ? `· ${p.note}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.receipt_url && (
                    <a 
                      href={p.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-all shadow-md"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => onDelete(idx)}
                    className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-zinc-50 transition-all opacity-0 group-hover:opacity-100 shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Icon placeholder for and credit card
function CreditCard({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
