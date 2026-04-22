"use client";

import { useState, useEffect, useMemo } from "react";
import { Banknote, TrendingUp, TrendingDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { formatCurrency, type NumberFormat } from "@/lib/formatters";

interface Expense {
  payload: { amount: number; category: string; date: string };
}

interface ExpenseSettings {
  defaultCurrency: string;
  numberFormat: NumberFormat;
  [key: string]: unknown;
}

const CURR_SYM: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  BRL: "R$",
};

export default function ExpensesWidget() {
  const { settings } = useModuleSettings<ExpenseSettings>("expenseSettings", {
    defaultCurrency: "USD",
    numberFormat: "western",
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const format = settings.numberFormat || "western";

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/content?module_type=expense", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setExpenses(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const { totalThisMonth, trend, topCategory } = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.payload.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const lastMonth = expenses.filter((e) => {
      const d = new Date(e.payload.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    });

    const ttm = thisMonth.reduce((s, e) => s + e.payload.amount, 0);
    const tlm = lastMonth.reduce((s, e) => s + e.payload.amount, 0);
    const t = tlm > 0 ? ((ttm - tlm) / tlm) * 100 : 0;

    const categoryTotals = thisMonth.reduce<Record<string, number>>(
      (acc, e) => {
        acc[e.payload.category] =
          (acc[e.payload.category] || 0) + e.payload.amount;
        return acc;
      },
      {},
    );
    const tc = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return { totalThisMonth: ttm, trend: t, topCategory: tc };
  }, [expenses]);

  return (
    <WidgetCard
      title="Expenses"
      icon={Banknote}
      loading={loading}
      href="/admin/expenses"
      footer={
        <div className="flex items-center justify-between">
          {trend !== 0 ? (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                trend > 0 ? "text-danger" : "text-success",
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend).toFixed(0)}% vs last month
            </span>
          ) : (
            <div />
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={`${sym}${formatCurrency(totalThisMonth, "", format)}`}
          label="spent this month"
        />
        {topCategory && (
          <WidgetHighlight
            icon={Tag}
            text={topCategory[0]}
            subtext="top category"
            variant="accent"
          />
        )}
      </div>
    </WidgetCard>
  );
}
