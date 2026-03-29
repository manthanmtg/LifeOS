"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit, COLORS, HabitSettings } from "./types";

interface HabitFormProps {
  editingHabit: Habit | null;
  settings: HabitSettings;
  onSubmit: (payload: {
    name: string;
    description?: string;
    frequency: string;
    target_count: number;
    color: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function HabitForm({
  editingHabit,
  settings,
  onSubmit,
  onClose,
}: HabitFormProps) {
  const [name, setName] = useState(editingHabit?.payload.name || "");
  const [description, setDescription] = useState(
    editingHabit?.payload.description || "",
  );
  const [frequency, setFrequency] = useState(
    editingHabit?.payload.frequency || settings.defaultFrequency,
  );
  const [targetCount, setTargetCount] = useState(
    (editingHabit?.payload.target_count || settings.defaultTarget).toString(),
  );
  const [color, setColor] = useState(editingHabit?.payload.color || COLORS[0]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) {
      setFormError("Name required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        frequency,
        target_count: parseInt(targetCount) || 1,
        color,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            {editingHabit ? "Edit" : "New"} Habit
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label
              htmlFor="habit-name"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Name
            </label>
            <input
              id="habit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise, Read, Meditate..."
              autoFocus
              disabled={isSubmitting}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs text-zinc-500 mb-1.5">
                Target
              </label>
              <input
                type="number"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                min="1"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="habit-description"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Description
            </label>
            <input
              id="habit-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional..."
              disabled={isSubmitting}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <motion.button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-zinc-900 scale-110"
                      : "hover:scale-105",
                  )}
                  style={{
                    backgroundColor: c,
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3">
            {formError && (
              <span className="text-danger text-xs self-center">
                {formError}
              </span>
            )}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              aria-label={editingHabit ? "Update habit" : "Create habit"}
              className="bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              {isSubmitting
                ? editingHabit
                  ? "Updating..."
                  : "Creating..."
                : editingHabit
                  ? "Update"
                  : "Create"}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
