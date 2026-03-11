"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    CreditCard,
    ExternalLink,
    Settings,
    Check,
    RotateCw,
    RotateCcw,
    RefreshCw,
    Copy,
    GripVertical,
    Search,
    CalendarDays,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    DragOverlay,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const BILLING_CYCLES = ["monthly", "yearly", "weekly", "daily", "quarterly"] as const;
const DEFAULT_CATEGORIES = [
    "Streaming", "Cloud/SaaS", "Music", "News", "Gaming",
    "Fitness", "Productivity", "Insurance", "Investment",
    "Housing", "Utilities", "Memberships", "Education", "Health", "EMI", "Other"
];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CHF", "CNY", "BRL"];
const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", BRL: "R$" };

const SUB_DEFAULTS = { categories: DEFAULT_CATEGORIES, defaultCurrency: "USD", renewalWarningDays: 7, enableReminders: true, numberFormat: "western", defaultSort: "custom" };

interface RecurringExpense {
    _id: string;
    payload: {
        name: string;
        cost: number;
        currency: string;
        billing_cycle: string;
        next_renewal_date: string;
        category: string;
        url?: string;
        is_active: boolean;
        enable_reminders: boolean;
        notes?: string;
        order?: number;
    };
}

function daysUntil(date: string): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function monthlyEquivalent(cost: number, cycle: string): number {
    if (cycle === "yearly") return cost / 12;
    if (cycle === "quarterly") return cost / 3;
    if (cycle === "weekly") return cost * 4.33;
    if (cycle === "daily") return cost * 30.44;
    return cost;
}

function cycleApproxDays(cycle: string): number {
    if (cycle === "daily") return 1;
    if (cycle === "weekly") return 7;
    if (cycle === "monthly") return 30;
    if (cycle === "quarterly") return 90;
    if (cycle === "yearly") return 365;
    return 30;
}

function renewalProgress(days: number, cycle: string): number {
    const total = cycleApproxDays(cycle);
    const elapsed = total - Math.max(days, 0);
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function renewalState(days: number, warningDays: number, remindersEnabled: boolean) {
    if (!remindersEnabled) {
        return {
            label: "Reminder off",
            textClass: "text-zinc-500",
            chipClass: "bg-zinc-800 border-zinc-700 text-zinc-400",
            lineClass: "bg-zinc-700",
        };
    }
    if (days < 0) {
        return {
            label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
            textClass: "text-red-400",
            chipClass: "bg-red-500/10 border-red-500/25 text-red-300",
            lineClass: "bg-red-500/70",
        };
    }
    if (days === 0) {
        return {
            label: "Due today",
            textClass: "text-red-300",
            chipClass: "bg-red-500/10 border-red-500/25 text-red-300",
            lineClass: "bg-red-500/60",
        };
    }
    if (days <= warningDays) {
        return {
            label: days === 1 ? "Due tomorrow" : `Due in ${days} days`,
            textClass: "text-yellow-300",
            chipClass: "bg-yellow-500/10 border-yellow-500/25 text-yellow-300",
            lineClass: "bg-yellow-400/70",
        };
    }
    return {
        label: `Due in ${days} days`,
        textClass: "text-green-300",
        chipClass: "bg-green-500/10 border-green-500/25 text-green-300",
        lineClass: "bg-green-500/70",
    };
}

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
    return (
        <div className="group/tip relative flex items-center justify-center">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-[10px] rounded opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-zinc-700 shadow-xl">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-800"></div>
            </div>
        </div>
    );
}

interface SortableRecurringExpenseCardProps {
    s: RecurringExpense;
    sym: string;
    renewalWarningDays: number;
    isAnyDragging: boolean;
    dragEnabled: boolean;
    numberFormat: "western" | "indian";
    onDeRenew: (s: RecurringExpense) => void;
    onRenew: (s: RecurringExpense) => void;
    onDuplicate: (s: RecurringExpense) => void;
    onEdit: (s: RecurringExpense) => void;
    onDelete: (id: string) => void;
    isProcessingId: string | null;
}

