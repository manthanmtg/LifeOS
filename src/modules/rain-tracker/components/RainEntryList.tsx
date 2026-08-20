"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, CloudRain, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RainEntry, RainEntryListItem, RainUnit } from "../types";
import { getRainIntensity } from "../utils";

interface RainEntryListProps {
  entries: RainEntryListItem[];
  displayUnit: RainUnit;
  onEditEntry: (entry: RainEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export function RainEntryList({
  entries,
  displayUnit,
  onEditEntry,
  onDeleteEntry,
}: RainEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <CloudRain className="h-8 w-8 text-zinc-700" />
        </div>
        <p className="text-sm text-zinc-500">
          No entries match the current view.
        </p>
        <p className="text-xs text-zinc-600">
          Log a new reading or clear the filters to broaden the list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-2">
      <AnimatePresence initial={false}>
        {entries.map((item, index) => {
          const intensity = getRainIntensity(
            item.entry.payload.rainfall_amount,
          );
          const IntensityIcon = intensity.icon;

          return (
            <motion.div
              key={item.entry._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className="group flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 transition-all hover:border-zinc-700/60 hover:bg-zinc-900/70"
            >
              <div className="hidden min-w-[54px] flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 sm:flex">
                <span className="text-xs font-medium leading-none text-zinc-500">
                  {item.monthLabel}
                </span>
                <span className="text-sm font-bold leading-tight text-zinc-200">
                  {item.dayLabel}
                </span>
              </div>

              <div
                className={cn(
                  "shrink-0 rounded-lg border p-1.5",
                  intensity.bgColor,
                )}
              >
                <IntensityIcon className={cn("h-3.5 w-3.5", intensity.color)} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-base font-bold tabular-nums text-zinc-100">
                    {item.displayAmount}
                  </span>
                  <span className="text-xs font-medium text-zinc-500">
                    {displayUnit}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                      intensity.bgColor,
                      intensity.color,
                    )}
                  >
                    {intensity.label}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {item.dateLabel} at {item.timeLabel}
                  </span>
                  <span>{item.sourceLabel}</span>
                  {item.entry.payload.notes ? (
                    <span className="truncate">{item.entry.payload.notes}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => onEditEntry(item.entry)}
                  className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-accent sm:p-1.5"
                  aria-label={`Edit ${item.dateLabel} entry`}
                >
                  <Edit3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(item.entry._id)}
                  className="rounded-lg p-2 text-zinc-500 transition-colors hover:text-danger sm:p-1.5"
                  aria-label={`Delete ${item.dateLabel} entry`}
                >
                  <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
