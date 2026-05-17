"use client";

import { useState, useEffect } from "react";
import { Receipt } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=bill")
      .then((r) => r.json())
      .then((d) => {
        const fetchedStats = d.data || null;
        setStats(fetchedStats);
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
    >
      {stats && (
        <div className="space-y-3">
          <WidgetStat value={stats.total} label="bills archived" />
          {stats.recentBill ? (
            <WidgetHighlight
              icon={Receipt}
              text={stats.recentBill.payload.name || "Latest bill"}
              subtext={
                `Folders: ${stats.folderCount} · Files: ${stats.totalAttachments}`
              }
            />
          ) : (
            <WidgetHighlight
              icon={Receipt}
              text="No bills yet"
              subtext={`${stats.folderCount} folders, ${stats.totalAttachments} files`}
            />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
