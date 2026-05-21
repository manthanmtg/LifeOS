"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Edit3, Trash2, Flame, Trophy, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit, getCompletionRateForDays, getStreak } from "./types";
import HabitHeatmap from "./HabitHeatmap";

interface HabitCardProps {
  habit: Habit;
  days: string[];
  todayStr: string;
  weekStartMon: boolean;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onToggleDay: (habit: Habit, date: string) => void;
  isDeletingId: string | null;
  isLoggingId: string | null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function HabitCard({
  habit,
  days,
  todayStr,
  weekStartMon,
  onEdit,
  onDelete,
  onToggleDay,
  isDeletingId,
  isLoggingId,
}: HabitCardProps) {
  const completionDates = useMemo(
    () =>
      new Set(
        habit.payload.completions.filter((c) => c.count > 0).map((c) => c.date),
      ),
    [habit.payload.completions],
  );

  const streakInfo = useMemo(
    () => getStreak(habit.payload.completions, todayStr),
    [habit.payload.completions, todayStr],
  );

  const completedToday = completionDates.has(todayStr);

  const last30Rate = useMemo(
    () => getCompletionRateForDays(habit.payload.completions, days.slice(-30)),
    [days, habit.payload.completions],
  );

  const loggingKey = isLoggingId === habit._id + todayStr ? todayStr : null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -4 }}
      className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden group relative transition-all hover:border-zinc-700/50 hover:shadow-2xl hover:shadow-black/60"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: habit.payload.color }}
      />
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor] opacity-80"
            style={{
              backgroundColor: habit.payload.color,
              color: habit.payload.color,
            }}
            whileHover={{ scale: 1.3 }}
          />
          <div className="min-w-0">
            <p
              className="text-sm font-black tracking-tight text-zinc-100 transition-colors group-hover:text-zinc-50"
              style={
                { "--hover-color": habit.payload.color } as React.CSSProperties
              }
            >
              <span className="group-hover:text-[var(--hover-color)] transition-colors">
                {habit.payload.name}
              </span>
            </p>
            {habit.payload.description && (
              <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5 uppercase tracking-widest">
                {habit.payload.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 sm:items-center shrink-0 flex-wrap justify-end">
          {/* Streak badges */}
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1 text-warning/80 group-hover:text-warning transition-colors">
              <Flame className="w-3.5 h-3.5 fill-warning/10" />
              <span>{streakInfo.current}d</span>
            </span>
            <span className="flex items-center gap-1 text-zinc-600 group-hover:text-zinc-500 transition-colors">
              <Trophy className="w-3 h-3" />
              <span>{streakInfo.longest}d</span>
            </span>
          </div>

          {/* 30-day rate pill */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase",
              last30Rate >= 70
                ? "bg-success/10 text-success border border-success/20"
                : last30Rate >= 40
                  ? "bg-warning/10 text-warning border border-warning/20"
                  : "bg-danger/10 text-danger border border-danger/20",
            )}
          >
            {last30Rate}%
          </span>

          {/* Log today button */}
          <motion.button
            onClick={() => onToggleDay(habit, todayStr)}
            disabled={isLoggingId === habit._id + todayStr}
            aria-label={
              completedToday
                ? "Mark habit as not done today"
                : "Mark habit as done today"
            }
            className={cn(
              "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm",
              completedToday
                ? "bg-success/20 text-success border border-success/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700/50",
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoggingId === habit._id + todayStr ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : completedToday ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : null}
            {completedToday ? "Done" : "Log"}
          </motion.button>

          {/* Edit/Delete */}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
            <button
              onClick={() => onEdit(habit)}
              disabled={isDeletingId === habit._id}
              aria-label="Edit habit"
              className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(habit._id)}
              disabled={isDeletingId === habit._id}
              aria-label="Delete habit"
              className="p-1.5 text-zinc-600 hover:text-danger rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isDeletingId === habit._id ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="px-5 pb-4">
        <HabitHeatmap
          completions={completionDates}
          color={habit.payload.color}
          days={days}
          todayStr={todayStr}
          weekStartMon={weekStartMon}
          onToggleDay={(date) => onToggleDay(habit, date)}
          isLoggingDay={loggingKey}
        />
      </div>
    </motion.div>
  );
}
