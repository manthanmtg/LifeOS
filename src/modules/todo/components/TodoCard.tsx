"use client";

import { Check, Edit3, Trash2, Calendar, Flag, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoDocument, TodoPriority } from "../types";
import { motion } from "framer-motion";

interface TodoCardProps {
  todo: TodoDocument;
  onToggle: (todo: TodoDocument) => void;
  onEdit: (todo: TodoDocument) => void;
  onDelete: (id: string) => void;
  viewMode?: "grid" | "list";
}

export default function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
  viewMode = "list",
}: TodoCardProps) {
  const { title, notes, due_date, priority, completed, completed_at } = todo.payload;

  const priorityColors: Record<TodoPriority, { text: string; bg: string; border: string }> = {
    high: { text: "text-danger", bg: "bg-danger/10", border: "border-danger/20" },
    medium: { text: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
    low: { text: "text-success", bg: "bg-success/10", border: "border-success/20" },
  };

  const colors = priorityColors[priority || "medium"];

  if (viewMode === "grid") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "group relative flex flex-col p-5 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl transition-all hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5",
          completed && "opacity-60"
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <button
            onClick={() => onToggle(todo)}
            className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
              completed
                ? "bg-accent border-accent text-zinc-950"
                : "border-zinc-700 hover:border-accent group-hover:bg-accent/5"
            )}
          >
            {completed && <Check className="w-4 h-4 stroke-[3]" />}
          </button>
          
          <div className="flex items-center gap-1.5">
            <button onClick={() => onEdit(todo)} className="p-2 rounded-xl text-zinc-500 hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-all">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(todo._id)} className="p-2 rounded-xl text-zinc-500 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className={cn(
          "text-sm font-black italic tracking-tight line-clamp-2 transition-all",
          completed ? "text-zinc-500 line-through" : "text-zinc-100 group-hover:text-accent"
        )}>
          {title}
        </h3>

        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border", colors.text, colors.bg, colors.border)}>
            {priority}
          </span>
          {due_date && (
            <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800/40 px-2 py-1 rounded-lg">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative flex items-center gap-4 p-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl transition-all hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5",
        completed && "opacity-60"
      )}
    >
      <button
        onClick={() => onToggle(todo)}
        className={cn(
          "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
          completed
            ? "bg-accent border-accent text-zinc-950 shadow-md shadow-accent/20"
            : "border-zinc-700 hover:border-accent group-hover:bg-accent/5"
        )}
      >
        {completed && <Check className="w-4 h-4 stroke-[3]" />}
      </button>

      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "text-[13px] font-bold tracking-tight truncate transition-all",
          completed ? "text-zinc-500 line-through" : "text-zinc-100 group-hover:text-accent"
        )}>
          {title}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn("text-[9px] font-black uppercase tracking-widest", colors.text)}>
            {priority}
          </span>
          {due_date && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
              <Calendar className="w-3 h-3" />
              {new Date(due_date).toLocaleDateString()}
            </span>
          )}
          {completed_at && (
             <span className="flex items-center gap-1.5 text-[9px] font-bold text-success/60 uppercase tracking-wider italic">
              <Clock className="w-3 h-3" />
              {new Date(completed_at).toLocaleDateString()}
           </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(todo)} className="p-2 rounded-xl text-zinc-600 hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-all">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(todo._id)} className="p-2 rounded-xl text-zinc-600 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
