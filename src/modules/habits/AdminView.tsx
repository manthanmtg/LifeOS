"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Edit3, X, Target, Flame, Settings, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

interface Habit {
    _id: string;
    payload: {
        name: string; description?: string; frequency: string;
        target_count: number; color: string;
        completions: { date: string; count: number }[];
    };
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

function getDateStr(d: Date): string {
    return d.toISOString().split("T")[0];
}

function getDaysArray(count: number): string[] {
    const arr: string[] = [];
    const today = new Date();
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        arr.push(getDateStr(d));
    }
    return arr;
}

function getStreak(completions: { date: string; count: number }[]): { current: number; longest: number } {
    const dateSet = new Set(completions.filter((c) => c.count > 0).map((c) => c.date));
    const today = new Date();
    let current = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (dateSet.has(getDateStr(d))) current++;
        else break;
    }
    let longest = 0, streak = 0;
    const sorted = [...dateSet].sort();
    for (let i = 0; i < sorted.length; i++) {
        if (i === 0) { streak = 1; } else {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            const diff = (curr.getTime() - prev.getTime()) / 86400000;
            streak = diff === 1 ? streak + 1 : 1;
        }
        longest = Math.max(longest, streak);
    }
    return { current, longest };
}

const HABIT_DEFAULTS = { defaultFrequency: "daily", defaultTarget: 1, weekStartMon: true, heatmapMonths: 6 };

