"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Edit3, X, DollarSign, Settings, Check, Search, TrendingUp, ChevronDown, Tag, CreditCard, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

const DEFAULT_CATEGORIES = [
    "Housing", "Food", "Transportation", "Utilities",
    "Entertainment", "Tech/Recurring", "Health", "Other",
    "Shopping", "Education", "Travel", "Insurance", "Investments",
    "Subscriptions", "Personal Care", "Gifts/Donations", "Taxes",
    "Business Expenses", "Home Maintenance", "Childcare", "Pet Care"
];

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CHF", "CNY", "BRL"];

const CATEGORY_COLORS: Record<string, string> = {
    Housing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    Food: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    Transportation: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    Utilities: "bg-warning/15 text-warning border-warning/20",
    Entertainment: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    "Tech/Recurring": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    Health: "bg-success/15 text-success border-success/20",
    Other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    Shopping: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    Education: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    Travel: "bg-teal-500/15 text-teal-400 border-teal-500/20",
    Insurance: "bg-warning/15 text-warning border-warning/20",
    Investments: "bg-success/15 text-success border-success/20",
    Subscriptions: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    "Personal Care": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
    "Gifts/Donations": "bg-pink-500/15 text-pink-400 border-pink-500/20",
    Taxes: "bg-danger/15 text-danger border-danger/20",
    "Business Expenses": "bg-slate-500/15 text-slate-400 border-slate-500/20",
    "Home Maintenance": "bg-stone-500/15 text-stone-400 border-stone-500/20",
    Childcare: "bg-lime-500/15 text-lime-400 border-lime-500/20",
    "Pet Care": "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const DYNAMIC_COLORS = [
    "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "bg-orange-500/15 text-orange-400 border-orange-500/20",
    "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "bg-warning/15 text-warning border-warning/20",
    "bg-pink-500/15 text-pink-400 border-pink-500/20",
    "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    "bg-success/15 text-success border-success/20",
    "bg-rose-500/15 text-rose-400 border-rose-500/20",
    "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    "bg-teal-500/15 text-teal-400 border-teal-500/20",
];

function getCategoryColor(cat: string, allCats: string[]): string {
    if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
    const idx = allCats.indexOf(cat);
    return DYNAMIC_COLORS[idx % DYNAMIC_COLORS.length] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
}

function formatNumber(num: number, format: "western" | "indian" = "western"): string {
    if (format === "indian") {
        const numStr = Math.round(num).toString();
        if (numStr.length <= 3) return numStr;
        let result = "";
        let remaining = numStr;
        if (remaining.length > 3) {
            result = "," + remaining.slice(-3);
            remaining = remaining.slice(0, -3);
        }
        while (remaining.length > 2) {
            result = "," + remaining.slice(-2) + result;
            remaining = remaining.slice(0, -2);
        }
        return remaining + result;
    }
    return Math.round(num).toLocaleString("en-US");
}

interface Expense {
    _id: string;
    payload: {
        amount: number;
        currency: string;
        description: string;
        category: string;
        date: string;
        is_recurring: boolean;
    };
    created_at: string;
}

interface ExpenseSettings {
    categories: string[];
    defaultCurrency: string;
    monthlyBudget: number;
    numberFormat: "western" | "indian";
}

const DATE_FILTERS = [
    { label: "This month", value: "this-month" },
    { label: "Last 30 days", value: "last-30" },
    { label: "All time", value: "all" },
] as const;

