"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ListTodo, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
  WidgetList,
} from "@/components/dashboard/widget-primitives";

interface TodoSummary {
  activeCount: number;
  doneCount: number;
  topActive: Array<{ _id: string; title: string }>;
}

export default function TodoWidget() {
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=todo")
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Tasks"
      icon={CheckSquare}
      loading={loading}
      href="/admin/todo"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-success/80">
              <Sparkles className="w-3 h-3" />
              {summary.doneCount} completed
            </span>
            <span className="text-zinc-500">
              {summary.activeCount + summary.doneCount} total
            </span>
          </div>
        )
      }
    >
      {summary && (
        <div className="space-y-3">
          <WidgetStat
            value={summary.activeCount}
            label={summary.activeCount === 0 ? "all clear" : "pending"}
          />
          {summary.topActive.length > 0 ? (
            <WidgetList
              items={summary.topActive.map((t) => ({
                label: t.title,
                icon: ListTodo,
              }))}
            />
          ) : (
            <WidgetHighlight
              icon={CheckSquare}
              text="No pending tasks"
              variant="success"
            />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
