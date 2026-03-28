"use client";

import { useState, useEffect } from "react";
import { Receipt, Paperclip, FolderOpen } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

export default function BillsWidget() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
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
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <FolderOpen className="w-3 h-3" /> {stats.folderCount} Folder
              {stats.folderCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-accent/80">
              <Paperclip className="w-3 h-3" /> {stats.totalAttachments} File
              {stats.totalAttachments !== 1 ? "s" : ""}
            </span>
          </div>
        )
      }
    >
      {stats && (
        <div className="py-2 space-y-4">
          <div>
            <p className="text-4xl font-bold text-zinc-50 tracking-tight">
              {stats.total}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium italic">
              bills stored
            </p>
          </div>

          {stats.recentBill ? (
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1.5">
                Latest
              </p>
              <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">
                {stats.recentBill.payload.name}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {new Date(
                  stats.recentBill.payload.bill_date,
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
              <p className="text-[11px] text-zinc-500 text-center font-medium">
                No bills yet.
              </p>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