export default function HabitsAdminView() {
    const { settings, updateSettings, saving: settingsSaving } = useModuleSettings("habitSettings", HABIT_DEFAULTS);
    const [showSettings, setShowSettings] = useState(false);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [frequency, setFrequency] = useState(settings.defaultFrequency);
    const [targetCount, setTargetCount] = useState(settings.defaultTarget.toString());
    const [color, setColor] = useState(COLORS[0]);
    const [formError, setFormError] = useState("");

    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    useEffect(() => { fetchHabits(); }, [fetchHabits]);

    const days = useMemo(() => getDaysArray(182), []); // ~6 months

    const resetForm = () => {
        setName(""); setDescription(""); setFrequency(settings.defaultFrequency); setTargetCount(settings.defaultTarget.toString()); setColor(COLORS[0]);
        setEditingId(null); setFormError(""); setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (!name.trim()) { setFormError("Name required"); return; }

        const payload = {
            name,
            description: description || undefined,
            frequency,
            target_count: parseInt(targetCount) || 1,
            color,
            completions: [] as { date: string; count: number }[]
        };

        setIsSubmitting(true);
        try {
            if (editingId) {
                const existing = habits.find((h) => h._id === editingId);
                payload.completions = existing?.payload.completions || [];
                const res = await fetch(`/api/content/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update habit");
            } else {
                const res = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_type: "habit", is_public: false, payload }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to create habit");
            }
            resetForm();
            await fetchHabits();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (h: Habit) => {
        setName(h.payload.name); setDescription(h.payload.description || "");
        setFrequency(h.payload.frequency); setTargetCount(h.payload.target_count.toString()); setColor(h.payload.color);
        setEditingId(h._id); setShowForm(true);
    };

    const handleDelete = async (id: string) => {
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
    };

    const toggleDay = async (habit: Habit, date: string) => {
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
            const res = await fetch(`/api/content/${habit._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to toggle day");
            await fetchHabits();
        } catch (err: unknown) {
            console.error("toggleDay failed:", err);
        } finally {
            setIsLoggingId(null);
        }
    };

    const todayStr = getDateStr(new Date());

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Habit Tracker</h1>
                    <p className="text-zinc-400 mt-1">Build consistency. Track streaks.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowSettings(!showSettings)}
                        aria-label="Habit settings"
                        title="Habit settings"
                        className={cn("px-3 py-2.5 rounded-xl text-sm transition-colors", showSettings ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300")}>
                        <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => { resetForm(); setShowForm(true); }}
                        aria-label="Add new habit"
                        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors">
                        <Plus className="w-4 h-4" /> New Habit
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">Habit Settings</h2>
                        {settingsSaving && <span className="text-xs text-accent flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Default Frequency</label>
                            <select value={settings.defaultFrequency} onChange={(e) => updateSettings({ defaultFrequency: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                <option value="daily">Daily</option><option value="weekly">Weekly</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="habit-default-target" className="block text-xs text-zinc-500 mb-1.5">Default Target Count</label>
                            <input id="habit-default-target" type="number" min={1} value={settings.defaultTarget}
                                onChange={(e) => updateSettings({ defaultTarget: parseInt(e.target.value) || 1 })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Heatmap Range</label>
                            <select value={settings.heatmapMonths} onChange={(e) => updateSettings({ heatmapMonths: parseInt(e.target.value) })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                <option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer pb-1">
                                <input type="checkbox" checked={settings.weekStartMon}
                                    onChange={(e) => updateSettings({ weekStartMon: e.target.checked })}
                                    className="w-4 h-4 rounded border-zinc-700 accent-accent" />
                                Week starts on Monday
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "New"} Habit</h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="habit-name" className="block text-xs text-zinc-500 mb-1.5">Name</label>
                            <input id="habit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise, Read, Meditate..." autoFocus
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-zinc-500 mb-1.5">Frequency</label>
                                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs text-zinc-500 mb-1.5">Target</label>
                                <input type="number" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} min="1"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="habit-description" className="block text-xs text-zinc-500 mb-1.5">Description</label>
                            <input id="habit-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..."
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Color</label>
                            <div className="flex items-center gap-2">
                                {COLORS.map((c) => (
                                    <button key={c} type="button" onClick={() => setColor(c)}
                                        className={cn("w-7 h-7 rounded-full transition-all", color === c ? "ring-2 ring-offset-2 ring-offset-zinc-900 scale-110" : "")}
                                        style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                            {formError && <span className="text-danger text-xs self-center">{formError}</span>}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                aria-label={editingId ? "Update habit" : "Create habit"}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                {isSubmitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update" : "Create")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Habits with heatmaps */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <RefreshCw className="w-8 h-8 animate-spin text-accent mb-3" />
                    <span>Loading habits...</span>
                </div>
            ) : habits.length === 0 ? (
                <div className="text-center text-zinc-500 py-12"><Target className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No habits yet — start building consistency!</p></div>
            ) : (
                <div className="space-y-4">
                    {habits.map((habit) => {
                        const completionDates = new Set(habit.payload.completions.filter((c) => c.count > 0).map((c) => c.date));
                        const { current, longest } = getStreak(habit.payload.completions);
                        const completedToday = completionDates.has(todayStr);

                        return (
                            <div key={habit._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.payload.color }} />
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-50">{habit.payload.name}</p>
                                            {habit.payload.description && <p className="text-xs text-zinc-500">{habit.payload.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1 text-orange-400"><Flame className="w-3.5 h-3.5" />{current}d</span>
                                            <span className="text-zinc-500">Best: {longest}d</span>
                                        </div>
                                        {/* Log today button */}
                                        <button
                                            onClick={() => toggleDay(habit, todayStr)}
                                            disabled={isLoggingId === habit._id + todayStr}
                                            aria-label={completedToday ? "Mark habit as not done today" : "Mark habit as done today"}
                                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50",
                                                completedToday ? "bg-success/15 text-success" : "bg-zinc-800 text-zinc-500 hover:text-zinc-50"
                                            )}>
                                            {isLoggingId === habit._id + todayStr ? <RefreshCw className="w-3 h-3 animate-spin" /> : (completedToday ? "✓ Done today" : "Log today")}
                                        </button>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(habit)}
                                                disabled={isDeletingId === habit._id}
                                                aria-label="Edit habit"
                                                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(habit._id)}
                                                disabled={isDeletingId === habit._id}
                                                aria-label="Delete habit"
                                                className="p-1 text-zinc-500 hover:text-danger disabled:opacity-50"
                                            >
                                                {isDeletingId === habit._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Heatmap grid — 26 weeks × 7 days */}
                                <div className="overflow-x-auto">
                                    <div className="flex gap-[3px] min-w-[650px]">
                                        {Array.from({ length: 26 }, (_, weekIdx) => (
                                            <div key={weekIdx} className="flex flex-col gap-[3px]">
                                                {Array.from({ length: 7 }, (_, dayIdx) => {
                                                    const idx = weekIdx * 7 + dayIdx;
                                                    if (idx >= days.length) return <div key={dayIdx} className="w-3 h-3" />;
                                                    const date = days[idx];
                                                    const isCompleted = completionDates.has(date);
                                                    const isToday = date === todayStr;
                                                    return (
                                                        <button key={dayIdx} onClick={() => toggleDay(habit, date)} title={`${date}${isCompleted ? " ✓" : ""}`}
                                                            className={cn("w-3 h-3 rounded-[2px] transition-all hover:scale-125",
                                                                isToday && "ring-1 ring-zinc-500"
                                                            )}
                                                            style={{ backgroundColor: isCompleted ? habit.payload.color : "rgb(39 39 42)" }} />
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