function SortableRecurringExpenseCard({
    s,
    sym,
    renewalWarningDays,
    isAnyDragging,
    dragEnabled,
    numberFormat,
    onDeRenew,
    onRenew,
    onDuplicate,
    onEdit,
    onDelete,
    isProcessingId,
}: SortableRecurringExpenseCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s._id, disabled: !dragEnabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const days = daysUntil(s.payload.next_renewal_date);
    const state = renewalState(days, renewalWarningDays, s.payload.enable_reminders !== false);
    const monthly = monthlyEquivalent(s.payload.cost, s.payload.billing_cycle);
    const annual = monthly * 12;
    const progress = renewalProgress(days, s.payload.billing_cycle);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors group/card relative z-10 overflow-hidden",
                isDragging && "ring-2 ring-accent/70 border-accent/70 shadow-2xl cursor-grabbing",
                isAnyDragging && !isDragging && "opacity-95",
                !s.payload.is_active && "opacity-50"
            )}
        >
            <div className={cn("absolute top-0 left-0 right-0 h-0.5", state.lineClass)} />
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                    <button
                        type="button"
                        aria-label={`Drag ${s.payload.name}`}
                        {...attributes}
                        {...listeners}
                        disabled={!dragEnabled}
                        className={cn(
                            "p-1 -ml-1 transition-colors touch-none",
                            dragEnabled
                                ? "text-zinc-700 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
                                : "text-zinc-800 cursor-not-allowed"
                        )}
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <div>
                        <p className="text-sm font-semibold text-zinc-50">{s.payload.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">{s.payload.category}</span>
                            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", s.payload.is_active ? "bg-green-500/10 border-green-500/25 text-green-300" : "bg-zinc-800 border-zinc-700 text-zinc-400")}>
                                {s.payload.is_active ? "Active" : "Paused"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {s.payload.url && (
                        <Tooltip content="Open URL">
                            <a href={s.payload.url} target="_blank" rel="noopener" className="p-1 text-zinc-500 hover:text-zinc-300">
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </Tooltip>
                    )}
                    <Tooltip content="Go Back one cycle">
                        <button
                            onClick={() => onDeRenew(s)}
                            disabled={isProcessingId === s._id}
                            className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                            aria-label="Previous billing cycle"
                        >
                            {isProcessingId === s._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </button>
                    </Tooltip>
                    <Tooltip content="Mark as Renewed">
                        <button
                            onClick={() => onRenew(s)}
                            disabled={isProcessingId === s._id}
                            className={cn("p-1 transition-colors disabled:opacity-50", days <= 0 ? "text-accent hover:text-accent-hover" : "text-zinc-500 hover:text-zinc-300")}
                            aria-label="Mark as renewed"
                        >
                            {isProcessingId === s._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                        </button>
                    </Tooltip>
                    <Tooltip content="Duplicate Expense">
                        <button
                            onClick={() => onDuplicate(s)}
                            disabled={isProcessingId === s._id}
                            className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                            aria-label="Duplicate expense"
                        >
                            {isProcessingId === s._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </Tooltip>
                    <Tooltip content="Edit Expense">
                        <button
                            onClick={() => onEdit(s)}
                            disabled={isProcessingId === s._id}
                            className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                            aria-label="Edit expense"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                    </Tooltip>
                    <Tooltip content="Delete Expense">
                        <button
                            onClick={() => onDelete(s._id)}
                            disabled={isProcessingId === s._id}
                            className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                            aria-label="Delete expense"
                        >
                            {isProcessingId === s._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                    </Tooltip>
                </div>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-zinc-50">{sym}{formatNumber(s.payload.cost, numberFormat)}</span>
                <span className="text-xs text-zinc-500">/{s.payload.billing_cycle}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className={cn("h-full transition-all", state.lineClass)} style={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
                    <p className="text-zinc-500">Monthly Eq.</p>
                    <p className="text-zinc-300 font-medium">{sym}{formatNumber(monthly, numberFormat)}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
                    <p className="text-zinc-500">Annual Impact</p>
                    <p className="text-zinc-300 font-medium">{sym}{formatNumber(annual, numberFormat)}</p>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t border-zinc-800">
                <span className={cn("px-2 py-0.5 rounded-full border", state.chipClass)}>{state.label}</span>
                <span className="text-zinc-500 inline-flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(s.payload.next_renewal_date).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
}

function DragPreviewCard({ s, sym }: { s: RecurringExpense; sym: string }) {
    return (
        <div className="bg-zinc-900 border border-accent/70 rounded-xl p-5 shadow-2xl ring-2 ring-accent/70 opacity-95 w-full max-w-md">
            <div className="flex items-start gap-2">
                <div className="p-1 -ml-1 text-zinc-400">
                    <GripVertical className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-zinc-50">{s.payload.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.payload.category}</p>
                </div>
            </div>
            <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-bold text-zinc-50">{sym}{s.payload.cost.toFixed(2)}</span>
                <span className="text-xs text-zinc-500">/{s.payload.billing_cycle}</span>
            </div>
        </div>
    );
}

export default function RecurringExpensesAdminView() {
    const { settings, updateSettings, saving: settingsSaving, loaded: settingsLoaded } = useModuleSettings("recurringExpenseSettings", SUB_DEFAULTS);
    const [showSettings, setShowSettings] = useState(false);
    const [newCat, setNewCat] = useState("");
    const [subs, setSubs] = useState<RecurringExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 180, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Form
    const [name, setName] = useState("");
    const [cost, setCost] = useState("");
    const [billingCycle, setBillingCycle] = useState<string>("monthly");
    const [nextRenewal, setNextRenewal] = useState(new Date().toISOString().slice(0, 10));
    const [category, setCategory] = useState<string>(settings.categories[0] || "Other");
    const [url, setUrl] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [enableReminders, setEnableReminders] = useState(settings.enableReminders);
    const [notes, setNotes] = useState("");
    const [formError, setFormError] = useState("");
    const [sortBy, setSortBy] = useState<"custom" | "name-asc" | "name-desc" | "cost-asc" | "cost-desc" | "monthly-eq-asc" | "monthly-eq-desc" | "renewal-asc" | "renewal-desc" | "category">("custom");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "warning" | "inactive">("all");

    const fetchSubs = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=recurring_expense");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch expenses");
            const unsorted = data.data || [];

            let sorted: RecurringExpense[] = [];

            switch (sortBy) {
                case "name-asc":
                    sorted = [...unsorted].sort((a, b) => a.payload.name.localeCompare(b.payload.name));
                    break;
                case "name-desc":
                    sorted = [...unsorted].sort((a, b) => b.payload.name.localeCompare(a.payload.name));
                    break;
                case "cost-asc":
                    sorted = [...unsorted].sort((a, b) => a.payload.cost - b.payload.cost);
                    break;
                case "cost-desc":
                    sorted = [...unsorted].sort((a, b) => b.payload.cost - a.payload.cost);
                    break;
                case "monthly-eq-asc":
                    sorted = [...unsorted].sort((a, b) => monthlyEquivalent(a.payload.cost, a.payload.billing_cycle) - monthlyEquivalent(b.payload.cost, b.payload.billing_cycle));
                    break;
                case "monthly-eq-desc":
                    sorted = [...unsorted].sort((a, b) => monthlyEquivalent(b.payload.cost, b.payload.billing_cycle) - monthlyEquivalent(a.payload.cost, a.payload.billing_cycle));
                    break;
                case "renewal-asc":
                    sorted = [...unsorted].sort((a, b) => new Date(a.payload.next_renewal_date).getTime() - new Date(b.payload.next_renewal_date).getTime());
                    break;
                case "renewal-desc":
                    sorted = [...unsorted].sort((a, b) => new Date(b.payload.next_renewal_date).getTime() - new Date(a.payload.next_renewal_date).getTime());
                    break;
                case "category":
                    sorted = [...unsorted].sort((a, b) => {
                        const catCompare = a.payload.category.localeCompare(b.payload.category);
                        if (catCompare !== 0) return catCompare;
                        return a.payload.name.localeCompare(b.payload.name);
                    });
                    break;
                case "custom":
                default:
                    sorted = [...unsorted].sort((a, b) => {
                        if (a.payload.order !== undefined && b.payload.order !== undefined) return a.payload.order - b.payload.order;
                        return new Date(b.payload.next_renewal_date).getTime() - new Date(a.payload.next_renewal_date).getTime();
                    });
                    break;
            }

            // Save new order to database if not custom sort
            if (sortBy !== "custom" && sorted.length > 0) {
                try {
                    await Promise.all(sorted.map((s, i) => {
                        const payload = { ...s.payload, order: i };
                        return fetch(`/api/content/${s._id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ module_type: "recurring_expense", payload }),
                        });
                    }));
                } catch (error: unknown) {
                    console.error("Failed to save new order:", error);
                }
            }

            setSubs(sorted);
        } catch (err: unknown) {
            console.error("fetchSubs failed:", err);
        } finally {
            setLoading(false);
        }
    }, [sortBy]);

    useEffect(() => { fetchSubs(); }, [fetchSubs]);

    useEffect(() => {
        if (settingsLoaded && settings.defaultSort && settings.defaultSort !== sortBy) {
            setSortBy(settings.defaultSort as typeof sortBy);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsLoaded]);

    // Update category state when categories change to ensure new categories are available
    useEffect(() => {
        // If current category is not in the list, update it to the first available category
        if (!settings.categories.includes(category)) {
            setCategory(settings.categories[0] || "Other");
        }
    }, [settings.categories, category]);

    const resetForm = () => {
        setName(""); setCost(""); setBillingCycle("monthly");
        setNextRenewal(new Date().toISOString().slice(0, 10));
        setCategory(settings.categories[0] || "Other"); setUrl(""); setIsActive(true);
        setEnableReminders(settings.enableReminders);
        setNotes("");
        setEditingId(null); setFormError(""); setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        const costVal = parseFloat(cost);
        if (!name.trim()) { setFormError("Name required"); return; }
        if (isNaN(costVal) || costVal <= 0) { setFormError("Valid cost required"); return; }

        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                cost: costVal,
                currency: settings.defaultCurrency,
                billing_cycle: billingCycle,
                next_renewal_date: new Date(nextRenewal).toISOString(),
                category,
                url: url.trim() || undefined,
                is_active: isActive,
                enable_reminders: enableReminders,
                notes: notes.trim() || undefined,
            };

            const response = editingId
                ? await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload })
                })
                : await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "recurring_expense", is_public: false, payload })
                });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to save expense");

            resetForm();
            await fetchSubs();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (s: RecurringExpense) => {
        setName(s.payload.name); setCost(s.payload.cost.toString());
        setBillingCycle(s.payload.billing_cycle); setNextRenewal(s.payload.next_renewal_date.slice(0, 10));
        setCategory(s.payload.category); setUrl(s.payload.url || "");
        setIsActive(s.payload.is_active);
        setEnableReminders(s.payload.enable_reminders ?? true);
        setNotes(s.payload.notes || "");
        setEditingId(s._id); setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this expense?")) return;
        setIsProcessingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchSubs();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete";
            alert(message);
        } finally {
            setIsProcessingId(null);
        }
    };

    const handleRenew = async (s: RecurringExpense) => {
        setIsProcessingId(s._id);
        try {
            const current = new Date(s.payload.next_renewal_date);
            const cycle = s.payload.billing_cycle;
            const next = new Date(current);

            if (cycle === "daily") next.setDate(current.getDate() + 1);
            else if (cycle === "weekly") next.setDate(current.getDate() + 7);
            else if (cycle === "monthly") next.setMonth(current.getMonth() + 1);
            else if (cycle === "quarterly") next.setMonth(current.getMonth() + 3);
            else if (cycle === "yearly") next.setFullYear(current.getFullYear() + 1);

            const payload = { ...s.payload, next_renewal_date: next.toISOString() };
            const res = await fetch(`/api/content/${s._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Renewal failed");
            await fetchSubs();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to renew";
            alert(message);
        } finally {
            setIsProcessingId(null);
        }
    };

    const handleDeRenew = async (s: RecurringExpense) => {
        setIsProcessingId(s._id);
        try {
            const current = new Date(s.payload.next_renewal_date);
            const cycle = s.payload.billing_cycle;
            const prev = new Date(current);

            if (cycle === "daily") prev.setDate(current.getDate() - 1);
            else if (cycle === "weekly") prev.setDate(current.getDate() - 7);
            else if (cycle === "monthly") prev.setMonth(current.getMonth() - 1);
            else if (cycle === "quarterly") prev.setMonth(current.getMonth() - 3);
            else if (cycle === "yearly") prev.setFullYear(current.getFullYear() - 1);

            const payload = { ...s.payload, next_renewal_date: prev.toISOString() };
            const res = await fetch(`/api/content/${s._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "De-renewal failed");
            await fetchSubs();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to de-renew";
            alert(message);
        } finally {
            setIsProcessingId(null);
        }
    };

    const handleDuplicate = async (s: RecurringExpense) => {
        setIsProcessingId(s._id);
        try {
            const payload = { ...s.payload, name: `${s.payload.name} (Copy)` };
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module_type: "recurring_expense", is_public: false, payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Duplicate failed");
            await fetchSubs();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to duplicate";
            alert(message);
        } finally {
            setIsProcessingId(null);
        }
    };

    const handleReorder = async (newOrder: RecurringExpense[]) => {
        try {
            await Promise.all(newOrder.map((s, i) => {
                const payload = { ...s.payload, order: i };
                return fetch(`/api/content/${s._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                });
            }));
        } catch { }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setSubs((prev) => {
            const oldIndex = prev.findIndex((item) => item._id === String(active.id));
            const newIndex = prev.findIndex((item) => item._id === String(over.id));
            if (oldIndex < 0 || newIndex < 0) return prev;

            const reordered = arrayMove(prev, oldIndex, newIndex);

            if (sortBy !== "custom") {
                setSortBy("custom");
                updateSettings({ defaultSort: "custom" });
            }

            void handleReorder(reordered);
            return reordered;
        });
    };

    const activeDragItem = activeDragId ? subs.find((s) => s._id === activeDragId) ?? null : null;
    const dropAnimation = {
        duration: 220,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: "0.75",
                },
            },
        }),
    };

    const activeSubs = subs.filter((s) => s.payload.is_active);
    const totalMonthlyBurn = activeSubs.reduce((sum, s) => sum + monthlyEquivalent(s.payload.cost, s.payload.billing_cycle), 0);
    const totalYearlyBurn = totalMonthlyBurn * 12;
    const upcoming = [...activeSubs]
        .sort((a, b) => new Date(a.payload.next_renewal_date).getTime() - new Date(b.payload.next_renewal_date).getTime())
        .slice(0, 3);

    const visibleSubs = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return subs.filter((sub) => {
            if (statusFilter === "inactive" && sub.payload.is_active) return false;
            if (statusFilter !== "inactive" && !sub.payload.is_active && statusFilter !== "all") return false;

            const days = daysUntil(sub.payload.next_renewal_date);
            if (statusFilter === "overdue" && days >= 0) return false;
            if (statusFilter === "warning" && (days < 0 || days > settings.renewalWarningDays)) return false;

            if (!query) return true;
            const haystack = `${sub.payload.name} ${sub.payload.category} ${sub.payload.billing_cycle}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [subs, searchQuery, statusFilter, settings.renewalWarningDays]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <RefreshCw className="w-8 h-8 animate-spin text-accent mb-3" />
            <span>Loading expenses...</span>
        </div>
    );

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-12 right-0 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Recurring Expenses</h1>
                        <p className="text-zinc-400 mt-1">Track renewals, burn rate, and urgency in one control center.</p>
                    </div>
                    <div className="flex items-center gap-2 md:pt-1 md:shrink-0">
                        <button onClick={() => setShowSettings(!showSettings)}
                            className={cn("px-3 py-2.5 rounded-xl text-sm transition-colors", showSettings ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300")}>
                            <Settings className="w-4 h-4" />
                        </button>
                        <button onClick={() => { resetForm(); setShowForm(true); }}
                            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Add Recurring Expense
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Monthly Burn</p>
                        <p className="text-lg font-semibold text-zinc-50">{sym}{formatNumber(totalMonthlyBurn, settings.numberFormat as "western" | "indian")}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Annualized Burn</p>
                        <p className="text-lg font-semibold text-zinc-50">{sym}{formatNumber(totalYearlyBurn, settings.numberFormat as "western" | "indian")}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Active Expenses</p>
                        <p className="text-lg font-semibold text-zinc-300">{activeSubs.length}</p>
                    </div>
                </div>
                {upcoming.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {upcoming.map((item) => (
                            <div key={item._id} className="px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300">
                                {item.payload.name} · {daysUntil(item.payload.next_renewal_date) <= 0 ? "due" : `${daysUntil(item.payload.next_renewal_date)}d`}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showSettings && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">Recurring Expense Settings</h2>
                        {settingsSaving && <span className="text-xs text-accent flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="settings-default-currency" className="block text-xs text-zinc-500 mb-1.5">Default Currency</label>
                            <select id="settings-default-currency" value={settings.defaultCurrency} onChange={(e) => updateSettings({ defaultCurrency: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                {CURRENCIES.map((c) => <option key={c} value={c}>{c} ({CURR_SYM[c] || c})</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="settings-number-format" className="block text-xs text-zinc-500 mb-1.5">Number Format</label>
                            <select id="settings-number-format" value={settings.numberFormat} onChange={(e) => updateSettings({ numberFormat: e.target.value as "western" | "indian" })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                <option value="western">Western (1,234,567)</option>
                                <option value="indian">Indian (12,34,567)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="settings-warning-days" className="block text-xs text-zinc-500 mb-1.5">Renewal Warning (days)</label>
                            <input id="settings-warning-days" type="number" min={1} max={30} value={settings.renewalWarningDays}
                                onChange={(e) => updateSettings({ renewalWarningDays: parseInt(e.target.value) || 7 })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                            <p className="text-xs text-zinc-500 mt-1">Show warning when renewal is within this many days</p>
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                                <input id="settings-default-reminders" type="checkbox" checked={settings.enableReminders} onChange={(e) => updateSettings({ enableReminders: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 accent-accent" />
                                Enable reminders for new items by default
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2">Categories</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {settings.categories.map((cat: string) => (
                                <span key={cat} className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300">
                                    {cat}
                                    <button onClick={() => updateSettings({ categories: settings.categories.filter((c: string) => c !== cat) })}
                                        className="text-zinc-500 hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input id="new-category-input" type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (newCat.trim()) {
                                            const trimmedCat = newCat.trim();
                                            updateSettings({ categories: [...settings.categories, trimmedCat] });
                                            setCategory(trimmedCat); // Immediately set the new category as selected
                                            setNewCat("");
                                        }
                                    }
                                }}
                                placeholder="New category..."
                                aria-label="New expense category"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                            <button onClick={() => {
                                if (newCat.trim()) {
                                    const trimmedCat = newCat.trim();
                                    updateSettings({ categories: [...settings.categories, trimmedCat] });
                                    setCategory(trimmedCat); // Immediately set the new category as selected
                                    setNewCat("");
                                }
                            }}
                                disabled={!newCat.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "New"} Recurring Expense</h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="expense-name" className="block text-xs text-zinc-500 mb-1.5">Name</label>
                            <input id="expense-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix, Spotify..."
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40" autoFocus />
                        </div>
                        <div>
                            <label htmlFor="expense-cost" className="block text-xs text-zinc-500 mb-1.5">Cost</label>
                            <input id="expense-cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div>
                            <label htmlFor="expense-billing-cycle" className="block text-xs text-zinc-500 mb-1.5">Billing Cycle</label>
                            <select id="expense-billing-cycle" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                {BILLING_CYCLES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="expense-category" className="block text-xs text-zinc-500 mb-1.5">Category</label>
                            <select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                {settings.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="expense-next-renewal" className="block text-xs text-zinc-500 mb-1.5">Next Renewal</label>
                            <input id="expense-next-renewal" type="date" value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div>
                            <label htmlFor="expense-url" className="block text-xs text-zinc-500 mb-1.5">URL (optional)</label>
                            <input id="expense-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-4">
                                <label htmlFor="expense-is-active" className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                                    <input id="expense-is-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                                        disabled={isSubmitting}
                                        className="w-4 h-4 rounded border-zinc-700 accent-accent" />
                                    Active
                                </label>
                                <label htmlFor="expense-reminders" className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                                    <input id="expense-reminders" type="checkbox" checked={enableReminders} onChange={(e) => setEnableReminders(e.target.checked)}
                                        disabled={isSubmitting}
                                        className="w-4 h-4 rounded border-zinc-700 accent-accent" />
                                    Notify of renewal
                                </label>
                            </div>
                            <div className="flex items-center gap-3 self-end">
                                {formError && <span className="text-red-400 text-xs">{formError}</span>}
                                <button type="submit"
                                    disabled={isSubmitting}
                                    className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : (editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                                    {isSubmitting ? "Saving..." : (editingId ? "Update" : "Add")}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Subscription cards */}
            {!loading && subs.length > 0 && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <div className="relative flex-1 min-w-[220px] md:min-w-[320px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, category, cycle..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {([
                                { key: "all", label: "All" },
                                { key: "overdue", label: "Overdue" },
                                { key: "warning", label: `Due ≤ ${settings.renewalWarningDays}d` },
                                { key: "inactive", label: "Inactive" },
                            ] as const).map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => setStatusFilter(opt.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                        statusFilter === opt.key
                                            ? "bg-accent/15 border-accent/35 text-accent"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <label className="text-xs text-zinc-500 whitespace-nowrap">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    const val = e.target.value as typeof sortBy;
                                    setSortBy(val);
                                    updateSettings({ defaultSort: val });
                                }}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="custom">Custom Order</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                                <option value="cost-desc">Raw Amount (High to Low)</option>
                                <option value="cost-asc">Raw Amount (Low to High)</option>
                                <option value="monthly-eq-desc">Monthly Eq. (High to Low)</option>
                                <option value="monthly-eq-asc">Monthly Eq. (Low to High)</option>
                                <option value="renewal-asc">Next Renewal (Soonest)</option>
                                <option value="renewal-desc">Next Renewal (Latest)</option>
                                <option value="category">Category</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center text-zinc-500 py-12">Loading...</div>
            ) : subs.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No recurring expenses tracked yet</p>
                </div>
            ) : visibleSubs.length === 0 ? (
                <div className="text-center text-zinc-500 py-12 border border-zinc-800 rounded-xl bg-zinc-900/40">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                    <p>No items match the current filters.</p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveDragId(null)}
                >
                    <SortableContext items={visibleSubs.map((s) => s._id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleSubs.map((s) => (
                                <SortableRecurringExpenseCard
                                    key={s._id}
                                    s={s}
                                    sym={sym}
                                    renewalWarningDays={settings.renewalWarningDays}
                                    isAnyDragging={activeDragId !== null}
                                    dragEnabled={true}
                                    numberFormat={settings.numberFormat as "western" | "indian"}
                                    onDeRenew={handleDeRenew}
                                    onRenew={handleRenew}
                                    onDuplicate={handleDuplicate}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    isProcessingId={isProcessingId}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={dropAnimation} adjustScale={false}>
                        {activeDragItem ? <DragPreviewCard s={activeDragItem} sym={sym} /> : null}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}

function formatNumber(num: number, format: "western" | "indian" = "western"): string {
    if (format === "indian") {
        // Indian numbering system: 1,23,45,678
        const numStr = Math.round(num).toString();
        if (numStr.length <= 3) return numStr;

        let result = "";
        let remaining = numStr;

        // Last 3 digits
        if (remaining.length > 3) {
            result = "," + remaining.slice(-3);
            remaining = remaining.slice(0, -3);
        } else {
            return remaining;
        }

        // Process in groups of 2 from right to left
        while (remaining.length > 2) {
            result = "," + remaining.slice(-2) + result;
            remaining = remaining.slice(0, -2);
        }

        result = remaining + result;
        return result;
    } else {
        // Western numbering system: 12,345,678
        return Math.round(num).toLocaleString("en-US");
    }
}
