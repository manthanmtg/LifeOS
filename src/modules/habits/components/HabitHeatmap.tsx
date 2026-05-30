"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HabitHeatmapProps {
  completions: Map<string, number>;
  targetCount: number;
  color: string;
  days: string[];
  todayStr: string;
  weekStartMon: boolean;
  onToggleDay: (date: string) => void;
  isLoggingDay: string | null;
}

type HeatmapDay = string | null;

export function buildHeatmapWeeks(
  days: string[],
  weekStartMon: boolean,
): HeatmapDay[][] {
  if (days.length === 0) return [];

  const firstDay = new Date(`${days[0]}T00:00:00`).getDay();
  const leadingBlanks = weekStartMon ? (firstDay + 6) % 7 : firstDay;
  const alignedDays: HeatmapDay[] = [
    ...Array.from<null>({ length: leadingBlanks }).fill(null),
    ...days,
  ];

  const trailingBlanks = (7 - (alignedDays.length % 7)) % 7;
  alignedDays.push(...Array.from<null>({ length: trailingBlanks }).fill(null));

  const result: HeatmapDay[][] = [];
  for (let i = 0; i < alignedDays.length; i += 7) {
    result.push(alignedDays.slice(i, i + 7));
  }

  return result;
}

export default function HabitHeatmap({
  completions,
  targetCount,
  color,
  days,
  todayStr,
  weekStartMon,
  onToggleDay,
  isLoggingDay,
}: HabitHeatmapProps) {
  // Group days into weeks (columns of 7)
  const weeks = useMemo(
    () => buildHeatmapWeeks(days, weekStartMon),
    [days, weekStartMon],
  );

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = "";
    for (let w = 0; w < weeks.length; w++) {
      const firstDay = weeks[w].find(Boolean);
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

  const dayLabels = weekStartMon
    ? ["", "Mon", "", "Wed", "", "Fri", ""]
    : ["Sun", "", "Tue", "", "Thu", "", "Sat"];

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="min-w-max pb-1">
        {/* Month labels */}
        <div className="h-4 relative mb-1 ml-8">
          {monthLabels.map((m) => (
            <span
              key={`${m.label}-${m.col}`}
              className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter absolute whitespace-nowrap"
              style={{
                left: `${m.col * 15}px`,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] mr-2 pt-0.5">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-3 flex items-center justify-end">
                <span className="text-[8px] text-zinc-600 w-6 text-right font-medium">
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
                  const count = completions.get(date) || 0;
                  const ratio = targetCount > 0 ? Math.min(count / targetCount, 1) : 0;
                  const isCompleted = count > 0;
                  const isFullyCompleted = ratio >= 1;
                  const isToday = date === todayStr;
                  const isLogging = isLoggingDay === date;

                  let tileOpacity = undefined;
                  if (isCompleted) {
                    tileOpacity = Math.max(0.3, ratio * 0.9);
                  }

                  return (
                    <motion.button
                      key={dayIdx}
                      onClick={() => onToggleDay(date)}
                      disabled={isLogging}
                      title={`${date}${isFullyCompleted ? " ✓" : isCompleted ? ` (${count}/${targetCount})` : ""}`}
                      aria-label={`${date}${isFullyCompleted ? ", Completed" : isCompleted ? `, Partially completed ${count} of ${targetCount}` : ", Not completed"}${isToday ? ", Today" : ""}`}
                      className={cn(
                        "w-3 h-3 rounded-[2px] transition-all disabled:opacity-50",
                        isToday && "ring-1 ring-zinc-500 ring-offset-1 ring-offset-zinc-950",
                        isCompleted && "shadow-[0_0_8px_currentColor] hover:opacity-100",
                      )}
                      style={{
                        backgroundColor: isCompleted ? color : "var(--zinc-800)",
                        color: isCompleted ? color : "transparent",
                        opacity: tileOpacity,
                      }}
                      whileHover={{ scale: 1.4, zIndex: 10 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
