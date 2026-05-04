"use client";

import { useState, useEffect, memo } from "react";
import { Banknote, TrendingUp, TrendingDown, Tag, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { formatCurrency, type NumberFormat } from "@/lib/formatters";

interface ExpenseSummary {
  totalThisMonth: number;
  trend: number;
  topCategory: [string, number] | null;
}

interface ExpenseSettings {
  defaultCurrency: string;
  numberFormat: NumberFormat;
  monthlyBudget: number;
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

export default memo(function ExpensesWidget() {
  const { settings } = useModuleSettings<ExpenseSettings>("expenseSettings", {
    defaultCurrency: "USD",
    numberFormat: "western",
    monthlyBudget: 0,
  });
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const format = settings.numberFormat || "western";

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=expense", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const totalThisMonth = summary?.totalThisMonth ?? 0;
  const trend = summary?.trend ?? 0;
  const topCategory = summary?.topCategory ?? null;
  const budget = settings.monthlyBudget || 0;
  const budgetPercent = budget > 0 ? (totalThisMonth / budget) * 100 : 0;
  const remaining = budget - totalThisMonth;

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
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
              Stable vs last month
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={`${sym}${formatCurrency(totalThisMonth, "", format)}`}
          label="spent this month"
        />

        {budget > 0 ? (
          <WidgetHighlight
            icon={Target}
            text={`${budgetPercent.toFixed(0)}% of budget spent`}
            subtext={
              remaining >= 0
                ? `${sym}${formatCurrency(remaining, "", format)} remaining`
                : `${sym}${formatCurrency(Math.abs(remaining), "", format)} over budget`
            }
            variant={
              budgetPercent > 90
                ? "danger"
                : budgetPercent > 70
                  ? "warning"
                  : "success"
            }
          />
        ) : topCategory ? (
          <WidgetHighlight
            icon={Tag}
            text={topCategory[0]}
            subtext="top spending category"
            variant="accent"
          />
        ) : (
          <WidgetHighlight
            icon={Banknote}
            text="No expenses yet"
            subtext="Track your first spend today"
            variant="default"
          />
        )}
      </div>
    </WidgetCard>
  );
});