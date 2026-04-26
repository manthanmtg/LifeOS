"use client";

import { useState, useEffect } from "react";
import { BookOpen, ArrowUpCircle, Sparkles, Inbox } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { cn } from "@/lib/utils";
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
    fetch("/api/widgets/summary?module_type=reading_item")
      .then((r) => r.json())
      .then((data) => setSummary(data.data || EMPTY_SUMMARY))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Reading"
      icon={BookOpen}
      loading={loading}
      href="/admin/reading"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent/60" /> {summary.readCount}{" "}
            absorbed
          </span>
          <span>{summary.typeCount} types</span>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <WidgetStat value={summary.unreadCount} label="in queue" />
          <div className="flex flex-col items-end pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              High Priority
            </span>
            <span
              className={cn(
                "text-lg font-semibold",
                summary.highPriorityCount > 0 ? "text-danger" : "text-zinc-500",
              )}
            >
              {summary.highPriorityCount}
            </span>
          </div>
        </div>
        {summary.topPriority ? (
          <WidgetHighlight
            icon={ArrowUpCircle}
            text={summary.topPriority.title}
            variant="danger"
            subtext="Up next"
          />
        ) : (
          <WidgetHighlight
            icon={Inbox}
            text={summary.unreadCount > 0 ? "No high priority" : "Queue empty"}
            variant="default"
          />
        )}
      </div>
    </WidgetCard>
  );
}
