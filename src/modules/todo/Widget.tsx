"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ListTodo, CheckCircle2 } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

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
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {summary.activeCount} Active
            </span>
            <span className="text-zinc-500">{summary.doneCount} Done</span>
          </div>
        )
      }
    >
      {summary && (
        <div className="py-2 space-y-4">
          <div className="space-y-1">
            <p className="text-xl font-bold text-zinc-50 tracking-tight leading-tight">
              Master Checklist
            </p>
            <p className="text-xs text-zinc-500 font-medium">
              {summary.activeCount === 0
                ? "All objectives secured."
                : `${summary.activeCount} pending operations.`}
            </p>
          </div>

          <div className="space-y-2">
            {summary.topActive.map((todo) => (
              <div
                key={todo._id}
                className="flex items-center gap-3 px-3 py-2 bg-zinc-950/40 border border-zinc-800/60 rounded-xl group/item"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-[11px] text-zinc-300 truncate font-medium">
                  {todo.title}
                </span>
              </div>
            ))}

            {summary.activeCount === 0 && summary.doneCount > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-success/5 border border-success/10 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-success/60 shrink-0" />
                <span className="text-[11px] text-zinc-500 truncate line-through italic">
                  Zero pending items
                </span>
              </div>
            )}

            {summary.activeCount === 0 && summary.doneCount === 0 && (
              <div className="py-4 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl opacity-40">
                <ListTodo className="w-5 h-5 text-zinc-600 mb-2" />
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                  Awaiting Input
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

