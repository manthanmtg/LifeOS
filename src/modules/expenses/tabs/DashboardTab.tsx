"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  CreditCard,
  ArrowRight,
  Trash2,
  RefreshCw,
  Download,
  Wallet,
  TrendingDown,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Expense,
  ExpenseSettings,
  CURR_SYM,
  formatNumber,
} from "../components/types";
import ExpenseForm from "../components/ExpenseForm";

interface DashboardTabProps {
  expenses: Expense[];
  loading: boolean;
  settings: ExpenseSettings;
  onRefresh: () => void;
  onUpdateSettings: (settings: Partial<ExpenseSettings>) => void;
}

export default function DashboardTab({
  expenses,
  loading,
  settings,
  onRefresh,
}: Omit<DashboardTabProps, "onUpdateSettings">) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this entry?")) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onRefresh();
    } catch {
      alert("Failed to delete");
    } finally {
      setIsDeletingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Description",
      "Merchant",
      "Amount",
      "Currency",
      "Category",
      "Account",
      "Tags",
    ];
    const rows = expenses.map((e) => [
      new Date(e.payload.date).toLocaleDateString(),
      e.payload.type || "expense",
      e.payload.description,
      e.payload.merchant || "",
      e.payload.amount,
      e.payload.currency,
      e.payload.category,
      e.payload.account || "UPI",
      (e.payload.tags || []).join("; "),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `finance_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.payload.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lm = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = expenses.filter((e) => {
      const d = new Date(e.payload.date);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    });

    const incomeThis = thisMonth
      .filter((e) => e.payload.type === "income")
      .reduce((sum, e) => sum + e.payload.amount, 0);
    const expenseThis = thisMonth
      .filter((e) => (e.payload.type || "expense") === "expense")
      .reduce((sum, e) => sum + e.payload.amount, 0);

    const incomeLast = lastMonth
      .filter((e) => e.payload.type === "income")
      .reduce((sum, e) => sum + e.payload.amount, 0);
    const expenseLast = lastMonth
      .filter((e) => (e.payload.type || "expense") === "expense")
      .reduce((sum, e) => sum + e.payload.amount, 0);

    const netThis = incomeThis - expenseThis;
    const netLast = incomeLast - expenseLast;

    const expenseTrend =
      expenseLast === 0 ? 0 : ((expenseThis - expenseLast) / expenseLast) * 100;
    const netTrend =
      netLast === 0 ? 0 : ((netThis - netLast) / Math.abs(netLast)) * 100;

    // Actual wallet calculations (Net cash flow per account)
    const walletList = [
      "UPI",
      "Credit Card",
      "Debit Card",
      "Bank Transfer",
      "Cash",
      "Other",
    ];
    const wallets = walletList
      .map((w) => {
        const income = thisMonth
          .filter(
            (e) =>
              (e.payload.account || "UPI") === w && e.payload.type === "income",
          )
          .reduce((sum, e) => sum + e.payload.amount, 0);
        const expense = thisMonth
          .filter(
            (e) =>
              (e.payload.account || "UPI") === w &&
              (e.payload.type || "expense") === "expense",
          )
          .reduce((sum, e) => sum + e.payload.amount, 0);
        return { name: w, total: income - expense, income, expense };
      })
      .filter(
        (w) =>
          Math.abs(w.total) > 0 || w.name === "UPI" || w.name === "Credit Card",
      );

    return {
      incomeThis,
      expenseThis,
      netThis,
      expenseTrend,
      netTrend,
      count: thisMonth.length,
      budgetUsage:
        settings.monthlyBudget > 0
          ? (expenseThis / settings.monthlyBudget) * 100
          : 0,
      wallets,
    };
  }, [expenses, settings.monthlyBudget]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return expenses.slice(0, 12);
    const q = searchQuery.toLowerCase();
    return expenses
      .filter(
        (e) =>
          e.payload.description.toLowerCase().includes(q) ||
          e.payload.merchant?.toLowerCase().includes(q) ||
          e.payload.category.toLowerCase().includes(q) ||
          (e.payload.type || "expense").toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [expenses, searchQuery]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {/* Metrics Row */}
      <div className="md:col-span-4 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Net Flow */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group"
          whileHover={{ y: -2 }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Scale className="w-16 h-16 text-accent" />
          </div>
          <div>
            <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
              Net Flow
            </p>
            <h2
              className={cn(
                "text-3xl font-black tracking-tighter",
                stats.netThis >= 0 ? "text-success" : "text-danger",
              )}
            >
              {stats.netThis < 0 ? "-" : "+"}
              {sym}
              {formatNumber(Math.abs(stats.netThis), settings.numberFormat)}
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div
              className={cn(
                "px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1",
                stats.netTrend >= 0
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {stats.netTrend >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(stats.netTrend).toFixed(0)}%
            </div>
            <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider">
              vs Last Mo
            </span>
          </div>
        </motion.div>

        {/* Total Spending */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group"
          whileHover={{ y: -2 }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-16 h-16 text-danger" />
          </div>
          <div>
            <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
              Outflow
            </p>
            <h2 className="text-3xl font-black text-white tracking-tighter">
              {sym}
              {formatNumber(stats.expenseThis, settings.numberFormat)}
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-zinc-500">
            <span
              className={
                stats.expenseTrend > 0 ? "text-danger" : "text-success"
              }
            >
              {stats.expenseTrend > 0 ? "↑" : "↓"}{" "}
              {Math.abs(stats.expenseTrend).toFixed(0)}%
            </span>
            <span className="opacity-50 tracking-widest uppercase italic">
              Intensity
            </span>
          </div>
        </motion.div>

        {/* Budget Status */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col relative overflow-hidden group"
          whileHover={{ y: -2 }}
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em]">
              Budget Plan
            </p>
            <CreditCard className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-black text-white">
                {stats.budgetUsage.toFixed(0)}%
              </span>
              <span className="text-[9px] text-zinc-600 font-bold tracking-wider uppercase">
                {formatNumber(settings.monthlyBudget, settings.numberFormat)}{" "}
                Cap
              </span>
            </div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 shadow-inner">
              <motion.div
                className={cn(
                  "h-full rounded-full shadow-lg",
                  stats.budgetUsage > 100
                    ? "bg-danger"
                    : stats.budgetUsage > 85
                      ? "bg-warning"
                      : "bg-accent",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.budgetUsage, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Primary Actions (Right Sidebar Top) */}
      <div className="md:col-span-4 lg:col-span-2 space-y-3">
        <motion.button
          onClick={() => setShowForm(true)}
          className="w-full bg-accent hover:bg-accent-hover text-white rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-accent/20 transition-all group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <span className="font-black text-xs uppercase tracking-[0.1em]">
              Master Entry
            </span>
          </div>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </motion.button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportToCSV}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all group"
          >
            <Download className="w-4 h-4 text-zinc-500 group-hover:text-accent transition-colors" />
            <span className="font-black text-[9px] uppercase tracking-widest">
              Export CSV
            </span>
          </button>

          <button
            onClick={onRefresh}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all group"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-zinc-500 group-hover:text-success transition-colors",
                loading && "animate-spin",
              )}
            />
            <span className="font-black text-[9px] uppercase tracking-widest">
              Refresh
            </span>
          </button>
        </div>
      </div>

      {/* Main List Area */}
      <div className="md:col-span-4 lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-white tracking-tight">
            Recent Ledger
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/40 w-48 transition-all"
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
          {loading && (
            <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            </div>
          )}
          <div className="divide-y divide-zinc-800/30">
            <AnimatePresence initial={false}>
              {filtered.map((expense, idx) => {
                const isIncome = expense.payload.type === "income";
                return (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    onClick={() => handleEdit(expense._id)}
                    className="p-4 hover:bg-zinc-800/40 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors relative shrink-0 border",
                          isIncome
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700/30 group-hover:bg-accent/10 group-hover:text-accent",
                        )}
                      >
                        <span className="font-black text-base italic uppercase opacity-60">
                          {expense.payload.merchant?.[0] ||
                            expense.payload.description[0]}
                        </span>
                        {expense.payload.is_recurring && (
                          <div className="absolute -top-1 -right-1 p-1 bg-accent rounded-full border-2 border-zinc-900 shadow-sm">
                            <RefreshCw className="w-1.5 h-1.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white group-hover:text-accent transition-colors truncate">
                          {expense.payload.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-1.5 rounded bg-zinc-950 border border-zinc-800",
                              isIncome
                                ? "text-success border-success/20"
                                : "text-zinc-600",
                            )}
                          >
                            {expense.payload.category}
                          </span>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                          <span className="text-[9px] font-bold text-zinc-600">
                            {new Date(expense.payload.date).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-black text-base tracking-tighter",
                            isIncome ? "text-success" : "text-white",
                          )}
                        >
                          {isIncome ? "+" : ""}
                          {sym}
                          {formatNumber(
                            expense.payload.amount,
                            settings.numberFormat,
                          )}
                        </p>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                          {expense.payload.account || "UPI"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, expense._id)}
                        disabled={isDeletingId === expense._id}
                        className="p-2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                      >
                        {isDeletingId === expense._id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {filtered.length === 0 && !loading && (
            <div className="p-12 text-center">
              <p className="text-zinc-600 font-bold text-xs italic tracking-widest uppercase">
                Zero footprints found
              </p>
            </div>
          )}
          <button className="w-full py-3 bg-zinc-950/20 hover:bg-zinc-800/80 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-t border-zinc-800/30">
            Expand Infinity Ledger <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Info Sidebar */}
      <div className="md:col-span-4 lg:col-span-2 space-y-6">
        {/* Wallet Card - Net Flow per Account */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Wallet className="w-3 h-3 text-accent" /> Account Dynamics
            </h4>
            <div className="px-2 py-0.5 bg-zinc-800 rounded-lg text-[8px] font-black text-zinc-500 uppercase">
              Net Monthly
            </div>
          </div>
          <div className="space-y-2.5">
            {stats.wallets.map((wallet) => {
              const isPositive = wallet.total >= 0;
              return (
                <div
                  key={wallet.name}
                  className="flex items-center justify-between p-3.5 bg-zinc-950/40 border border-zinc-800/50 rounded-2xl group transition-all hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                        wallet.name.includes("Credit")
                          ? "bg-orange-500"
                          : isPositive
                            ? "bg-success"
                            : "bg-danger",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                        {wallet.name}
                      </span>
                      <div className="flex items-center gap-2 opacity-30 text-[8px] font-black uppercase">
                        <span className="text-success">
                          In:{" "}
                          {formatNumber(wallet.income, settings.numberFormat)}
                        </span>
                        <span className="text-danger">
                          Out:{" "}
                          {formatNumber(wallet.expense, settings.numberFormat)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-black tracking-tighter italic",
                      isPositive ? "text-success" : "text-white opacity-80",
                    )}
                  >
                    {isPositive ? "+" : "-"}
                    {sym}
                    {formatNumber(
                      Math.abs(wallet.total),
                      settings.numberFormat,
                    )}
                  </span>
                </div>
              );
            })}
            {stats.wallets.length === 0 && (
              <p className="text-center py-4 text-[10px] font-bold text-zinc-600 italic">
                No activity recorded
              </p>
            )}
          </div>
        </div>

        {/* Mini Map / Fast Filters */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-4">
            Neural Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {["Income", "Expense", "Food", "Housing", "Travel", "Tech"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                    searchQuery === cat
                      ? "bg-accent text-white"
                      : "bg-zinc-800/50 border border-zinc-700/30 text-zinc-500 hover:text-white hover:border-zinc-500",
                  )}
                >
                  {cat}
                </button>
              ),
            )}
            <button
              onClick={() => setSearchQuery("")}
              className="px-3 py-1.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Expense Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ExpenseForm
            expenses={expenses}
            settings={settings}
            editingId={editingId}
            onClose={() => {
              setShowForm(false);
              setEditingId(null);
            }}
            onSave={onRefresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
