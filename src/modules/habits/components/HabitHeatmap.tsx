"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HabitHeatmapProps {
  completions: Set<string>;
  color: string;
  days: string[];
  todayStr: string;
  onToggleDay: (date: string) => void;
  isLoggingDay: string | null;
}

export default function HabitHeatmap({
  completions,
  color,
  days,
  todayStr,
  onToggleDay,
  isLoggingDay,
}: HabitHeatmapProps) {
  // Group days into weeks (columns of 7)
  const weeks = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = "";
    for (let w = 0; w < weeks.length; w++) {
      const firstDay = weeks[w][0];
      if (!firstDay) continue;
      const month = new Date(firstDay + "T00:00:00").toLocaleString("en-US", {
        month: "short",
      });
      if (month !== lastMonth) {
        labels.push({ label: month, col: w });
        lastMonth = month;
      }
    }
    return labels;
  }, [weeks]);

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Month labels */}
        <div className="flex ml-8 mb-1">
          {monthLabels.map((m) => (
            <span
              key={`${m.label}-${m.col}`}
              className="text-[9px] text-zinc-600 font-medium"
              style={{
                position: "relative",
                left: `${m.col * 15}px`,
                marginRight: "-10px",
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] mr-1.5 pt-0.5">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-3 flex items-center justify-end">
                <span className="text-[8px] text-zinc-600 w-6 text-right">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {week.map((date, dayIdx) => {
                  if (!date) return <div key={dayIdx} className="w-3 h-3" />;
                  const isCompleted = completions.has(date);
                  const isToday = date === todayStr;
                  const isLogging = isLoggingDay === date;

                  return (
                    <motion.button
                      key={dayIdx}
                      onClick={() => onToggleDay(date)}
                      disabled={isLogging}
                      title={`${date}${isCompleted ? " ✓" : ""}`}
                      className={cn(
                        "w-3 h-3 rounded-[2px] transition-colors disabled:opacity-50",
                        isToday && "ring-1 ring-zinc-500",
                      )}
                      style={{
                        backgroundColor: isCompleted ? color : "rgb(39 39 42)",
                      }}
                      whileHover={{ scale: 1.4 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  );
                })}
                {/* Pad incomplete weeks */}
                {week.length < 7 &&
                  Array.from({ length: 7 - week.length }, (_, i) => (
                    <div key={`pad-${i}`} className="w-3 h-3" />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
