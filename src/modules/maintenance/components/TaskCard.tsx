"use client";

import { memo } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit3,
  History,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MaintenanceTask } from "../types";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CURR_SYM,
  PRIORITY_DOT,
  STATUS_STYLES,
} from "../constants";
import {
  daysUntilDue,
  dueProgressPercent,
  formatDate,
  formatFrequency,
} from "../helpers";

interface TaskCardProps {
  task: MaintenanceTask;
  now: Date;
  onEdit: (task: MaintenanceTask) => void;
  onMarkComplete: (task: MaintenanceTask) => void;
  onDelete: (id: string) => void;
  onShowHistory: (task: MaintenanceTask) => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  now,
  onEdit,
  onMarkComplete,
  onDelete,
  onShowHistory,
}: TaskCardProps) {
  const p = task.payload;
  const CatIcon = CATEGORY_ICONS[p.category];
  const days = daysUntilDue(p.next_due, now);
  const progress = dueProgressPercent(p.last_completed, p.next_due, now);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 group hover:border-zinc-700 transition-all shadow-sm hover:shadow-md"
    >
      {/* Top row: name + priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
              CATEGORY_COLORS[p.category],
            )}
          >
            <CatIcon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-100 truncate leading-none mb-1">
              {p.name}
            </h3>
            {p.description && (
              <p className="text-xs text-zinc-500 line-clamp-1 leading-relaxed">
                {p.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full shadow-sm",
              PRIORITY_DOT[p.priority],
            )}
            title={`${p.priority} priority`}
          />
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border",
            CATEGORY_COLORS[p.category],
          )}
        >
          <CatIcon className="w-3 h-3" />
          {p.category}
        </span>
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border",
            STATUS_STYLES[p.status],
          )}
        >
          {p.status}
        </span>
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md border",
            p.service_type === "managed"
              ? "bg-accent/15 text-accent border-accent/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-700",
          )}
        >
          {p.service_type || "self"}
        </span>
        {p.is_recurring && p.frequency_months && (
          <span className="px-2 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-800/50 rounded-md border border-zinc-800">
            {formatFrequency(p.frequency_months)}
          </span>
        )}
      </div>

      {/* Overdue banner with Log Completion */}
      {p.status === "overdue" && (
        <button
          onClick={() => onMarkComplete(task)}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-danger/20 bg-danger/10 text-danger text-xs font-bold hover:bg-danger/15 transition-all active:scale-[0.98]"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">
            {days !== null ? `${Math.abs(days)}d overdue` : "Overdue"} — Log now
          </span>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </button>
      )}

      {/* Dates & Cost */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between text-zinc-500">
          <span>Last completed</span>
          <span className="text-zinc-300 font-medium">
            {formatDate(p.last_completed)}
          </span>
        </div>
        {p.status !== "overdue" && (
          <div className="flex items-center justify-between text-zinc-500">
            <span>Next due</span>
            <span
              className={cn(
                "font-bold",
                days !== null && days <= 30 ? "text-warning" : "text-zinc-200",
              )}
            >
              {formatDate(p.next_due)}
              {days !== null && (
                <span className="ml-1 text-xs font-normal opacity-70">
                  ({days === 0 ? "today" : `in ${days}d`})
                </span>
              )}
            </span>
          </div>
        )}
        {p.service_type === "managed" &&
          p.estimated_cost !== undefined &&
          p.estimated_cost > 0 && (
            <div className="flex items-center justify-between text-zinc-500">
              <span>Est. cost</span>
              <span className="text-zinc-300 font-medium">
                {CURR_SYM[p.currency] || p.currency}{" "}
                {p.estimated_cost.toLocaleString("en-IN")}
              </span>
            </div>
          )}
      </div>

      {/* Progress bar */}
      {p.is_recurring &&
        p.last_completed &&
        p.next_due &&
        p.status !== "overdue" && (
          <div className="space-y-1 mt-0.5">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  progress >= 100
                    ? "bg-danger"
                    : progress >= 75
                      ? "bg-warning"
                      : "bg-success",
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tighter text-zinc-600">
              <span>Progress</span>
              <span>{Math.round(progress)}% of cycle</span>
            </div>
          </div>
        )}

      {/* Tags */}
      {p.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {p.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-800/30 rounded border border-zinc-800/50"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/50 mt-auto">
        {p.status !== "completed" && p.status !== "overdue" && (
          <button
            onClick={() => onMarkComplete(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" /> Log
          </button>
        )}
        {p.history.length > 0 && (
          <button
            onClick={() => onShowHistory(task)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 transition-all"
            title="View History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="tabular-nums">{p.history.length}</span>
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onEdit(task)}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Edit"
          aria-label="Edit task"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task._id)}
          className="p-2 rounded-lg text-zinc-500 hover:text-danger hover:bg-danger/10 transition-colors"
          title="Delete"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
});
