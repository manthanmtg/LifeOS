"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
  Coffee,
  Home,
  Car,
  Zap,
  Film,
  Cpu,
  Heart,
  Globe,
  Utensils,
  Smartphone,
  CreditCard,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FinanceListSkeleton,
} from "@/components/ui/Skeletons";
import {
  Expense,
  ExpenseSettings,
  formatNumber,
  CURR_SYM,
  getCategoryColor,
} from "./types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Housing: Home,
  Food: Utensils,
  Transportation: Car,
  Utilities: Zap,
  Entertainment: Film,
  "Tech/Recurring": Cpu,
  Health: Heart,
  Shopping: ShoppingBag,
  Education: Globe,
  Travel: Globe,
  Subscriptions: Smartphone,
  Dining: Coffee,
  Other: CreditCard,
};

interface ExpenseListProps {
  expenses: Expense[];
  loading: boolean;
  settings: ExpenseSettings;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  isDeletingId: string | null;
}

export default function ExpenseList({
  expenses,
  loading,
  settings,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
  isDeletingId,
}: ExpenseListProps) {
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const displayExpenses = useMemo(
    () =>
      expenses.map((expense) => ({
        ...expense,
        displayDate: new Date(expense.payload.date).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" },
        ),
      })),
    [expenses],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-black text-zinc-50 tracking-tight">
          Recent Ledger
        </h3>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/40 w-48 group-hover:border-zinc-700 transition-all font-bold"
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        {loading && displayExpenses.length === 0 ? (
          <FinanceListSkeleton length={5} />
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm z-10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-accent animate-spin" />
              </div>
            )}

            <div className="divide-y divide-zinc-800/30">
              <AnimatePresence initial={false} mode="popLayout">
                {displayExpenses.map((expense, idx) => {
                  const isIncome = expense.payload.type === "income";
                  const Icon =
                    CATEGORY_ICONS[expense.payload.category] ||
                    CATEGORY_ICONS.Other;
                  const colorClass = getCategoryColor(
                    expense.payload.category,
                    settings.categories,
                  );

                  return (
                    <motion.div
                      key={expense._id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                      onClick={() => onEdit(expense._id)}
                      className="p-4 hover:bg-zinc-800/40 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative shrink-0 border",
                            isIncome
                              ? "bg-success/5 text-success border-success/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                              : "bg-zinc-950 text-zinc-500 border-zinc-800 group-hover:border-accent/30 group-hover:bg-accent/5 group-hover:text-accent",
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {expense.payload.is_recurring && (
                            <div className="absolute -top-1 -right-1 p-1 bg-accent rounded-full border-2 border-zinc-900 shadow-lg">
                              <RefreshCw className="w-1.5 h-1.5 text-zinc-50" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-sm text-zinc-100 group-hover:text-accent transition-colors truncate tracking-tight">
                            {expense.payload.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border",
                                colorClass,
                              )}
                            >
                              {expense.payload.category}
                            </span>
                            {expense.payload.merchant && (
                              <>
                                <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter truncate">
                                  {expense.payload.merchant}
                                </span>
                              </>
                            )}
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                            <span className="text-[9px] font-bold text-zinc-600 uppercase">
                              {expense.displayDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 ml-4">
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-black text-lg tracking-tighter",
                              isIncome ? "text-success" : "text-zinc-50",
                            )}
                          >
                            {isIncome ? "+" : ""}
                            {sym}
                            {formatNumber(
                              expense.payload.amount,
                              settings.numberFormat,
                            )}
                          </p>
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em]">
                            {expense.payload.account || "UPI"}
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label={`Delete expense ${
                            expense.payload.title ||
                            expense.payload.description ||
                            expense.payload.category ||
                            "entry"
                          }`}
                          onClick={(e) => onDelete(e, expense._id)}
                          disabled={isDeletingId === expense._id}
                          className="p-2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                        >
                          {isDeletingId === expense._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {expenses.length === 0 && !loading && (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Search className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-zinc-500 font-black text-[10px] italic tracking-[0.2em] uppercase">
              Zero transactional footprints found
            </p>
          </div>
        )}

        <button className="w-full py-4 bg-zinc-950/40 hover:bg-zinc-800 text-zinc-500 hover:text-accent text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 border-t border-zinc-800/50 group">
          Expand Temporal Ledger{" "}
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
