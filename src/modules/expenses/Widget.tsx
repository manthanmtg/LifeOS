"use client";

import { useState, useEffect, memo } from "react";
import { Banknote, Tag, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { formatCurrency, type NumberFormat } from "@/lib/formatters";
import { CURR_SYM } from "./components/types";

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
  const trendLabel =
    trend === 0
      ? "Stable vs last month"
      : `${Math.abs(trend).toFixed(0)}% ${
          trend > 0 ? "more" : "less"
        } than last month`;
  const trendSubtext =
    budget > 0
      ? `${trendLabel} · ${remaining >= 0 ? `${sym}${formatCurrency(remaining, "", format)} remaining` : `${sym}${formatCurrency(Math.abs(remaining), "", format)} over budget`}`
      : topCategory
        ? `${trendLabel} · Top category: ${topCategory[0]}`
        : trendLabel;

  return (
    <WidgetCard
      title="Expenses"
      icon={Banknote}
      loading={loading}
      href="/admin/expenses"
    >
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <WidgetStat
          value={`${sym}${formatCurrency(totalThisMonth, "", format)}`}
          label="spent this month"
        />

        {budget > 0 ? (
          <WidgetHighlight
            icon={Target}
            text={`${budgetPercent.toFixed(0)}% of budget spent`}
            subtext={trendSubtext}
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
            subtext={trendSubtext}
            variant="accent"
          />
        ) : (
          <WidgetHighlight
            icon={Banknote}
            text="No expenses yet"
            subtext={trendSubtext}
            variant="default"
          />
        )}
      </motion.div>
    </WidgetCard>
  );
});
