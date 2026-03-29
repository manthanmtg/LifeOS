"use client";

import { useState, useEffect } from "react";
import { Receipt, Paperclip, FolderOpen, Plus, TrendingUp, ArrowRight } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { motion } from "framer-motion";

interface BillStats {
  total: number;
  folderCount: number;
  totalAttachments: number;
  recentBill?: {
    _id: string;
    payload: {
      name: string;
      bill_date: string;
      amount?: number;
      currency?: string;
    };
  };
}

export default function BillsWidget() {
  const [stats, setStats] = useState<BillStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=bill")
      .then((r) => r.json())
      .then((d) => setStats(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Bills"
      icon={Receipt}
      loading={loading}
      href="/admin/bills"
      footer={
        stats && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <FolderOpen className="w-3.5 h-3.5" /> {stats.folderCount} Vaults
            </span>
            <span className="flex items-center gap-1.5 text-accent/80">
              <Paperclip className="w-3.5 h-3.5" /> {stats.totalAttachments} Files
            </span>
          </div>
        )
      }
    >
      <div className="py-2 h-full flex flex-col justify-between overflow-hidden">
        {stats && (
          <>
            <div className="relative">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-zinc-50 italic tracking-tighter">
                  {stats.total}
                </span>
                <span className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] pb-1.5">
                  Records
                </span>
              </div>
              
              {/* Subtle background sparkline-like shape */}
              <div className="absolute right-0 top-0 w-24 h-12 opacity-10">
                <svg viewBox="0 0 100 40" className="w-full h-full stroke-accent fill-none stroke-[3]">
                  <path d="M0,35 Q20,35 40,20 T80,10 T100,5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {stats.recentBill ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative p-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm overflow-hidden hover:border-accent/30 transition-all cursor-pointer"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-3.5 h-3.5 text-accent" />
                  </div>
                  
                  <p className="text-[9px] uppercase font-black tracking-[0.2em] text-accent/40 mb-1.5">
                    Latest Activity
                  </p>
                  <h4 className="text-[13px] text-zinc-200 font-bold line-clamp-1 group-hover:text-accent transition-colors">
                    {stats.recentBill.payload.name}
                  </h4>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-zinc-600 font-medium">
                      {new Date(stats.recentBill.payload.bill_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {stats.recentBill.payload.amount !== undefined && (
                      <span className="text-[10px] font-black text-success-muted">
                        {stats.recentBill.payload.currency} {stats.recentBill.payload.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="p-4 rounded-2xl border-2 border-dashed border-zinc-800/30 flex items-center justify-center opacity-40">
                  <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest">
                    Empty Vault
                  </p>
                </div>
              )}

              {/* Quick Actions Bento Grid */}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button className="flex items-center justify-center gap-2 p-2 rounded-xl bg-accent/5 border border-accent/10 text-accent hover:bg-accent/10 transition-all active:scale-95">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Bill</span>
                </button>
                <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-zinc-800/30 border border-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-all">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Trends</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </WidgetCard>
  );
}
