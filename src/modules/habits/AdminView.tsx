"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Settings, Target, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
  Habit,
  HabitSettings as HabitSettingsType,
  HABIT_DEFAULTS,
  getDaysArray,
  computeMetrics,
  heatmapDaysCount,
} from "./components/types";
import HabitsMetrics from "./components/HabitsMetrics";
import HabitCard from "./components/HabitCard";
import HabitForm from "./components/HabitForm";
import HabitSettingsPanel from "./components/HabitSettings";

export default function HabitsAdminView() {
  const {
    settings,
    updateSettings,
    saving: settingsSaving,
  } = useModuleSettings<HabitSettingsType>("habitSettings", HABIT_DEFAULTS);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isLoggingId, setIsLoggingId] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const r = await fetch("/api/content?module_type=habit");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to fetch habits");
      setHabits(d.data || []);
    } catch (err: unknown) {
      console.error("fetchHabits failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const days = useMemo(
    () => getDaysArray(heatmapDaysCount(settings.heatmapMonths)),
    [settings.heatmapMonths],
  );

  const metrics = useMemo(() => computeMetrics(habits), [habits]);

  // --- Handlers ---

  const handleSubmit = useCallback(
    async (payload: {
      name: string;
      description?: string;
      frequency: string;
      target_count: number;
      color: string;
    }) => {
      const fullPayload = {
        ...payload,
        completions: editingHabit?.payload.completions || [],
      };

      if (editingHabit) {
        const res = await fetch(`/api/content/${editingHabit._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: fullPayload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update habit");
      } else {
        const res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_type: "habit",
            is_public: false,
            payload: fullPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create habit");
      }
      setShowForm(false);
      setEditingHabit(null);
      await fetchHabits();
    },
    [editingHabit, fetchHabits],
  );

  const handleEdit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this habit?")) return;
      setIsDeletingId(id);
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
        await fetchHabits();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete";
        alert(message);
      } finally {
        setIsDeletingId(null);
      }
    },
    [fetchHabits],
  );

  const toggleDay = useCallback(
    async (habit: Habit, date: string) => {
      const completions = [...habit.payload.completions];
      const idx = completions.findIndex((c) => c.date === date);
      if (idx >= 0) {
        completions.splice(idx, 1);
      } else {
        completions.push({ date, count: 1 });
      }
      const payload = { ...habit.payload, completions };

      setIsLoggingId(habit._id + date);
      try {
        const res = await fetch(`/api/content/${habit._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to toggle day");
        await fetchHabits();
      } catch (err: unknown) {
        console.error("toggleDay failed:", err);
      } finally {
        setIsLoggingId(null);
      }
    },
    [fetchHabits],
  );

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingHabit(null);
  }, []);

  const handleOpenForm = useCallback(() => {
    setEditingHabit(null);
    setShowForm(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
            Habit Tracker
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Build consistency. Track streaks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Habit settings"
            title="Habit settings"
            className={cn(
              "px-3 py-2.5 rounded-xl text-sm transition-colors",
              showSettings
                ? "bg-accent/15 text-accent"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-300",
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={handleOpenForm}
            aria-label="Add new habit"
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-4 h-4" /> New Habit
          </motion.button>
        </div>
      </motion.div>

      {/* Metrics */}
      {!loading && habits.length > 0 && <HabitsMetrics metrics={metrics} />}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <HabitSettingsPanel
            settings={settings}
            onUpdateSettings={updateSettings}
            saving={settingsSaving}
          />
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <HabitForm
            editingHabit={editingHabit}
            settings={settings}
            onSubmit={handleSubmit}
            onClose={handleCloseForm}
          />
        )}
      </AnimatePresence>

      {/* Habit list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="w-8 h-8 animate-spin text-accent mb-3" />
          <span>Loading habits...</span>
        </div>
      ) : habits.length === 0 ? (
        <motion.div
          className="text-center text-zinc-500 py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">No habits yet</p>
          <p className="text-sm mt-1">Start building consistency!</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {habits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
                days={days}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleDay={toggleDay}
                isDeletingId={isDeletingId}
                isLoggingId={isLoggingId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
