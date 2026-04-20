"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RainChartType, RainUnit } from "../types";
import { CHART_OPTIONS, UNIT_OPTIONS } from "../utils";

interface RainTrackerPreferencesProps {
  displayUnit: RainUnit;
  chartType: RainChartType;
  open: boolean;
  onClose: () => void;
  onDisplayUnitChange: (unit: RainUnit) => void;
  onChartTypeChange: (type: RainChartType) => void;
}

export function RainTrackerPreferences({
  displayUnit,
  chartType,
  open,
  onClose,
  onDisplayUnitChange,
  onChartTypeChange,
}: RainTrackerPreferencesProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Preferences
              </h4>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-600 transition-colors hover:text-zinc-400"
                aria-label="Close preferences"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400">
                  Display unit
                </label>
                <div className="flex w-fit rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                  {UNIT_OPTIONS.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => onDisplayUnitChange(unit)}
                      className={cn(
                        "rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                        displayUnit === unit
                          ? "bg-zinc-800 text-accent shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600">
                  Entries stay stored in millimeters. This only changes how
                  values are shown.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400">
                  Chart type
                </label>
                <div className="flex w-fit rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                  {CHART_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChartTypeChange(option)}
                      className={cn(
                        "rounded-lg px-4 py-1.5 text-xs font-bold capitalize tracking-wider transition-all",
                        chartType === option
                          ? "bg-zinc-800 text-accent shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
