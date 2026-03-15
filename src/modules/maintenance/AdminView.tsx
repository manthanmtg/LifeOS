"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus, Trash2, Edit3, X, Check, Search, Filter,
    Wrench, Home, Car, Cpu, Droplets, Zap, Wind, Leaf,
    Sparkles, Shield, CreditCard, HelpCircle, Clock,
    AlertTriangle, CheckCircle2, Calendar,
    ChevronDown, History, Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
    "home", "appliance", "vehicle", "electronics", "plumbing",
    "electrical", "hvac", "garden", "cleaning", "insurance", "subscription", "other",
] as const;
type Category = (typeof CATEGORIES)[number];

const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITIES)[number];

type Status = "upcoming" | "overdue" | "completed" | "skipped";

interface HistoryEntry {
    id: string;
    completed_at: string;
    cost?: number;
    notes?: string;
    vendor?: string;
}

interface MaintenancePayload {
    name: string;
    description?: string;
    category: Category;
    frequency_months?: number;
    last_completed?: string;
    next_due?: string;
    estimated_cost?: number;
    currency: string;
    priority: Priority;
    status: Status;
    is_recurring: boolean;
    reminder_enabled: boolean;
    history: HistoryEntry[];
    tags: string[];
    notes?: string;
}

interface MaintenanceTask {
    _id: string;
    payload: MaintenancePayload;
    created_at: string;
    updated_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
    home: Home,
    appliance: Cog,
    vehicle: Car,
    electronics: Cpu,
    plumbing: Droplets,
    electrical: Zap,
    hvac: Wind,
    garden: Leaf,
    cleaning: Sparkles,
    insurance: Shield,
    subscription: CreditCard,
    other: HelpCircle,
};

