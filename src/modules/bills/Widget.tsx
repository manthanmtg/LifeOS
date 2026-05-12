"use client";

import { useState, useEffect } from "react";
import { Receipt, FolderOpen, Paperclip } from "lucide-react";
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
    created_at: string;
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
  const [daysAgo, setDaysAgo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=bill")
      .then((r) => r.json())
      .then((d) => {
        const fetchedStats = d.data || null;
        setStats(fetchedStats);
        if (fetchedStats?.recentBill) {
          setDaysAgo(
            Math.floor(
              (Date.now() -
                new Date(fetchedStats.recentBill.created_at).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
        }
      })
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
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-3 h-3" /> {stats.folderCount} folders
              </span>
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" /> {stats.totalAttachments} files
              </span>
            </div>
            {daysAgo !== null ? (
              <span>
                {daysAgo === 0
                  ? "added today"
                  : daysAgo === 1
                    ? "added yesterday"
                    : `added ${daysAgo}d ago`}
              </span>
            ) : (
              <span>ready to archive</span>
            )}
          </div>
        )
      }
    >
      {stats && (
        <div className="space-y-3">
          <WidgetStat value={stats.total} label="bills archived" />
          {stats.recentBill ? (
            <WidgetHighlight
              icon={Receipt}
              text={stats.recentBill.payload.name}
              subtext={
                stats.recentBill.payload.amount !== undefined
                  ? `${stats.recentBill.payload.currency ?? ""} ${stats.recentBill.payload.amount.toLocaleString()}`
                  : undefined
              }
            />
          ) : (
            <WidgetHighlight icon={Receipt} text="No bills yet" />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
