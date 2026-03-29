"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  RotateCw,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { ExpenseSettings, CURR_SYM, formatNumber } from "../components/types";

interface RecurringTabProps {
  settings: ExpenseSettings;
}

interface RecurringExpense {
  _id: string;
  payload: {
    name: string;
    cost: number;
    billing_cycle: string;
    next_renewal_date: string;
    category: string;
    is_active: boolean;
    url?: string;
  };
}

export default function RecurringTab({ settings }: RecurringTabProps) {
  const [subs, setSubs] = useState<RecurringExpense[]>([]);
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch("/api/content?module_type=recurring_expense");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setSubs(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  return (
    <div className="space-y-8">
      {/* Overview Benchmarks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mb-1">
            Monthly Burn
          </p>
          <h3 className="text-3xl font-black text-zinc-50 tracking-tighter">
            {sym}
            {formatNumber(
              subs.reduce(
                (acc, s) =>
                  acc +
                  (s.payload.billing_cycle === "monthly"
                    ? s.payload.cost
                    : s.payload.cost / 12),
                0,
              ),
              settings.numberFormat,
            )}
          </h3>
          <p className="text-[10px] text-zinc-600 font-bold mt-2 italic">
            Excluding one-off transactions
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mb-1">
            Active Subscriptions
          </p>
          <h3 className="text-3xl font-black text-zinc-50 tracking-tighter">
            {subs.filter((s) => s.payload.is_active).length}
          </h3>
          <p className="text-[10px] text-success font-black mt-2 uppercase tracking-tighter">
            System fully operational
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex items-center justify-center border-dashed border-zinc-700 hover:border-accent/50 transition-all group cursor-pointer">
          <button className="flex items-center gap-3 text-zinc-500 group-hover:text-accent font-black text-sm uppercase tracking-widest">
            <Plus className="w-5 h-5" /> New Recurring
          </button>
        </div>
      </div>

      {/* Subscription Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {subs.map((sub, idx) => (
          <motion.div
            key={sub._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between group relative overflow-hidden hover:border-zinc-600 transition-all shadow-2xl"
          >
            <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <RotateCw className="w-24 h-24 text-zinc-50" />
            </div>

            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-black text-zinc-50 text-lg tracking-tight">
                    {sub.payload.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded-full font-black text-zinc-500 border border-zinc-700/50 uppercase tracking-widest">
                      {sub.payload.category}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest italic">
                      {sub.payload.billing_cycle}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-zinc-50 tracking-tighter">
                  {sym}
                  {formatNumber(sub.payload.cost, settings.numberFormat)}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-zinc-500 mt-1">
                  <Clock className="w-3 h-3" />{" "}
                  {new Date(sub.payload.next_renewal_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-50 hover:bg-zinc-750 transition-all">
                  Settings
                </button>
                {sub.payload.url && (
                  <a
                    href={sub.payload.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-zinc-800 rounded-xl text-zinc-500 hover:text-accent transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-50 hover:bg-accent hover:border-accent transition-all group/btn">
                Renew Manual{" "}
                <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
