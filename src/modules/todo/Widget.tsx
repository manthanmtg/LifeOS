"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ListTodo, CheckCircle2, Plus, ArrowRight } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { motion, AnimatePresence } from "framer-motion";

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
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {summary.activeCount} Active
            </span>
            <span className="text-zinc-600">{summary.doneCount} Conquered</span>
          </div>
        )
      }
    >
      {summary && (
        <div className="py-2 h-full flex flex-col justify-between overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-zinc-50 italic tracking-tighter">
                {summary.activeCount}
              </span>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pb-1.5">
                Pending
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2 flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {summary.topActive.slice(0, 3).map((todo, i) => (
                <motion.div
                  key={todo._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-center gap-3 p-2 bg-zinc-900/40 border border-zinc-800/40 rounded-xl hover:border-accent/30 transition-all cursor-pointer"
                  onClick={() => (window.location.href = "/admin/todo")}
                >
                  <div className="w-1 h-4 bg-accent/20 rounded-full group-hover:bg-accent transition-colors" />
                  <span className="text-[11px] text-zinc-300 truncate font-bold tracking-tight group-hover:text-zinc-100 transition-colors">
                    {todo.title}
                  </span>
                  <ArrowRight className="w-3 h-3 text-accent ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </motion.div>
              ))}
            </AnimatePresence>

            {summary.activeCount === 0 && (
               <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }}
               className="h-full flex flex-col items-center justify-center py-4 border-2 border-dashed border-zinc-900/50 rounded-2xl"
             >
                <CheckCircle2 className="w-6 h-6 text-success/20 mb-2" />
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                  All Objectives Met
                </span>
             </motion.div>
            )}
          </div>

          <div className="mt-4">
            <button 
              onClick={() => (window.location.href = "/admin/todo")}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-zinc-950 rounded-xl hover:bg-accent-hover transition-all active:scale-95 shadow-lg shadow-accent/10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Task</span>
            </button>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
