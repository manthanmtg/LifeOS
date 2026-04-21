"use client";

import { useMemo, useState, useEffect } from "react";
import { BookOpen, ArrowUpCircle, Sparkles, Inbox } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { cn } from "@/lib/utils";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { ReadingItem } from "./types";

export default function ReadingWidget() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=reading_item")
      .then((r) => r.json())
      .then((data) => setItems(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const unread = items.filter((item) => !item.payload.is_read);
    const readCount = items.filter((item) => item.payload.is_read).length;
    const highPriority = unread.filter(
      (item) => item.payload.priority === "high",
    );
    const types = new Set(items.map((item) => item.payload.type)).size;
    return { unreadCount: unread.length, readCount, highPriority, types };
  }, [items]);

  const topPriority = stats.highPriority[0];

  return (
    <WidgetCard
      title="Reading"
      icon={BookOpen}
      loading={loading}
      href="/admin/reading"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent/60" /> {stats.readCount}{" "}
            absorbed
          </span>
          <span>{stats.types} types</span>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <WidgetStat value={stats.unreadCount} label="in queue" />
          <div className="flex flex-col items-end pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              High Priority
            </span>
            <span
              className={cn(
                "text-lg font-semibold",
                stats.highPriority.length > 0 ? "text-danger" : "text-zinc-500",
              )}
            >
              {stats.highPriority.length}
            </span>
          </div>
        </div>
        {topPriority ? (
          <WidgetHighlight
            icon={ArrowUpCircle}
            text={topPriority.payload.title}
            variant="danger"
            subtext="Up next"
          />
        ) : (
          <WidgetHighlight
            icon={Inbox}
            text={stats.unreadCount > 0 ? "No high priority" : "Queue empty"}
            variant="default"
          />
        )}
      </div>
    </WidgetCard>
  );
}
