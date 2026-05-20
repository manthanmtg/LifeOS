"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Habit,
  getCompletionRateForDays,
  getDateStr,
  getStreak,
  getDaysArray,
} from "./components/types";

function getLast30Days(today: Date): string[] {
  return getDaysArray(30, today);
}

export default function HabitsPublicView({ items }: { items: Habit[] }) {
  const habits = items;
  const [todayDate] = useState(() => new Date());
  const today = useMemo(() => getDateStr(todayDate), [todayDate]);
  const days = useMemo(() => getLast30Days(todayDate), [todayDate]);

  if (habits.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-20">
        <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No habits tracked yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map((habit, i) => {
        const completionSet = new Set(
          habit.payload.completions
            .filter((c) => c.count > 0)
            .map((c) => c.date),
        );
        const streakInfo = getStreak(habit.payload.completions, today);
        const rate30 = getCompletionRateForDays(
          habit.payload.completions,
          days,
        );
        const completedToday = completionSet.has(today);

        return (
          <motion.div
            key={habit._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors relative overflow-hidden group"
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
              style={{ backgroundColor: habit.payload.color }}
            />
            <div className="flex items-center justify-between mb-3 ml-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: habit.payload.color }}
                />
                <div>
                  <p className="text-sm font-semibold text-zinc-50">
                    {habit.payload.name}
                  </p>
                  {habit.payload.description && (
                    <p className="text-xs text-zinc-500">
                      {habit.payload.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {completedToday && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                    Done today
                  </span>
                )}
                {streakInfo.current > 0 && (
                  <div className="flex items-center gap-1 text-warning">
                    <Flame className="w-4 h-4" />
                    <span className="text-sm font-bold">
                      {streakInfo.current}d
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="ml-2">
              <div className="flex gap-[3px] flex-wrap mb-3">
                {days.map((day) => (
                  <div
                    key={day}
                    title={day}
                    className={cn(
                      "w-3 h-3 rounded-sm transition-colors",
                      completionSet.has(day)
                        ? "opacity-100"
                        : "bg-zinc-800 opacity-50",
                    )}
                    style={
                      completionSet.has(day)
                        ? { backgroundColor: habit.payload.color }
                        : undefined
                    }
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="capitalize">{habit.payload.frequency}</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {rate30}/30 days
                </span>
                {streakInfo.longest > 0 && (
                  <span>Best: {streakInfo.longest}d</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
