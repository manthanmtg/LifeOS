"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { HabitSettings as HabitSettingsType } from "./types";

interface HabitSettingsProps {
  settings: HabitSettingsType;
  onUpdateSettings: (updates: Partial<HabitSettingsType>) => void;
  saving: boolean;
}

export default function HabitSettingsPanel({
  settings,
  onUpdateSettings,
  saving,
}: HabitSettingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">Habit Settings</h2>
          {saving && (
            <span className="text-xs text-accent flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              Default Frequency
            </label>
            <select
              value={settings.defaultFrequency}
              onChange={(e) =>
                onUpdateSettings({ defaultFrequency: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="habit-default-target"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Default Target Count
            </label>
            <input
              id="habit-default-target"
              type="number"
              min={1}
              value={settings.defaultTarget}
              onChange={(e) =>
                onUpdateSettings({
                  defaultTarget: parseInt(e.target.value) || 1,
                })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              Heatmap Range
            </label>
            <select
              value={settings.heatmapMonths}
              onChange={(e) =>
                onUpdateSettings({ heatmapMonths: parseInt(e.target.value) })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer pb-1">
              <input
                type="checkbox"
                checked={settings.weekStartMon}
                onChange={(e) =>
                  onUpdateSettings({ weekStartMon: e.target.checked })
                }
                className="w-4 h-4 rounded border-zinc-700 accent-accent"
              />
              Week starts on Monday
            </label>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
