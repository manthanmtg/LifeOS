"use client";

import { useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { parseDateInputToISO } from "../lib/emi-utils";
import { EmiLoan } from "../types";

interface RateAdjustmentListProps {
  adjustments: EmiLoan["payload"]["rate_adjustments"];
  onAdd: (adj: EmiLoan["payload"]["rate_adjustments"][number]) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  isSubmitting: boolean;
}

export default function RateAdjustmentList({
  adjustments,
  onAdd,
  onDelete,
  isSubmitting,
}: RateAdjustmentListProps) {
  const [adjDate, setAdjDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [adjRate, setAdjRate] = useState("");
  const [adjNote, setAdjNote] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(adjRate);
    if (!adjDate || !Number.isFinite(rate) || rate < 0) return;

    await onAdd({
      effective_date: parseDateInputToISO(adjDate),
      annual_interest_rate: rate,
      note: adjNote.trim() || undefined,
    });

    setAdjRate("");
    setAdjNote("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 shadow-inner">
        <h3 className="text-sm font-bold text-zinc-300 mb-4">
          Log Rate Change (Floating)
        </h3>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Effective Date
            </label>
            <input
              type="date"
              value={adjDate}
              onChange={(e) => setAdjDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              New Rate (% p.a.)
            </label>
            <input
              placeholder="0.00"
              value={adjRate}
              onChange={(e) => setAdjRate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-mono shadow-inner"
            />
          </div>
          <div className="">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Note
            </label>
            <input
              placeholder="e.g. RBI Repo Rate Update"
              value={adjNote}
              onChange={(e) => setAdjNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting || !adjRate}
              className="w-full bg-accent hover:bg-accent-hover text-zinc-50 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Log Change
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {adjustments.length === 0 ? (
          <div className="bg-zinc-950/20 border border-zinc-800/50 rounded-2xl p-8 text-center shadow-lg">
            <p className="text-zinc-500 text-sm italic font-medium">
              No rate adjustments logged yet.
            </p>
          </div>
        ) : (
          adjustments.map((adj, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl hover:border-zinc-700/80 transition-all group shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-400 group-hover:text-accent transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-zinc-100">
                      {adj.annual_interest_rate}%
                    </p>
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-mono">
                      p.a.
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                    Effective: {adj.effective_date.slice(0, 10)}{" "}
                    {adj.note ? `· ${adj.note}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDelete(idx)}
                className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-zinc-50 transition-all opacity-0 group-hover:opacity-100 shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
