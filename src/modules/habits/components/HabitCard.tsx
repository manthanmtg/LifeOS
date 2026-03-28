"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Edit3, Trash2, Flame, Trophy, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit, getDateStr, getStreak } from "./types";
import HabitHeatmap from "./HabitHeatmap";

interface HabitCardProps {
  habit: Habit;
  days: string[];
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
  onEdit,
  onDelete,
  onToggleDay,
  isDeletingId,
  isLoggingId,
}: HabitCardProps) {
  const todayStr = useMemo(() => getDateStr(new Date()), []);

  const completionDates = useMemo(
    () =>
      new Set(
        habit.payload.completions.filter((c) => c.count > 0).map((c) => c.date),
      ),
    [habit.payload.completions],
  );

  const streakInfo = useMemo(
    () => getStreak(habit.payload.completions),
    [habit.payload.completions],
  );

  const completedToday = completionDates.has(todayStr);

  // Completion rate (last 30 days)
  const last30Rate = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (completionDates.has(getDateStr(d))) count++;
    }
    return Math.round((count / 30) * 100);
  }, [completionDates]);

  const loggingKey = isLoggingId === habit._id + todayStr ? todayStr : null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: habit.payload.color }}
            whileHover={{ scale: 1.3 }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-50 truncate">
              {habit.payload.name}
            </p>
            {habit.payload.description && (
              <p className="text-[11px] text-zinc-500 truncate">
                {habit.payload.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Streak badges */}
          <div className="flex items-center gap-2.5 text-xs">
            <span className="flex items-center gap-1 text-warning">
              <Flame className="w-3.5 h-3.5" />
              <span className="font-bold">{streakInfo.current}d</span>
            </span>
            <span className="flex items-center gap-1 text-zinc-500">
              <Trophy className="w-3 h-3" />
              <span className="font-medium">{streakInfo.longest}d</span>
            </span>
          </div>

          {/* 30-day rate pill */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide",
              last30Rate >= 70
                ? "bg-success/10 text-success"
                : last30Rate >= 40
                  ? "bg-warning/10 text-warning"
                  : "bg-danger/10 text-danger",
            )}
          >
            {last30Rate}% / 30d
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
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50",
              completedToday
                ? "bg-success/15 text-success border border-success/20"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 border border-zinc-700",
            )}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isLoggingId === habit._id + todayStr ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : completedToday ? (
              <Check className="w-3 h-3" />
            ) : null}
            {completedToday ? "Done" : "Log today"}
          </motion.button>

          {/* Edit/Delete */}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(habit)}
              disabled={isDeletingId === habit._id}
              aria-label="Edit habit"
              className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(habit._id)}
              disabled={isDeletingId === habit._id}
              aria-label="Delete habit"
              className="p-1.5 text-zinc-500 hover:text-danger rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
          onToggleDay={(date) => onToggleDay(habit, date)}
          isLoggingDay={loggingKey}
        />
      </div>
    </motion.div>
  );
}
