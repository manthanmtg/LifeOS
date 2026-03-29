"use client";

import { useState, useEffect } from "react";
import { Receipt, Paperclip, FolderOpen } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

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
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <FolderOpen className="w-3 h-3" /> {stats.folderCount} folders
            </span>
            <span className="flex items-center gap-1.5 text-accent/80">
              <Paperclip className="w-3 h-3" /> {stats.totalAttachments} files
            </span>
          </div>
        )
      }
    >
      {stats && (
        <div className="space-y-3">
          <WidgetStat value={stats.total} label="records stored" />
          {stats.recentBill ? (
            <WidgetHighlight
              icon={Receipt}
              text={stats.recentBill.payload.name}
              subtext={new Date(
                stats.recentBill.payload.bill_date,
              ).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          ) : (
            <WidgetHighlight icon={Receipt} text="No bills yet" />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
