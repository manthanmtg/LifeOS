"use client";

import { useState, useEffect } from "react";
import { Receipt, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
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
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=bill")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Request failed: ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (!d?.data) {
          throw new Error("Invalid widget response");
        }
        const fetchedStats = d.data || null;
        setStats(fetchedStats);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Bills"
      icon={Receipt}
      loading={loading}
      href="/admin/bills"
    >
      {(stats || error) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-3"
        >
          <WidgetStat
            value={stats?.total ?? 0}
            label="bills archived"
          />
          {error ? (
            <WidgetHighlight
              icon={AlertTriangle}
              text="Couldn’t refresh bills summary"
              subtext="Please retry dashboard load"
              variant="danger"
            />
          ) : stats?.recentBill ? (
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
              subtext={`${stats?.folderCount ?? 0} folders, ${stats?.totalAttachments ?? 0} files`}
            />
          )}
        </motion.div>
      )}

      {!stats && !error && (
        <div className="hidden" aria-hidden="true" />
      )}
    </WidgetCard>
  );
}
