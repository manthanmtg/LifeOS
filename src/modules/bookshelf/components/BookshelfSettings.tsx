"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { STATUSES, STATUS_LABELS, type BookshelfSettings } from "./types";

interface BookshelfSettingsProps {
  settings: BookshelfSettings;
  onUpdateSettings: (updates: Partial<BookshelfSettings>) => void;
  saving: boolean;
}

export default function BookshelfSettingsPanel({
  settings,
  onUpdateSettings,
  saving,
}: BookshelfSettingsProps) {
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
          <h2 className="text-lg font-semibold text-zinc-50">
            Bookshelf Settings
          </h2>
          {saving && (
            <span className="text-xs text-accent flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="settings-default-status"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Default Book Status
            </label>
            <select
              id="settings-default-status"
              value={settings.defaultStatus}
              onChange={(e) =>
                onUpdateSettings({
                  defaultStatus: e.target.value as (typeof STATUSES)[number],
                })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="settings-yearly-goal"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Yearly Reading Goal
            </label>
            <input
              id="settings-yearly-goal"
              type="number"
              min={0}
              value={settings.yearlyGoal || ""}
              onChange={(e) =>
                onUpdateSettings({
                  yearlyGoal: Number.parseInt(e.target.value, 10) || 0,
                })
              }
              placeholder="0 = no goal"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Track completed books against your annual target.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
