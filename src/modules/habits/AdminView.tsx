"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, RefreshCw, Settings, Target } from "lucide-react";
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
  getDateStr,
} from "./components/types";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isLoggingId, setIsLoggingId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const fetchHabits = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setLoadError(null);

    try {
      const r = await fetch("/api/content?module_type=habit");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to fetch habits");
      setHabits(d.data || []);
    } catch (err: unknown) {
      console.error("fetchHabits failed:", err);
      setLoadError("Couldn't load your habits. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHabits(true);
  }, [fetchHabits]);

  const days = useMemo(
    () => getDaysArray(heatmapDaysCount(settings.heatmapMonths), today),
    [settings.heatmapMonths, today],
  );

  const todayStr = useMemo(() => getDateStr(today), [today]);

  const metrics = useMemo(() => computeMetrics(habits, today), [habits, today]);

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
      const target = habit.payload.target_count || 1;

      if (idx >= 0) {
        if (completions[idx].count < target) {
          completions[idx].count += 1;
        } else {
          completions.splice(idx, 1);
        }
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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0"
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
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-4 h-4" /> New Habit
          </motion.button>
        </div>
      </motion.div>

      {loadError ? (
        <div
          role="alert"
          aria-labelledby="habits-load-error-message"
          className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span id="habits-load-error-message">{loadError}</span>
          <button
            type="button"
            onClick={() => void fetchHabits(true)}
            aria-label="Retry loading habits"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold transition-colors hover:bg-danger/10"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

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
      {loading && habits.length === 0 ? (
        <AdminModuleSkeleton />
      ) : loadError && habits.length === 0 ? null : habits.length === 0 ? (
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
                todayStr={todayStr}
                weekStartMon={settings.weekStartMon}
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
