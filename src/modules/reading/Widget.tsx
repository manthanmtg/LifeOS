"use client";

import { useMemo, useState, useEffect } from "react";
import { Files, ArrowUpCircle, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface Item {
  payload: {
    title: string;
    is_read: boolean;
    priority: string;
    type: string;
  };
}

export default function ReadingWidget() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=reading_item")
      .then((r) => r.json())
      .then((data) => setItems(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const unread = items.filter((item) => !item.payload.is_read);
    const readCount = items.filter((item) => item.payload.is_read).length;
    const highPriority = unread.filter(
      (item) => item.payload.priority === "high",
    );
    const types = new Set(items.map((item) => item.payload.type)).size;
    return { unreadCount: unread.length, readCount, highPriority, types };
  }, [items]);

  const topPriority = summary.highPriority[0];

  return (
    <WidgetCard
      title="Reading"
      icon={Files}
      loading={loading}
      href="/admin/reading"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent/60" /> {summary.readCount}{" "}
            absorbed
          </span>
          <span>{summary.types} types</span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={summary.unreadCount} label="in queue" />
        {topPriority ? (
          <WidgetHighlight
            icon={ArrowUpCircle}
            text={topPriority.payload.title}
            variant="danger"
            subtext="high priority"
          />
        ) : (
          <WidgetHighlight icon={Files} text="No priority items" />
        )}
      </div>
    </WidgetCard>
  );
}