function ExpenseChart({ data, total, sym, numberFormat }: { data: [string, number][]; total: number; sym: string; numberFormat: "western" | "indian" }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    const cumulativePercent = -0.25;
    const CHART_COLORS = ["#3b82f6", "#f97316", "#a855f7", "#eab308", "#ec4899", "#06b6d4", "#22c55e", "#f43f5e", "#6366f1", "#14b8a6"];

    return (
        <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full transform -rotate-90">
                    <AnimatePresence>
                        {data.map(([cat, amount], i) => {
                            const percent = amount / total;
                            if (percent === 0) return null;

                            if (percent === 1) {
                                return (
                                    <motion.circle
                                        key={cat}
                                        cx="0" cy="0" r="1"
                                        fill="none" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="0.3"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        className="cursor-pointer hover:stroke-[0.35] transition-all"
                                    />
                                );
                            }

                            const currentCumulativePercent = cumulativePercent + percent;
                            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                            const [endX, endY] = getCoordinatesForPercent(currentCumulativePercent);

                            const largeArcFlag = percent > 0.5 ? 1 : 0;
                            const pathData = [
                                `M ${startX} ${startY}`,
                                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`
                            ].join(" ");

                            const isHovered = hoveredIndex === i;
                            const isDimmed = hoveredIndex !== null && !isHovered;

                            return (
                                <motion.path
                                    key={cat}
                                    d={pathData}
                                    fill="none"
                                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                    strokeWidth={isHovered ? "0.38" : "0.3"}
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1, ease: "easeOut", delay: i * 0.05 }}
                                    className={cn(
                                        "transition-all duration-300 cursor-pointer origin-center",
                                        isDimmed && "opacity-30"
                                    )}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                />
                            );
                        })}
                    </AnimatePresence>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                    <AnimatePresence mode="wait">
                        {hoveredIndex !== null ? (
                            <motion.div
                                key="hovered"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium truncate w-full" title={data[hoveredIndex][0]}>
                                    {data[hoveredIndex][0]}
                                </span>
                                <span className="text-sm font-bold text-zinc-50 mt-0.5" style={{ color: CHART_COLORS[hoveredIndex % CHART_COLORS.length] }}>
                                    {((data[hoveredIndex][1] / total) * 100).toFixed(0)}%
                                </span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="total"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Total</span>
                                <span className="text-base font-bold text-zinc-50">{sym}{formatNumber(total, numberFormat)}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 w-full">
                {data.map(([cat, amount], i) => {
                    const isHovered = hoveredIndex === i;
                    const isDimmed = hoveredIndex !== null && !isHovered;
                    return (
                        <motion.div
                            key={cat}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                                "flex items-center justify-between text-sm transition-all duration-200 cursor-pointer p-2 rounded-xl border",
                                isHovered ? "bg-zinc-800/80 border-zinc-700/80 shadow-sm" : "bg-transparent border-transparent hover:bg-zinc-800/40",
                                isDimmed && "opacity-40"
                            )}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className={cn("text-zinc-400 truncate font-medium", isHovered && "text-zinc-300")}>{cat}</span>
                            </div>
                            <span className={cn("text-zinc-500 ml-2 shrink-0 font-mono tracking-tight", isHovered && "text-zinc-300")}>
                                {sym}{formatNumber(amount, numberFormat)}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ExpensesAdminView() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("this-month");
    const [searchQuery, setSearchQuery] = useState("");

    const [settings, setSettings] = useState<ExpenseSettings>({
        categories: DEFAULT_CATEGORIES,
        defaultCurrency: "USD",
        monthlyBudget: 0,
        numberFormat: "western",
    });
    const [showSettings, setShowSettings] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [settingsSaving, setSettingsSaving] = useState(false);

    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<string>("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [isRecurring, setIsRecurring] = useState(false);
    const [formError, setFormError] = useState("");

    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [suggestions, setSuggestions] = useState<{ description: string; category: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        fetch("/api/system")
            .then(async (r) => {
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || "Failed to load settings");
                const s = d.data?.expenseSettings;
                if (s) {
                    setSettings({
                        categories: s.categories || DEFAULT_CATEGORIES,
                        defaultCurrency: s.defaultCurrency || "USD",
                        monthlyBudget: s.monthlyBudget || 0,
                        numberFormat: s.numberFormat || "western",
                    });
                    setCategory(s.categories?.[0] || DEFAULT_CATEGORIES[0]);
                } else {
                    setCategory(DEFAULT_CATEGORIES[0]);
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to load settings:", err);
                setCategory(DEFAULT_CATEGORIES[0]);
            });
    }, []);

    const saveSettings = async (updated: ExpenseSettings) => {
        setSettingsSaving(true);
        try {
            const res = await fetch("/api/system", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expenseSettings: updated }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save settings");
            setSettings(updated);
        } catch (err: unknown) {
            console.error("saveSettings failed:", err);
            alert("Failed to save settings. Please try again.");
        } finally {
            setTimeout(() => setSettingsSaving(false), 500);
        }
    };

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (!trimmed || settings.categories.includes(trimmed)) return;
        const updated = { ...settings, categories: [...settings.categories, trimmed] };
        saveSettings(updated);
        setNewCategory("");
    };

    const handleRemoveCategory = (cat: string) => {
        const updated = { ...settings, categories: settings.categories.filter((c) => c !== cat) };
        saveSettings(updated);
    };

    const fetchExpenses = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=expense");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch expenses");
            setExpenses(data.data || []);
        } catch (err: unknown) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    useEffect(() => {
        if (description.length < 2) { setSuggestions([]); return; }
        const matches = expenses
            .filter((e) => e.payload.description.toLowerCase().includes(description.toLowerCase()))
            .reduce<Map<string, string>>((acc, e) => {
                if (!acc.has(e.payload.description)) acc.set(e.payload.description, e.payload.category);
                return acc;
            }, new Map());
        setSuggestions(Array.from(matches.entries()).slice(0, 5).map(([d, c]) => ({ description: d, category: c })));
        setShowSuggestions(matches.size > 0);
    }, [description, expenses]);

    const resetForm = () => {
        setAmount(""); setDescription(""); setCategory(settings.categories[0] || "Other");
        setDate(new Date().toISOString().slice(0, 10)); setIsRecurring(false);
        setEditingId(null); setFormError(""); setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        const payload = {
            amount: parseFloat(amount),
            currency: settings.defaultCurrency,
            description,
            category,
            date: new Date(date).toISOString(),
            is_recurring: isRecurring,
        };

        if (!payload.amount || payload.amount <= 0) { setFormError("Enter a valid amount"); return; }
        if (!description.trim()) { setFormError("Description is required"); return; }

        setIsSubmitting(true);
        try {
            const res = editingId
                ? await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                })
                : await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "expense", is_public: false, payload }),
                });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save expense");

            resetForm();
            await fetchExpenses();

            // Track rich event
            trackEvent({
                module: "expenses",
                action: editingId ? "edit_expense" : "create_expense",
                label: category,
                value: payload.amount,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (exp: Expense) => {
        setAmount(exp.payload.amount.toString());
        setDescription(exp.payload.description);
        setCategory(exp.payload.category);
        setDate(exp.payload.date.slice(0, 10));
        setIsRecurring(exp.payload.is_recurring);
        setEditingId(exp._id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this expense?")) return;
        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchExpenses();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete";
            alert(message);
        } finally {
            setIsDeletingId(null);
        }
    };

    const filtered = useMemo(() => {
        return expenses
            .filter((e) => categoryFilter === "all" || e.payload.category === categoryFilter)
            .filter((e) => {
                if (dateFilter === "all") return true;
                const expDate = new Date(e.payload.date);
                const now = new Date();
                if (dateFilter === "this-month") {
                    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
                }
                if (dateFilter === "last-30") {
                    return expDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }
                return true;
            })
            .filter((e) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                    e.payload.description.toLowerCase().includes(query) ||
                    e.payload.category.toLowerCase().includes(query)
                );
            })
            .sort((a, b) => new Date(b.payload.date).getTime() - new Date(a.payload.date).getTime());
    }, [expenses, categoryFilter, dateFilter, searchQuery]);

    const groupedExpenses = useMemo(() => {
        const groups: Record<string, Expense[]> = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        filtered.forEach(exp => {
            const date = new Date(exp.payload.date);
            let dateLabel = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            if (date.toDateString() === today.toDateString()) {
                dateLabel = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateLabel = 'Yesterday';
            }

            if (!groups[dateLabel]) {
                groups[dateLabel] = [];
            }
            groups[dateLabel].push(exp);
        });
        return groups;
    }, [filtered]);

    const totalFiltered = filtered.reduce((sum, e) => sum + e.payload.amount, 0);
    const currSym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", BRL: "R$" };
    const sym = currSym[settings.defaultCurrency] || settings.defaultCurrency;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-accent" />
                        Expenses
                    </h1>
                    <p className="text-zinc-400 mt-1">Track and master your spending.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSettings(true)}
                        aria-label="Expense settings"
                        title="Expense settings"
                        className="flex items-center justify-center w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-50 hover:border-zinc-700 hover:bg-zinc-800 transition-all shadow-sm"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        aria-label="Add new expense"
                        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" /> Expense
                    </button>
                </div>
            </motion.div>

            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="col-span-1 lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <h2 className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent" /> Spending Overview
                        </h2>
                        <span className="text-sm font-medium px-3 py-1 bg-zinc-800/80 rounded-full text-zinc-300">
                            {DATE_FILTERS.find(f => f.value === dateFilter)?.label}
                        </span>
                    </div>

                    {filtered.length > 0 ? (() => {
                        const catTotals: Record<string, number> = {};
                        filtered.forEach((e) => { catTotals[e.payload.category] = (catTotals[e.payload.category] || 0) + e.payload.amount; });
                        const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
                        return <ExpenseChart data={cats} total={totalFiltered} sym={sym} numberFormat={settings.numberFormat} />;
                    })() : (
                        <div className="h-40 flex flex-col items-center justify-center text-zinc-500">
                            <DollarSign className="w-8 h-8 opacity-20 mb-2" />
                            <p>No expenses data</p>
                        </div>
                    )}
                </motion.div>

                {/* Summary / Budget Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="col-span-1 bg-linear-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 lg:p-8 shadow-2xl flex flex-col relative overflow-hidden"
                >
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Total Spent</h3>
                    <div className="text-4xl lg:text-5xl font-bold text-zinc-50 mb-6 tabular-nums tracking-tight">
                        {sym}{formatNumber(totalFiltered, settings.numberFormat)}
                    </div>

                    <div className="mt-auto space-y-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">Transactions</span>
                            <span className="text-zinc-300 font-medium">{filtered.length}</span>
                        </div>

                        {settings.monthlyBudget > 0 && dateFilter === "this-month" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500">Monthly Budget</span>
                                    <span className={totalFiltered > settings.monthlyBudget ? "text-danger font-semibold" : "text-success font-semibold"}>
                                        {sym}{formatNumber(settings.monthlyBudget, settings.numberFormat)}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden shadow-inner relative">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (totalFiltered / settings.monthlyBudget) * 100)}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn("h-full rounded-full transition-colors", totalFiltered > settings.monthlyBudget ? "bg-danger shadow-[0_0_10px_rgba(var(--danger),0.5)]" : "bg-success shadow-[0_0_10px_rgba(var(--success),0.5)]")}
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 text-right">
                                    {totalFiltered > settings.monthlyBudget ?
                                        `Over budget by ${sym}${formatNumber(totalFiltered - settings.monthlyBudget, settings.numberFormat)}` :
                                        `${sym}${formatNumber(settings.monthlyBudget - totalFiltered, settings.numberFormat)} remaining`}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Filters Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 sticky top-4 z-10 shadow-lg"
            >
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="relative w-full lg:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={searchQuery}
                            aria-label="Search expenses"
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all font-medium"
                        />
                    </div>

                    {/* Date Filters */}
                    <div className="flex bg-zinc-950/50 border border-zinc-800/80 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                        {DATE_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setDateFilter(f.value)}
                                className={cn("relative px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                                    dateFilter === f.value ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {dateFilter === f.value && (
                                    <motion.div layoutId="activeDateFilter" className="absolute inset-0 bg-zinc-800 rounded-lg -z-10 shadow-sm" />
                                )}
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Category Filters inside a scrolling container */}
                    <div className="flex-1 w-full overflow-hidden">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar px-1">
                            <button
                                onClick={() => setCategoryFilter("all")}
                                aria-label="Filter by all categories"
                                className={cn("relative px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0",
                                    categoryFilter === "all" ? "text-white bg-accent shadow-md shadow-accent/20" : "text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white"
                                )}
                            >All Categories</button>
                            {settings.categories.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setCategoryFilter(c)}
                                    aria-label={`Filter by ${c}`}
                                    className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all border shrink-0",
                                        categoryFilter === c ? getCategoryColor(c, settings.categories) : "bg-zinc-800/30 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                    )}
                                >{c}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Expense List Grouped */}
            <div className="space-y-8 min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <motion.div whileHover={{ rotate: 15 }} className="bg-zinc-900/50 p-6 rounded-3xl mb-4">
                            <DollarSign className="w-12 h-12 text-zinc-500" />
                        </motion.div>
                        <p className="text-lg font-medium text-zinc-400">No expenses found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or adding a new expense.</p>
                    </motion.div>
                ) : (
                    Object.entries(groupedExpenses).map(([dateLabel, exps]) => (
                        <motion.div key={dateLabel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-500 px-1 border-b border-white/5 pb-2 sticky top-20 bg-background/80 backdrop-blur z-0 flex items-center">
                                {dateLabel}
                                <span className="ml-3 text-xs font-normal text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/50">
                                    {currSym[settings.defaultCurrency] || settings.defaultCurrency}
                                    {formatNumber(exps.reduce((s, e) => s + e.payload.amount, 0), settings.numberFormat)}
                                </span>
                            </h3>
                            <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                    {exps.map((exp) => (
                                        <motion.div
                                            key={exp._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            whileHover={{ scale: 1.01 }}
                                            className="bg-zinc-900/60 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-2xl p-4 lg:p-5 flex items-center justify-between group shadow-sm hover:shadow-xl transition-all"
                                        >
                                            <div className="flex items-center gap-4 lg:gap-5 flex-1 min-w-0">
                                                <div className={cn("hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 border", getCategoryColor(exp.payload.category, settings.categories))}>
                                                    <Tag className="w-5 h-5 opacity-80" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <p className="text-base font-semibold text-zinc-50 truncate drop-shadow-sm">{exp.payload.description}</p>
                                                        {exp.payload.is_recurring && (
                                                            <span className="inline-flex items-center justify-center bg-accent/10 border border-accent/20 text-accent rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shrink-0">
                                                                Recurring
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md font-medium border sm:hidden", getCategoryColor(exp.payload.category, settings.categories))}>
                                                            {exp.payload.category}
                                                        </span>
                                                        <span className="hidden sm:inline-flex text-sm text-zinc-400 font-medium">
                                                            {exp.payload.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 lg:gap-6 pl-4">
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="text-xl lg:text-2xl font-bold text-zinc-50 tabular-nums tracking-tight">
                                                        {sym}{formatNumber(exp.payload.amount, settings.numberFormat)}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{exp.payload.currency}</p>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(exp)}
                                                            disabled={isDeletingId === exp._id}
                                                            aria-label="Edit expense"
                                                            title="Edit expense"
                                                            className="p-2 text-zinc-400 hover:text-accent hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(exp._id)}
                                                            disabled={isDeletingId === exp._id}
                                                            aria-label="Delete expense"
                                                            title="Delete expense"
                                                            className="p-2 text-zinc-400 hover:text-danger hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {isDeletingId === exp._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Expense Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={resetForm}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-xl">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-50">{editingId ? "Edit Expense" : "New Expense"}</h2>
                                    <p className="text-sm text-zinc-400 mt-0.5">Enter the details below.</p>
                                </div>
                                <button onClick={resetForm} className="p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                                <div className="space-y-4">
                                    {/* Amount Box */}
                                    <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-inner">
                                        <label className="text-xs text-zinc-500 font-medium tracking-widest uppercase mb-2">Amount</label>
                                        <div className="flex items-center justify-center text-5xl font-bold text-zinc-50">
                                            <span className="text-zinc-500 mr-2">{sym}</span>
                                            <input
                                                type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00" autoFocus
                                                aria-label="Expense amount"
                                                className="w-48 bg-transparent text-center focus:outline-none placeholder-zinc-700/50 tabular-nums"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Description */}
                                        <div className="sm:col-span-2 relative">
                                            <label className="block text-xs text-zinc-500 mb-1.5 font-medium ml-1">Description</label>
                                            <input
                                                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                                placeholder="What did you pay for?"
                                                aria-label="Expense description"
                                                className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-sm"
                                            />
                                            <AnimatePresence>
                                                {showSuggestions && (
                                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full mt-2 left-0 right-0 bg-zinc-800/95 backdrop-blur-md border border-zinc-700 rounded-xl overflow-hidden z-20 shadow-2xl py-1">
                                                        {suggestions.map((s, i) => (
                                                            <button
                                                                key={i} type="button"
                                                                onMouseDown={() => { setDescription(s.description); setCategory(s.category); setShowSuggestions(false); }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50 flex justify-between items-center transition-colors border-b border-zinc-700/50 last:border-0"
                                                            >
                                                                <span className="font-medium">{s.description}</span>
                                                                <span className={cn("text-xs px-2 py-0.5 rounded-md border", getCategoryColor(s.category, settings.categories))}>{s.category}</span>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1.5 font-medium ml-1">Category</label>
                                            <div className="relative">
                                                <select
                                                    value={category} onChange={(e) => setCategory(e.target.value)}
                                                    aria-label="Select category"
                                                    className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-4 pr-10 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none shadow-sm transition-all"
                                                >
                                                    {settings.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1.5 font-medium ml-1">Date</label>
                                            <input
                                                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                                                aria-label="Expense date"
                                                className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Recurring switch */}
                                    <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-50">Recurring Expense</p>
                                            <p className="text-xs text-zinc-500 mt-0.5">Mark as a repeating cost</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsRecurring(!isRecurring)}
                                            aria-label="Toggle recurring status"
                                            aria-pressed={isRecurring}
                                            className={cn("w-12 h-6 rounded-full transition-colors relative", isRecurring ? "bg-accent" : "bg-zinc-700")}
                                        >
                                            <motion.div
                                                className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                                                animate={{ left: isRecurring ? '26px' : '2px' }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-between border-t border-zinc-800/60 mt-6">
                                    <span className="text-danger text-sm font-medium">{formError}</span>
                                    <div className="flex gap-3 ml-auto">
                                        <button type="button" onClick={resetForm} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-xl transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            aria-label={editingId ? "Save changes" : "Save expense"}
                                            className="bg-accent hover:bg-accent-hover active:scale-95 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            {isSubmitting ? "Saving..." : (editingId ? "Save Changes" : "Save Expense")}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowSettings(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-xl">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-accent" /> Expense Settings
                                    </h2>
                                    <p className="text-sm text-zinc-400 mt-1">Configure your expense tracking preferences.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <AnimatePresence>
                                        {settingsSaving && (
                                            <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs font-semibold text-accent flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
                                                <Check className="w-3 h-3" /> Saved
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    <button onClick={() => setShowSettings(false)} className="p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Default Currency */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-zinc-300">Default Currency</label>
                                        <div className="relative">
                                            <select
                                                value={settings.defaultCurrency}
                                                aria-label="Default currency"
                                                onChange={(e) => saveSettings({ ...settings, defaultCurrency: e.target.value })}
                                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-4 pr-10 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none shadow-sm transition-all"
                                            >
                                                {CURRENCIES.map((c) => <option key={c} value={c}>{c} ({currSym[c] || c})</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Number Format */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-zinc-300">Number Format</label>
                                        <div className="relative">
                                            <select
                                                value={settings.numberFormat}
                                                aria-label="Number format"
                                                onChange={(e) => saveSettings({ ...settings, numberFormat: e.target.value as "western" | "indian" })}
                                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-4 pr-10 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none shadow-sm transition-all"
                                            >
                                                <option value="western">Western (1,234,567)</option>
                                                <option value="indian">Indian (12,34,567)</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Monthly Budget */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-zinc-300">Monthly Budget Target</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-medium">{sym}</span>
                                            <input
                                                type="number" step="1"
                                                value={settings.monthlyBudget || ""}
                                                aria-label="Monthly budget"
                                                onChange={(e) => saveSettings({ ...settings, monthlyBudget: parseFloat(e.target.value) || 0 })}
                                                placeholder="0 = no limit"
                                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-sm transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500">Set to 0 to disable budget tracking limit.</p>
                                    </div>
                                </div>

                                {/* Categories */}
                                <div className="space-y-3 pt-4 border-t border-zinc-800">
                                    <label className="text-sm font-medium text-zinc-300">Manage Categories</label>

                                    <div className="flex bg-zinc-950/50 border border-zinc-800 rounded-xl p-1.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-accent/40">
                                        <input
                                            type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                                            placeholder="Enter new category name..."
                                            aria-label="New category name"
                                            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none"
                                        />
                                        <button
                                            onClick={handleAddCategory} disabled={!newCategory.trim()}
                                            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-50 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <AnimatePresence>
                                            {settings.categories.map((cat) => (
                                                <motion.span
                                                    key={cat}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-sm text-zinc-300 group shadow-sm transition-all hover:bg-zinc-800 hover:border-zinc-600"
                                                >
                                                    {cat}
                                                    <button
                                                        onClick={() => handleRemoveCategory(cat)}
                                                        className="text-zinc-500 hover:text-danger hover:bg-danger/10 p-0.5 rounded transition-colors"
                                                        title={`Remove ${cat}`}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
