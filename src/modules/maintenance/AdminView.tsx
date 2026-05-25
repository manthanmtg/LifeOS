"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Search,
  Filter,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  History,
  Tag,
  Bell,
  BellOff,
  CircleDollarSign,
  Repeat,
  User,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { CATEGORIES, PRIORITIES } from "./types";
import type {
  Category,
  Priority,
  Status,
  MaintenanceTask,
  MaintenancePayload,
  HistoryEntry,
} from "./types";
import {
  CATEGORY_ICONS,
  PRIORITY_DOT,
  CURR_SYM,
  EMPTY_FORM,
} from "./constants";
import {
  formatDate,
  computeStatus,
  addMonths,
  todayISO,
  capitalize,
} from "./helpers";
import { TaskCard } from "./components/TaskCard";
import {
  StatCard,
  ModalOverlay,
  ModalSection,
  FilterSelect,
  EmptyState,
} from "./components/MaintenanceUI";

// ─── Component ──────────────────────────────────────────────────────────────

import { AdminModuleSkeleton } from "@/components/ui/Skeletons";

export default function MaintenanceAdminView() {
  const [now, setNow] = useState(() => new Date());
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaintenancePayload>({ ...EMPTY_FORM });
  const [tagInput, setTagInput] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"completed" | "future">(
    "completed",
  );

  // Mark Complete modal
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(
    null,
  );
  const [completionDate, setCompletionDate] = useState("");
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  // ── Smart status on load ──────────────────────────────────────────────

  const enrichedTasks = useMemo(() => {
    return tasks.map((t) => ({
      ...t,
      payload: { ...t.payload, status: computeStatus(t.payload, now) },
    }));
  }, [tasks, now]);

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
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

    return {
      total: enrichedTasks.length,
      overdue,
      dueSoon,
      completedThisMonth,
    };
  }, [enrichedTasks, now]);

  // ── Filtered list ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = enrichedTasks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.payload.name.toLowerCase().includes(q) ||
          t.payload.description?.toLowerCase().includes(q) ||
          t.payload.tags.some((tg) => tg.toLowerCase().includes(q)),
      );
    }
    if (filterCategory !== "all")
      list = list.filter((t) => t.payload.category === filterCategory);
    if (filterPriority !== "all")
      list = list.filter((t) => t.payload.priority === filterPriority);
    if (filterStatus !== "all")
      list = list.filter((t) => t.payload.status === filterStatus);

    // Sort: overdue first, then by next_due ascending
    const statusOrder: Record<Status, number> = {
      overdue: 0,
      upcoming: 1,
      completed: 2,
      skipped: 3,
    };
    list = [...list].sort((a, b) => {
      const diff =
        statusOrder[a.payload.status] - statusOrder[b.payload.status];
      if (diff !== 0) return diff;
      if (a.payload.next_due && b.payload.next_due)
        return (
          new Date(a.payload.next_due).getTime() -
          new Date(b.payload.next_due).getTime()
        );
      if (a.payload.next_due) return -1;
      if (b.payload.next_due) return 1;
      return 0;
    });

    return list;
  }, [enrichedTasks, search, filterCategory, filterPriority, filterStatus]);

  // ── CRUD ──────────────────────────────────────────────────────────────

  const openNew = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setTagInput("");
    setScheduleMode("completed");
    setShowForm(true);
  }, []);

  const openEdit = useCallback((task: MaintenanceTask) => {
    setForm({ ...task.payload });
    setEditingId(task._id);
    setTagInput(task.payload.tags.join(", "));
    setScheduleMode(task.payload.last_completed ? "completed" : "future");
    setShowForm(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterCategory("all");
    setFilterPriority("all");
    setFilterStatus("all");
  }, []);

  const saveTask = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const tags = tagInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = { ...form, tags };

      // Auto-calculate next_due for recurring tasks
      if (
        payload.is_recurring &&
        payload.frequency_months &&
        payload.last_completed
      ) {
        payload.next_due = addMonths(
          payload.last_completed,
          payload.frequency_months,
        );
      }

      // Clear estimated_cost for self-service tasks
      if (payload.service_type === "self") {
        payload.estimated_cost = undefined;
      }

      // Seed history with initial completion when creating with last_completed
      if (
        !editingId &&
        payload.last_completed &&
        payload.history.length === 0
      ) {
        payload.history = [
          {
            id: crypto.randomUUID(),
            completed_at: payload.last_completed,
          },
        ];
      }

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
          body: JSON.stringify({
            module_type: "maintenance_task",
            is_public: false,
            payload,
          }),
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

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/content/${id}`, { method: "DELETE" });
        await fetchTasks();
      } catch {}
      setDeletingId(null);
    },
    [fetchTasks],
  );

  // ── Mark Complete ─────────────────────────────────────────────────────

  const openMarkComplete = useCallback((task: MaintenanceTask) => {
    setCompletingTask(task);
    setCompletionDate(new Date().toISOString().split("T")[0]);
    setCompletionCost(task.payload.estimated_cost?.toString() || "");
    setCompletionVendor("");
    setCompletionNotes("");
  }, []);

  const confirmMarkComplete = async () => {
    if (!completingTask) return;
    setSaving(true);
    try {
      const completedAt = completionDate
        ? new Date(completionDate).toISOString()
        : todayISO();
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        completed_at: completedAt,
        cost: completionCost ? parseFloat(completionCost) : undefined,
        vendor: completionVendor || undefined,
        notes: completionNotes || undefined,
      };
      const newHistory = [...completingTask.payload.history, entry];
      const nextDue =
        completingTask.payload.is_recurring &&
        completingTask.payload.frequency_months
          ? addMonths(completedAt, completingTask.payload.frequency_months)
          : completingTask.payload.next_due;

      await fetch(`/api/content/${completingTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...completingTask.payload,
            last_completed: completedAt,
            next_due: nextDue,
            status: completingTask.payload.is_recurring
              ? "upcoming"
              : "completed",
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

  const activeFilterCount = [
    filterCategory !== "all",
    filterPriority !== "all",
    filterStatus !== "all",
  ].filter(Boolean).length;

  // ── Main Render ───────────────────────────────────────────────────────

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-1">
            Maintenance Log
          </h1>
          <p className="text-zinc-500 text-sm">
            Track recurring maintenance for home, vehicles, appliances, and
            more.
          </p>
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
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={Wrench}
          color="text-zinc-400"
          bgColor="bg-zinc-500/10"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          color="text-danger"
          bgColor="bg-danger/10"
          highlight={stats.overdue > 0}
        />
        <StatCard
          label="Due Soon"
          value={stats.dueSoon}
          icon={Clock}
          color="text-warning"
          bgColor="bg-warning/10"
        />
        <StatCard
          label="Completed"
          value={stats.completedThisMonth}
          icon={CheckCircle2}
          color="text-success"
          bgColor="bg-success/10"
          sublabel="this month"
        />
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
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200",
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-accent/20 text-accent rounded-full font-bold">
              {activeFilterCount}
            </span>
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
                options={[
                  { value: "all", label: "All Categories" },
                  ...CATEGORIES.map((c) => ({
                    value: c,
                    label: capitalize(c),
                  })),
                ]}
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
        <EmptyState
          hasAnyTasks={tasks.length > 0}
          onAdd={openNew}
          onClearFilters={clearFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              now={now}
              onEdit={openEdit}
              onMarkComplete={openMarkComplete}
              onDelete={setDeletingId}
              onShowHistory={setHistoryTask}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <ModalOverlay onClose={() => setShowForm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/40 my-auto shrink-0 flex flex-col max-h-[92vh]"
            >
              {/* ─ Sticky Header ─ */}
              <div className="shrink-0 border-b border-zinc-800 p-5 sm:p-6 flex items-center justify-between bg-zinc-900 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Wrench className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-50">
                      {editingId ? "Edit Task" : "New Maintenance Task"}
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {editingId
                        ? "Update task details below"
                        : "Fill in the details to track a new task"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ─ Scrollable Body ─ */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6">
                {/* ── Section: Basic Info ── */}
                <ModalSection icon={Edit3} title="Basic Info">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        Task Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        maxLength={200}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g., Replace AC filter"
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        Description
                      </label>
                      <textarea
                        value={form.description || ""}
                        maxLength={1000}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Additional details..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all resize-none"
                      />
                    </div>
                  </div>
                </ModalSection>

                {/* ── Section: Classification ── */}
                <ModalSection icon={Tag} title="Classification">
                  <div className="space-y-4">
                    {/* Category pill grid */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                        Category
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {CATEGORIES.map((c) => {
                          const CIcon = CATEGORY_ICONS[c];
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({ ...f, category: c }))
                              }
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all",
                                form.category === c
                                  ? "bg-accent/10 border-accent/30 text-accent shadow-sm"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700",
                              )}
                            >
                              <CIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{capitalize(c)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Priority pills */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                        Priority
                      </label>
                      <div className="flex gap-2">
                        {PRIORITIES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, priority: p }))
                            }
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                              form.priority === p
                                ? p === "high"
                                  ? "bg-danger/10 border-danger/30 text-danger"
                                  : p === "medium"
                                    ? "bg-warning/10 border-warning/30 text-warning"
                                    : "bg-success/10 border-success/30 text-success"
                                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700",
                            )}
                          >
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                PRIORITY_DOT[p],
                              )}
                            />
                            {capitalize(p)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Service Type */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                        Service Type
                      </label>
                      <div className="flex gap-2">
                        {(["self", "managed"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, service_type: st }))
                            }
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                              form.service_type === st
                                ? "bg-accent/10 border-accent/30 text-accent"
                                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700",
                            )}
                          >
                            {st === "self" ? (
                              <User className="w-3.5 h-3.5" />
                            ) : (
                              <Wrench className="w-3.5 h-3.5" />
                            )}
                            {st === "self" ? "Self" : "Managed"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ModalSection>

                {/* ── Section: Schedule ── */}
                <ModalSection icon={Calendar} title="Schedule">
                  <div className="space-y-4">
                    {/* Recurring toggle row */}
                    <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <Repeat className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-300 font-medium">
                          Recurring Task
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            is_recurring: !f.is_recurring,
                          }))
                        }
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative shrink-0",
                          form.is_recurring ? "bg-success" : "bg-zinc-700",
                        )}
                        role="switch"
                        aria-checked={form.is_recurring}
                        aria-label="Recurring Task Toggle"
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-5 h-5 bg-zinc-50 rounded-full shadow-sm transition-all",
                            form.is_recurring ? "left-[22px]" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>

                    {/* Frequency */}
                    {form.is_recurring && (
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                          Frequency (months)
                        </label>
                        <div className="flex gap-2">
                          {[1, 3, 6, 12].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  frequency_months: m,
                                }))
                              }
                              className={cn(
                                "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                                form.frequency_months === m
                                  ? "bg-accent/10 border-accent/30 text-accent"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700",
                              )}
                            >
                              {m === 1
                                ? "1mo"
                                : m === 3
                                  ? "3mo"
                                  : m === 6
                                    ? "6mo"
                                    : "1yr"}
                            </button>
                          ))}
                          <input
                            type="number"
                            min={1}
                            value={
                              form.frequency_months &&
                              ![1, 3, 6, 12].includes(form.frequency_months)
                                ? form.frequency_months
                                : ""
                            }
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                frequency_months: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              }))
                            }
                            placeholder="Custom"
                            className="w-20 px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 text-center placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Task Completed / Future Task toggle */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                        When is this task due?
                      </label>
                      <div className="flex gap-2">
                        {(["completed", "future"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setScheduleMode(mode)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                              scheduleMode === mode
                                ? mode === "completed"
                                  ? "bg-success/10 border-success/30 text-success"
                                  : "bg-accent/10 border-accent/30 text-accent"
                                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700",
                            )}
                          >
                            {mode === "completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5" />
                            )}
                            {mode === "completed"
                              ? "Already Completed"
                              : "Future Task"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conditional date field */}
                    {scheduleMode === "completed" ? (
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                          Last Completed
                        </label>
                        <input
                          type="date"
                          value={
                            form.last_completed
                              ? form.last_completed.split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              last_completed: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : undefined,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                        />
                        {form.is_recurring &&
                          form.frequency_months &&
                          form.last_completed && (
                            <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-accent/5 border border-accent/15 rounded-lg text-xs text-zinc-400">
                              <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>
                                Next due auto-sets to{" "}
                                <span className="text-zinc-200 font-semibold">
                                  {formatDate(
                                    addMonths(
                                      form.last_completed,
                                      form.frequency_months,
                                    ),
                                  )}
                                </span>
                              </span>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                          Next Due Date
                        </label>
                        <input
                          type="date"
                          value={
                            form.next_due ? form.next_due.split("T")[0] : ""
                          }
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              next_due: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : undefined,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                        />
                      </div>
                    )}
                  </div>
                </ModalSection>

                {/* ── Section: Cost ── */}
                <ModalSection
                  icon={CircleDollarSign}
                  title={
                    form.service_type === "managed"
                      ? "Cost Estimate"
                      : "Currency"
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {form.service_type === "managed" && (
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                          Estimated Cost
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.estimated_cost ?? ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              estimated_cost: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            }))
                          }
                          placeholder="0"
                          className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        Currency
                      </label>
                      <select
                        value={form.currency}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            currency: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 transition-all appearance-none"
                      >
                        {Object.keys(CURR_SYM).map((c) => (
                          <option key={c} value={c}>
                            {c} ({CURR_SYM[c]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </ModalSection>

                {/* ── Section: Additional ── */}
                <ModalSection icon={StickyNote} title="Additional">
                  <div className="space-y-4">
                    {/* Reminders toggle row */}
                    <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        {form.reminder_enabled ? (
                          <Bell className="w-4 h-4 text-success" />
                        ) : (
                          <BellOff className="w-4 h-4 text-zinc-600" />
                        )}
                        <span className="text-sm text-zinc-300 font-medium">
                          Reminders
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            reminder_enabled: !f.reminder_enabled,
                          }))
                        }
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative shrink-0",
                          form.reminder_enabled ? "bg-success" : "bg-zinc-700",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-5 h-5 bg-zinc-50 rounded-full shadow-sm transition-all",
                            form.reminder_enabled ? "left-[22px]" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={tagInput}
                        maxLength={1018}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="filter, seasonal, annual"
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                      />
                      {tagInput && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tagInput
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-accent bg-accent/10 rounded-md border border-accent/20"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        Notes
                      </label>
                      <textarea
                        value={form.notes || ""}
                        maxLength={5000}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        placeholder="Any additional notes..."
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all resize-none"
                      />
                    </div>
                  </div>
                </ModalSection>

                {/* ── History (edit only) ── */}
                {editingId && form.history.length > 0 && (
                  <ModalSection icon={History} title="Completion History">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[...form.history]
                        .sort(
                          (a, b) =>
                            new Date(b.completed_at).getTime() -
                            new Date(a.completed_at).getTime(),
                        )
                        .map((h) => (
                          <div
                            key={h.id}
                            className="flex items-start gap-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs"
                          >
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-success shrink-0" />
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <p className="text-zinc-300 font-medium">
                                {formatDate(h.completed_at)}
                              </p>
                              {h.vendor && (
                                <p className="text-zinc-500">
                                  Vendor: {h.vendor}
                                </p>
                              )}
                              {h.cost !== undefined && (
                                <p className="text-zinc-500">
                                  Cost:{" "}
                                  {CURR_SYM[form.currency] || form.currency}{" "}
                                  {h.cost.toLocaleString("en-IN")}
                                </p>
                              )}
                              {h.notes && (
                                <p className="text-zinc-600 italic">
                                  {h.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ModalSection>
                )}
              </div>

              {/* ─ Sticky Footer ─ */}
              <div className="shrink-0 border-t border-zinc-800 p-4 sm:p-5 flex items-center justify-between gap-3 bg-zinc-900 rounded-b-2xl">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTask}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-zinc-950 font-bold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 shadow-lg shadow-accent/20"
                >
                  {saving ? (
                    "Saving..."
                  ) : editingId ? (
                    <>
                      <Check className="w-4 h-4" /> Update Task
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Create Task
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Log Completion Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {completingTask && (
          <ModalOverlay onClose={() => setCompletingTask(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/40 my-auto shrink-0"
            >
              <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4.5 h-4.5 text-success" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-50">
                    Log Completion
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[260px]">
                    {completingTask.payload.name}
                  </p>
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      Cost
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={completionCost}
                      onChange={(e) => setCompletionCost(e.target.value)}
                      placeholder="Actual cost"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={completionVendor}
                      maxLength={200}
                      onChange={(e) => setCompletionVendor(e.target.value)}
                      placeholder="Who did it?"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Notes
                  </label>
                  <textarea
                    value={completionNotes}
                    maxLength={2000}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Any remarks..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all resize-none"
                  />
                </div>
                {completingTask.payload.is_recurring &&
                  completingTask.payload.frequency_months && (
                    <div className="flex items-center gap-2.5 p-3 bg-accent/5 border border-accent/15 rounded-xl text-xs text-zinc-400">
                      <Calendar className="w-4 h-4 text-accent shrink-0" />
                      <span>
                        Next due auto-sets to{" "}
                        <span className="text-zinc-200 font-semibold">
                          {formatDate(
                            addMonths(
                              completionDate
                                ? new Date(completionDate).toISOString()
                                : now.toISOString(),
                              completingTask.payload.frequency_months,
                            ),
                          )}
                        </span>
                      </span>
                    </div>
                  )}
              </div>
              <div className="p-4 sm:p-5 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMarkComplete}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-success text-zinc-950 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-success/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Saving..." : "Confirm"}
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
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40 my-auto shrink-0 flex flex-col max-h-[80vh]"
            >
              <div className="shrink-0 p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                    <History className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-50">
                      Completion History
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {historyTask.payload.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryTask(null)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  aria-label="Close history"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                {historyTask.payload.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-3">
                      <History className="w-6 h-6 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">
                      No completion records yet.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-zinc-800" />
                    <div className="space-y-4">
                      {[...historyTask.payload.history]
                        .sort(
                          (a, b) =>
                            new Date(b.completed_at).getTime() -
                            new Date(a.completed_at).getTime(),
                        )
                        .map((h, i) => (
                          <div
                            key={h.id}
                            className="relative flex items-start gap-4 pl-7"
                          >
                            <div
                              className={cn(
                                "absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center",
                                i === 0
                                  ? "border-success bg-success/20"
                                  : "border-zinc-700 bg-zinc-900",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  i === 0 ? "bg-success" : "bg-zinc-600",
                                )}
                              />
                            </div>
                            <div className="flex-1 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs space-y-1">
                              <p className="text-zinc-200 font-semibold">
                                {formatDate(h.completed_at)}
                              </p>
                              {h.vendor && (
                                <p className="text-zinc-500">
                                  <span className="text-zinc-600">Vendor:</span>{" "}
                                  {h.vendor}
                                </p>
                              )}
                              {h.cost !== undefined && (
                                <p className="text-zinc-500">
                                  <span className="text-zinc-600">Cost:</span>{" "}
                                  {CURR_SYM[historyTask.payload.currency] ||
                                    historyTask.payload.currency}{" "}
                                  {h.cost.toLocaleString("en-IN")}
                                </p>
                              )}
                              {h.notes && (
                                <p className="text-zinc-600 italic mt-1">
                                  {h.notes}
                                </p>
                              )}
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/40 p-6 space-y-5 my-auto shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-danger/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Delete Task
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTask(deletingId)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-danger text-zinc-50 font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-danger/20"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}
