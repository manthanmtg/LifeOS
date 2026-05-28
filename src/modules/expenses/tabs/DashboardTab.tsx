"use client";

import { useState, useMemo } from "react";
import { Plus, ArrowRight, RefreshCw, Download, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Expense,
  ExpenseSettings,
  CURR_SYM,
  formatNumber,
} from "../components/types";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseMetrics from "../components/ExpenseMetrics";
import ExpenseList from "../components/ExpenseList";

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
  const [viewDate] = useState(() => new Date()); // Stable date for this view session

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
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

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
      budgetUsage:
        settings.monthlyBudget > 0
          ? (expenseThis / settings.monthlyBudget) * 100
          : 0,
      wallets,
    };
  }, [expenses, settings.monthlyBudget, viewDate]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return expenses.slice(0, 15);
    return expenses
      .filter(
        (e) =>
          e.payload.description.toLowerCase().includes(q) ||
          e.payload.merchant?.toLowerCase().includes(q) ||
          e.payload.category.toLowerCase().includes(q) ||
          (e.payload.type || "expense").toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [expenses, searchQuery]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <div className="md:col-span-4 lg:col-span-4">
        <ExpenseMetrics stats={stats} settings={settings} />
      </div>

      <div className="md:col-span-4 lg:col-span-2 space-y-3">
        <motion.button
          onClick={() => setShowForm(true)}
          aria-label="Add new expense entry"
          className="w-full bg-accent hover:bg-accent-hover text-zinc-50 rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-accent/20 transition-all group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-50/20 rounded-xl">
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
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-zinc-50 hover:border-zinc-600 transition-all group"
          >
            <Download className="w-4 h-4 text-zinc-500 group-hover:text-accent transition-colors" />
            <span className="font-black text-[9px] uppercase tracking-widest text-center">
              Export Ledger
            </span>
          </button>

          <button
            onClick={onRefresh}
            aria-label="Sync expenses with cloud"
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-zinc-50 hover:border-zinc-600 transition-all group"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-zinc-500 group-hover:text-success transition-colors",
                loading && "animate-spin",
              )}
            />
            <span className="font-black text-[9px] uppercase tracking-widest text-center">
              Sync Cloud
            </span>
          </button>
        </div>
      </div>

      <div className="md:col-span-4 lg:col-span-4">
        <ExpenseList
          expenses={filtered}
          loading={loading}
          settings={settings}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeletingId={isDeletingId}
        />
      </div>

      <div className="md:col-span-4 lg:col-span-2 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-black text-zinc-50 uppercase tracking-[0.2em] flex items-center gap-2">
              <Wallet className="w-3 h-3 text-accent" /> Account Dynamics
            </h4>
            <div className="px-2 py-0.5 bg-zinc-800 rounded-lg text-[8px] font-black text-zinc-500 uppercase">
              Net Monthly
            </div>
          </div>
          <div className="space-y-2.5">
            {stats.wallets.map((wallet) => (
              <div
                key={wallet.name}
                className="flex items-center justify-between p-3.5 bg-zinc-950/40 border border-zinc-800/50 rounded-2xl group transition-all hover:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                      wallet.name.includes("Credit")
                        ? "bg-warning"
                        : wallet.total >= 0
                          ? "bg-success"
                          : "bg-danger",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-50 transition-colors">
                      {wallet.name}
                    </span>
                    <div className="flex items-center gap-2 opacity-30 text-[8px] font-black uppercase">
                      <span className="text-success">
                        In: {formatNumber(wallet.income, settings.numberFormat)}
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
                    wallet.total >= 0
                      ? "text-success"
                      : "text-zinc-50 opacity-80",
                  )}
                >
                  {wallet.total >= 0 ? "+" : "-"}
                  {CURR_SYM[settings.defaultCurrency] ||
                    settings.defaultCurrency}
                  {formatNumber(Math.abs(wallet.total), settings.numberFormat)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
          <h4 className="text-[10px] font-black text-zinc-50 uppercase tracking-[0.2em] mb-4 text-center">
            Neural Filters
          </h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Income", "Expense", "Food", "Housing", "Travel", "Tech"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat)}
                  aria-label={`Filter by ${cat}`}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border",
                    searchQuery === cat
                      ? "bg-accent text-zinc-50 border-accent shadow-lg shadow-accent/20"
                      : "bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:text-zinc-50 hover:border-zinc-700",
                  )}
                >
                  {cat}
                </button>
              ),
            )}
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear filters"
              className="px-3 py-2 bg-zinc-950/20 border border-zinc-800 rounded-xl text-[9px] font-bold text-zinc-600 hover:text-zinc-400 transition-all uppercase tracking-widest"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

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
