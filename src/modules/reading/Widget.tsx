"use client";

import { useState, useEffect } from "react";
import { BookOpen, ArrowUpCircle, Sparkles, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface ReadingSummary {
  unreadCount: number;
  readCount: number;
  highPriorityCount: number;
  typeCount: number;
  topPriority: { title: string } | null;
}

const EMPTY_SUMMARY: ReadingSummary = {
  unreadCount: 0,
  readCount: 0,
  highPriorityCount: 0,
  typeCount: 0,
  topPriority: null,
};

export default function ReadingWidget() {
  const [summary, setSummary] = useState<ReadingSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=reading_item", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setSummary(data.data || EMPTY_SUMMARY))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <WidgetCard
      title="Reading"
      icon={BookOpen}
      loading={loading}
      href="/admin/reading"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5 text-success/80">
            <Sparkles className="w-3 h-3" /> {summary.readCount} absorbed
          </span>
          <span>{summary.typeCount} types</span>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="space-y-3"
      >
        <WidgetStat value={summary.unreadCount} label="in queue" />

        {summary.topPriority ? (
          <WidgetHighlight
            icon={ArrowUpCircle}
            text={summary.topPriority.title}
            variant="danger"
            subtext={`${summary.highPriorityCount} high priority ${
              summary.highPriorityCount === 1 ? "item" : "items"
            }`}
          />
        ) : (
          <WidgetHighlight
            icon={Inbox}
            text={summary.unreadCount > 0 ? "No high priority" : "Queue empty"}
            variant="default"
          />
        )}
      </motion.div>
    </WidgetCard>
  );
}