const CATEGORY_COLORS: Record<Category, string> = {
    home: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    appliance: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    vehicle: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    electronics: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    plumbing: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    electrical: "bg-warning/15 text-warning border-warning/20",
    hvac: "bg-teal-500/15 text-teal-400 border-teal-500/20",
    garden: "bg-success/15 text-success border-success/20",
    cleaning: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    insurance: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    subscription: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const STATUS_STYLES: Record<Status, string> = {
    overdue: "bg-danger/15 text-danger border-danger/20",
    upcoming: "bg-success/15 text-success border-success/20",
    completed: "bg-success/15 text-success border-success/20",
    skipped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const PRIORITY_DOT: Record<Priority, string> = {
    high: "bg-danger",
    medium: "bg-warning",
    low: "bg-success",
};

const CURR_SYM: Record<string, string> = {
    USD: "$", EUR: "\u20ac", GBP: "\u00a3", INR: "\u20b9", JPY: "\u00a5",
    AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "\u00a5", BRL: "R$",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFrequency(months?: number): string {
    if (!months) return "One-time";
    if (months === 1) return "Every month";
    if (months === 2) return "Every 2 months";
    if (months === 3) return "Every quarter";
    if (months === 6) return "Every 6 months";
    if (months === 12) return "Every year";
    if (months === 24) return "Every 2 years";
    return `Every ${months} months`;
}

function formatDate(iso?: string): string {
    if (!iso) return "--";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function computeStatus(task: MaintenancePayload): Status {
    if (task.status === "completed" || task.status === "skipped") return task.status;
    if (!task.next_due) return "upcoming";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(task.next_due);
    due.setHours(0, 0, 0, 0);
    if (due < now) return "overdue";
    return "upcoming";
}

function daysUntilDue(next_due?: string): number | null {
    if (!next_due) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(next_due);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dueProgressPercent(last_completed?: string, next_due?: string): number {
    if (!last_completed || !next_due) return 0;
    const start = new Date(last_completed).getTime();
    const end = new Date(next_due).getTime();
    const now = Date.now();
    if (end <= start) return 100;
    const pct = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, pct));
}

function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
}

function todayISO(): string {
    return new Date().toISOString();
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Default form state ─────────────────────────────────────────────────────

const EMPTY_FORM: MaintenancePayload = {
    name: "",
    description: "",
    category: "home",
    frequency_months: undefined,
    last_completed: undefined,
    next_due: undefined,
    estimated_cost: undefined,
    currency: "INR",
    priority: "medium",
    status: "upcoming",
    is_recurring: true,
    reminder_enabled: true,
    history: [],
    tags: [],
    notes: "",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function MaintenanceAdminView() {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modals
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<MaintenancePayload>({ ...EMPTY_FORM });
    const [tagInput, setTagInput] = useState("");

    // Mark Complete modal
    const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);
    const [completionCost, setCompletionCost] = useState("");
    const [completionVendor, setCompletionVendor] = useState("");
    const [completionNotes, setCompletionNotes] = useState("");

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // History view
    const [historyTask, setHistoryTask] = useState<MaintenanceTask | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
    const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
    const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
    const [showFilters, setShowFilters] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────

    const fetchTasks = useCallback(async () => {
        try {
            const r = await fetch("/api/content?module_type=maintenance_task");
            const d = await r.json();
            setTasks(d.data || []);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // ── Smart status on load ──────────────────────────────────────────────

    const enrichedTasks = useMemo(() => {
        return tasks.map((t) => ({
            ...t,
            payload: { ...t.payload, status: computeStatus(t.payload) },
        }));
    }, [tasks]);

    // ── Stats ─────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const now = new Date();
        const thirtyDays = new Date(now);
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let overdue = 0;
        let dueSoon = 0;
        let completedThisMonth = 0;

        for (const t of enrichedTasks) {
            const p = t.payload;
            if (p.status === "overdue") overdue++;
            else if (p.status === "upcoming" && p.next_due) {
                const due = new Date(p.next_due);
                if (due <= thirtyDays) dueSoon++;
            }
            // count completed from history this month
            for (const h of p.history) {
                if (new Date(h.completed_at) >= monthStart) {
                    completedThisMonth++;
                }
            }
        }

        return { total: enrichedTasks.length, overdue, dueSoon, completedThisMonth };
    }, [enrichedTasks]);

    // ── Filtered list ─────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = enrichedTasks;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (t) =>
                    t.payload.name.toLowerCase().includes(q) ||
                    t.payload.description?.toLowerCase().includes(q) ||
                    t.payload.tags.some((tg) => tg.toLowerCase().includes(q))
            );
        }
        if (filterCategory !== "all") list = list.filter((t) => t.payload.category === filterCategory);
        if (filterPriority !== "all") list = list.filter((t) => t.payload.priority === filterPriority);
        if (filterStatus !== "all") list = list.filter((t) => t.payload.status === filterStatus);

        // Sort: overdue first, then by next_due ascending
        list = [...list].sort((a, b) => {
            const statusOrder: Record<Status, number> = { overdue: 0, upcoming: 1, completed: 2, skipped: 3 };
            const diff = statusOrder[a.payload.status] - statusOrder[b.payload.status];
            if (diff !== 0) return diff;
            if (a.payload.next_due && b.payload.next_due) return new Date(a.payload.next_due).getTime() - new Date(b.payload.next_due).getTime();
            if (a.payload.next_due) return -1;
            if (b.payload.next_due) return 1;
            return 0;
        });

        return list;
    }, [enrichedTasks, search, filterCategory, filterPriority, filterStatus]);

    // ── CRUD ──────────────────────────────────────────────────────────────

    const openNew = () => {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setTagInput("");
        setShowForm(true);
    };

    const openEdit = (task: MaintenanceTask) => {
        setForm({ ...task.payload });
        setEditingId(task._id);
        setTagInput(task.payload.tags.join(", "));
        setShowForm(true);
    };

    const saveTask = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const tags = tagInput
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            const payload = { ...form, tags };

            if (editingId) {
                await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                });
            } else {
                await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "maintenance_task", is_public: false, payload }),
                });
            }
            setShowForm(false);
            await fetchTasks();
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    };

    const deleteTask = async (id: string) => {
        try {
            await fetch(`/api/content/${id}`, { method: "DELETE" });
            await fetchTasks();
        } catch {
            // silently fail
        }
        setDeletingId(null);
    };

    // ── Mark Complete ─────────────────────────────────────────────────────

    const openMarkComplete = (task: MaintenanceTask) => {
        setCompletingTask(task);
        setCompletionCost(task.payload.estimated_cost?.toString() || "");
        setCompletionVendor("");
        setCompletionNotes("");
    };

    const confirmMarkComplete = async () => {
        if (!completingTask) return;
        setSaving(true);
        try {
            const now = todayISO();
            const entry: HistoryEntry = {
                id: crypto.randomUUID(),
                completed_at: now,
                cost: completionCost ? parseFloat(completionCost) : undefined,
                vendor: completionVendor || undefined,
                notes: completionNotes || undefined,
            };
            const newHistory = [...completingTask.payload.history, entry];
            const nextDue =
                completingTask.payload.is_recurring && completingTask.payload.frequency_months
                    ? addMonths(now, completingTask.payload.frequency_months)
                    : completingTask.payload.next_due;

            await fetch(`/api/content/${completingTask._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payload: {
                        ...completingTask.payload,
                        last_completed: now,
                        next_due: nextDue,
                        status: "upcoming",
                        history: newHistory,
                    },
                }),
            });
            setCompletingTask(null);
            await fetchTasks();
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    };

    // ── Render Helpers ────────────────────────────────────────────────────

    const activeFilterCount = [filterCategory !== "all", filterPriority !== "all", filterStatus !== "all"].filter(Boolean).length;

    // ── Main Render ───────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-1">Maintenance Log</h1>
                    <p className="text-zinc-500 text-sm">Track recurring maintenance for home, vehicles, appliances, and more.</p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-50 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors shrink-0"
                >
                    <Plus className="w-4 h-4" /> Add Task
                </button>
            </header>

            {/* ── Stat Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Tasks" value={stats.total} icon={Wrench} color="text-zinc-400" bgColor="bg-zinc-500/10" />
                <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} color="text-danger" bgColor="bg-danger/10" highlight={stats.overdue > 0} />
                <StatCard label="Due Soon" value={stats.dueSoon} icon={Clock} color="text-warning" bgColor="bg-warning/10" />
                <StatCard label="Completed" value={stats.completedThisMonth} icon={CheckCircle2} color="text-success" bgColor="bg-success/10" sublabel="this month" />
            </div>

            {/* ── Search & Filters ───────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors shrink-0",
                        showFilters || activeFilterCount > 0
                            ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-accent/20 text-accent rounded-full font-bold">{activeFilterCount}</span>
                    )}
                </button>
            </div>

            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                            <FilterSelect
                                label="Category"
                                value={filterCategory}
                                onChange={(v) => setFilterCategory(v as Category | "all")}
                                options={[{ value: "all", label: "All Categories" }, ...CATEGORIES.map((c) => ({ value: c, label: capitalize(c) }))]}
                            />
                            <FilterSelect
                                label="Priority"
                                value={filterPriority}
                                onChange={(v) => setFilterPriority(v as Priority | "all")}
                                options={[
                                    { value: "all", label: "All Priorities" },
                                    { value: "high", label: "High" },
                                    { value: "medium", label: "Medium" },
                                    { value: "low", label: "Low" },
                                ]}
                            />
                            <FilterSelect
                                label="Status"
                                value={filterStatus}
                                onChange={(v) => setFilterStatus(v as Status | "all")}
                                options={[
                                    { value: "all", label: "All Statuses" },
                                    { value: "overdue", label: "Overdue" },
                                    { value: "upcoming", label: "Upcoming" },
                                    { value: "completed", label: "Completed" },
                                    { value: "skipped", label: "Skipped" },
                                ]}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Task Grid ──────────────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <EmptyState hasAnyTasks={tasks.length > 0} onAdd={openNew} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((task) => {
                        const p = task.payload;
                        const CatIcon = CATEGORY_ICONS[p.category];
                        const days = daysUntilDue(p.next_due);
                        const progress = dueProgressPercent(p.last_completed, p.next_due);

                        return (
                            <motion.div
                                key={task._id}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 group hover:border-zinc-700 transition-all"
                            >
                                {/* Top row: name + priority */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", CATEGORY_COLORS[p.category])}>
                                            <CatIcon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-zinc-100 truncate">{p.name}</h3>
                                            {p.description && (
                                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{p.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn("w-2 h-2 rounded-full", PRIORITY_DOT[p.priority])} title={`${p.priority} priority`} />
                                    </div>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-1.5">
                                    <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border", CATEGORY_COLORS[p.category])}>
                                        {p.category}
                                    </span>
                                    <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border", STATUS_STYLES[p.status])}>
                                        {p.status}
                                    </span>
                                    {p.is_recurring && p.frequency_months && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-800/50 rounded-md border border-zinc-800">
                                            {formatFrequency(p.frequency_months)}
                                        </span>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between text-zinc-500">
                                        <span>Last completed</span>
                                        <span className="text-zinc-300 font-medium">{formatDate(p.last_completed)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-zinc-500">
                                        <span>Next due</span>
                                        <span className={cn(
                                            "font-medium",
                                            p.status === "overdue" ? "text-danger" : days !== null && days <= 30 ? "text-warning" : "text-zinc-300"
                                        )}>
                                            {formatDate(p.next_due)}
                                            {days !== null && (
                                                <span className="ml-1 text-[10px] opacity-70">
                                                    ({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    {p.estimated_cost !== undefined && p.estimated_cost > 0 && (
                                        <div className="flex items-center justify-between text-zinc-500">
                                            <span>Est. cost</span>
                                            <span className="text-zinc-300 font-medium">
                                                {CURR_SYM[p.currency] || p.currency} {p.estimated_cost.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {p.is_recurring && p.last_completed && p.next_due && (
                                    <div className="space-y-1">
                                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    progress >= 100 ? "bg-danger" : progress >= 75 ? "bg-warning" : "bg-success"
                                                )}
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 text-right">{Math.round(progress)}% of cycle elapsed</p>
                                    </div>
                                )}

                                {/* Tags */}
                                {p.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {p.tags.map((tag) => (
                                            <span key={tag} className="px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-800/50 rounded border border-zinc-800">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                                    {p.status !== "completed" && (
                                        <button
                                            onClick={() => openMarkComplete(task)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors"
                                        >
                                            <Check className="w-3.5 h-3.5" /> Complete
                                        </button>
                                    )}
                                    {p.history.length > 0 && (
                                        <button
                                            onClick={() => setHistoryTask(task)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 transition-colors"
                                        >
                                            <History className="w-3.5 h-3.5" /> {p.history.length}
                                        </button>
                                    )}
                                    <div className="flex-1" />
                                    <button
                                        onClick={() => openEdit(task)}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setDeletingId(task._id)}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-danger hover:bg-danger/10 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Add / Edit Modal ───────────────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <ModalOverlay onClose={() => setShowForm(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-5 flex items-center justify-between z-10">
                                <h2 className="text-lg font-bold text-zinc-50">{editingId ? "Edit Task" : "New Maintenance Task"}</h2>
                                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-5">
                                {/* Name */}
                                <FormField label="Task Name *">
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g., Replace AC filter"
                                        className="form-input"
                                    />
                                </FormField>

                                {/* Description */}
                                <FormField label="Description">
                                    <textarea
                                        value={form.description || ""}
                                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                        placeholder="Additional details..."
                                        rows={2}
                                        className="form-input resize-none"
                                    />
                                </FormField>

                                {/* Category + Priority */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Category">
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                                            className="form-input"
                                        >
                                            {CATEGORIES.map((c) => (
                                                <option key={c} value={c}>{capitalize(c)}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Priority">
                                        <select
                                            value={form.priority}
                                            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                                            className="form-input"
                                        >
                                            {PRIORITIES.map((p) => (
                                                <option key={p} value={p}>{capitalize(p)}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>

                                {/* Recurring toggle + Frequency */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Recurring">
                                        <div className="flex items-center gap-3 h-[42px]">
                                            <button
                                                onClick={() => setForm((f) => ({ ...f, is_recurring: !f.is_recurring }))}
                                                className={cn(
                                                    "w-10 h-6 rounded-full transition-colors relative",
                                                    form.is_recurring ? "bg-success" : "bg-zinc-700"
                                                )}
                                            >
                                                <span className={cn(
                                                    "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all",
                                                    form.is_recurring ? "left-[18px]" : "left-0.5"
                                                )} />
                                            </button>
                                            <span className="text-xs text-zinc-400">{form.is_recurring ? "Yes" : "No"}</span>
                                        </div>
                                    </FormField>
                                    {form.is_recurring && (
                                        <FormField label="Frequency (months)">
                                            <input
                                                type="number"
                                                min={1}
                                                value={form.frequency_months ?? ""}
                                                onChange={(e) => setForm((f) => ({ ...f, frequency_months: e.target.value ? parseInt(e.target.value) : undefined }))}
                                                placeholder="6"
                                                className="form-input"
                                            />
                                        </FormField>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Last Completed">
                                        <input
                                            type="date"
                                            value={form.last_completed ? form.last_completed.split("T")[0] : ""}
                                            onChange={(e) => setForm((f) => ({ ...f, last_completed: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                            className="form-input"
                                        />
                                    </FormField>
                                    <FormField label="Next Due">
                                        <input
                                            type="date"
                                            value={form.next_due ? form.next_due.split("T")[0] : ""}
                                            onChange={(e) => setForm((f) => ({ ...f, next_due: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                            className="form-input"
                                        />
                                    </FormField>
                                </div>

                                {/* Cost + Currency */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Estimated Cost">
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.estimated_cost ?? ""}
                                            onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                            placeholder="0"
                                            className="form-input"
                                        />
                                    </FormField>
                                    <FormField label="Currency">
                                        <select
                                            value={form.currency}
                                            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                                            className="form-input"
                                        >
                                            {Object.keys(CURR_SYM).map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>

                                {/* Reminder toggle */}
                                <FormField label="Reminders">
                                    <div className="flex items-center gap-3 h-[42px]">
                                        <button
                                            onClick={() => setForm((f) => ({ ...f, reminder_enabled: !f.reminder_enabled }))}
                                            className={cn(
                                                "w-10 h-6 rounded-full transition-colors relative",
                                                form.reminder_enabled ? "bg-success" : "bg-zinc-700"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all",
                                                form.reminder_enabled ? "left-[18px]" : "left-0.5"
                                            )} />
                                        </button>
                                        <span className="text-xs text-zinc-400">{form.reminder_enabled ? "Enabled" : "Disabled"}</span>
                                    </div>
                                </FormField>

                                {/* Tags */}
                                <FormField label="Tags (comma separated)">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        placeholder="filter, seasonal, annual"
                                        className="form-input"
                                    />
                                    {tagInput && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {tagInput.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 text-[10px] font-medium text-zinc-300 bg-zinc-800 rounded-md border border-zinc-700">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </FormField>

                                {/* Notes */}
                                <FormField label="Notes">
                                    <textarea
                                        value={form.notes || ""}
                                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                        placeholder="Any additional notes..."
                                        rows={3}
                                        className="form-input resize-none"
                                    />
                                </FormField>

                                {/* Completion History (edit view) */}
                                {editingId && form.history.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Completion History</h3>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {[...form.history].reverse().map((h) => (
                                                <div key={h.id} className="flex items-start gap-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs">
                                                    <div className="w-2 h-2 mt-1 rounded-full bg-success shrink-0" />
                                                    <div className="flex-1 min-w-0 space-y-0.5">
                                                        <p className="text-zinc-300 font-medium">{formatDate(h.completed_at)}</p>
                                                        {h.vendor && <p className="text-zinc-500">Vendor: {h.vendor}</p>}
                                                        {h.cost !== undefined && <p className="text-zinc-500">Cost: {CURR_SYM[form.currency] || form.currency} {h.cost.toLocaleString("en-IN")}</p>}
                                                        {h.notes && <p className="text-zinc-600 italic">{h.notes}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-5 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveTask}
                                    disabled={saving || !form.name.trim()}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-50 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors disabled:opacity-40"
                                >
                                    {saving ? "Saving..." : editingId ? "Update Task" : "Create Task"}
                                </button>
                            </div>
                        </motion.div>
                    </ModalOverlay>
                )}
            </AnimatePresence>

            {/* ── Mark Complete Modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {completingTask && (
                    <ModalOverlay onClose={() => setCompletingTask(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl"
                        >
                            <div className="p-5 border-b border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-50">Mark as Complete</h2>
                                <p className="text-sm text-zinc-500 mt-1">{completingTask.payload.name}</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <FormField label="Cost">
                                    <input
                                        type="number"
                                        min={0}
                                        value={completionCost}
                                        onChange={(e) => setCompletionCost(e.target.value)}
                                        placeholder="Actual cost incurred"
                                        className="form-input"
                                    />
                                </FormField>
                                <FormField label="Vendor / Service Provider">
                                    <input
                                        type="text"
                                        value={completionVendor}
                                        onChange={(e) => setCompletionVendor(e.target.value)}
                                        placeholder="Who did the work?"
                                        className="form-input"
                                    />
                                </FormField>
                                <FormField label="Notes">
                                    <textarea
                                        value={completionNotes}
                                        onChange={(e) => setCompletionNotes(e.target.value)}
                                        placeholder="Any remarks..."
                                        rows={2}
                                        className="form-input resize-none"
                                    />
                                </FormField>
                                {completingTask.payload.is_recurring && completingTask.payload.frequency_months && (
                                    <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs text-zinc-500">
                                        <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-zinc-400" />
                                        Next due will be set to{" "}
                                        <span className="text-zinc-300 font-medium">
                                            {formatDate(addMonths(todayISO(), completingTask.payload.frequency_months))}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 border-t border-zinc-800 flex justify-end gap-3">
                                <button
                                    onClick={() => setCompletingTask(null)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmMarkComplete}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-success-muted text-white font-medium text-sm hover:bg-success transition-colors disabled:opacity-40"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> {saving ? "Saving..." : "Confirm"}
                                </button>
                            </div>
                        </motion.div>
                    </ModalOverlay>
                )}
            </AnimatePresence>

            {/* ── History Modal ───────────────────────────────────────────── */}
            <AnimatePresence>
                {historyTask && (
                    <ModalOverlay onClose={() => setHistoryTask(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="sticky top-0 bg-zinc-900 p-5 border-b border-zinc-800 flex items-center justify-between z-10">
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-50">Completion History</h2>
                                    <p className="text-sm text-zinc-500 mt-0.5">{historyTask.payload.name}</p>
                                </div>
                                <button onClick={() => setHistoryTask(null)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5">
                                {historyTask.payload.history.length === 0 ? (
                                    <p className="text-sm text-zinc-500 text-center py-8">No completion records yet.</p>
                                ) : (
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-zinc-800" />

                                        <div className="space-y-4">
                                            {[...historyTask.payload.history].reverse().map((h, i) => (
                                                <div key={h.id} className="relative flex items-start gap-4 pl-7">
                                                    {/* Timeline dot */}
                                                    <div className={cn(
                                                        "absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center",
                                                        i === 0 ? "border-success bg-success/20" : "border-zinc-700 bg-zinc-900"
                                                    )}>
                                                        <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-success" : "bg-zinc-600")} />
                                                    </div>

                                                    <div className="flex-1 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs space-y-1">
                                                        <p className="text-zinc-200 font-semibold">{formatDate(h.completed_at)}</p>
                                                        {h.vendor && (
                                                            <p className="text-zinc-500">
                                                                <span className="text-zinc-600">Vendor:</span> {h.vendor}
                                                            </p>
                                                        )}
                                                        {h.cost !== undefined && (
                                                            <p className="text-zinc-500">
                                                                <span className="text-zinc-600">Cost:</span>{" "}
                                                                {CURR_SYM[historyTask.payload.currency] || historyTask.payload.currency}{" "}
                                                                {h.cost.toLocaleString("en-IN")}
                                                            </p>
                                                        )}
                                                        {h.notes && <p className="text-zinc-600 italic mt-1">{h.notes}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </ModalOverlay>
                )}
            </AnimatePresence>

            {/* ── Delete Confirmation ─────────────────────────────────────── */}
            <AnimatePresence>
                {deletingId && (
                    <ModalOverlay onClose={() => setDeletingId(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-danger" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100">Delete Task</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeletingId(null)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteTask(deletingId)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger-muted text-white font-medium text-sm hover:bg-danger transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        </motion.div>
                    </ModalOverlay>
                )}
            </AnimatePresence>

            {/* ── Inline Styles for form inputs ──────────────────────────── */}
            <style jsx global>{`
                .form-input {
                    width: 100%;
                    padding: 0.625rem 0.875rem;
                    background: rgb(9 9 11);
                    border: 1px solid rgb(39 39 42);
                    border-radius: 0.75rem;
                    font-size: 0.875rem;
                    color: rgb(228 228 231);
                    outline: none;
                    transition: border-color 0.15s;
                }
                .form-input:focus {
                    border-color: rgb(82 82 91);
                }
                .form-input::placeholder {
                    color: rgb(63 63 70);
                }
                .form-input option {
                    background: rgb(9 9 11);
                    color: rgb(228 228 231);
                }
            `}</style>
        </div>
    );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon: Icon,
    color,
    bgColor,
    highlight,
    sublabel,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    highlight?: boolean;
    sublabel?: string;
}) {
    return (
        <div className={cn(
            "bg-zinc-900 border rounded-2xl p-4 flex items-center gap-4 transition-colors",
            highlight ? "border-danger/30 bg-danger/10" : "border-zinc-800"
        )}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
                <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div>
                <p className={cn("text-2xl font-bold tracking-tight", highlight ? "text-danger" : "text-zinc-50")}>{value}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {label}
                    {sublabel && <span className="text-zinc-600 ml-1 normal-case font-normal italic">({sublabel})</span>}
                </p>
            </div>
        </div>
    );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            {children}
        </motion.div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors pr-8"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
        </div>
    );
}

function EmptyState({ hasAnyTasks, onAdd }: { hasAnyTasks: boolean; onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                <Wrench className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1">
                {hasAnyTasks ? "No tasks match your filters" : "No maintenance tasks yet"}
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mb-6">
                {hasAnyTasks
                    ? "Try adjusting your search or filter criteria."
                    : "Track recurring maintenance for your home, vehicles, appliances, and more. Never miss a service date again."
                }
            </p>
            {!hasAnyTasks && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-50 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Your First Task
                </button>
            )}
        </div>
    );
}
