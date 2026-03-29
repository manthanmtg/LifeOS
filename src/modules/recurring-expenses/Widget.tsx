"use client";

import { useState, useEffect } from "react";
import { Sparkles, Timer } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { formatNumber, type NumberFormat } from "@/lib/formatters";

interface RecurringExpenseSettings {
  defaultCurrency: string;
  enableReminders: boolean;
  numberFormat: NumberFormat;
  [key: string]: unknown;
}

interface RecurringSummary {
  activeCount: number;
  totalBurn: number;
  overdueCount: number;
  dueSoonCount: number;
  nextRenewal: { name: string; next_renewal_date: string } | null;
  daysUntilNext: number | null;
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

export default function RecurringExpensesWidget() {
  const { settings } = useModuleSettings<RecurringExpenseSettings>(
    "recurringExpenseSettings",
    { defaultCurrency: "USD", enableReminders: true, numberFormat: "western" },
  );

  const [summary, setSummary] = useState<RecurringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const format = settings.numberFormat || "western";

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=recurring_expense", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const daysLabel = (() => {
    if (!summary?.nextRenewal || summary.daysUntilNext === null) return "";
    if (summary.daysUntilNext < 0) return "overdue";
    if (summary.daysUntilNext === 0) return "today";
    if (summary.daysUntilNext === 1) return "tomorrow";
    return `in ${summary.daysUntilNext}d`;
  })();

  return (
    <WidgetCard
      title="Subscriptions"
      icon={Sparkles}
      loading={loading}
      href="/admin/recurring-expenses"
      footer={
        summary && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <span
              className={cn(
                summary.overdueCount > 0 ? "text-danger" : "text-zinc-500",
              )}
            >
              {summary.overdueCount} overdue
            </span>
            <span className="text-zinc-800">·</span>
            <span
              className={cn(
                summary.dueSoonCount > 0 ? "text-warning" : "text-zinc-500",
              )}
            >
              {summary.dueSoonCount} due soon
            </span>
          </div>
        )
      }
    >
      {summary && (
        <div className="space-y-3">
          <WidgetStat
            value={`${sym}${formatNumber(summary.totalBurn, format)}`}
            label={`monthly · ${summary.activeCount} active`}
          />
          {summary.nextRenewal ? (
            <WidgetHighlight
              icon={Timer}
              text={summary.nextRenewal.name}
              subtext={daysLabel}
              variant={
                summary.daysUntilNext !== null && summary.daysUntilNext < 3
                  ? "danger"
                  : "default"
              }
            />
          ) : (
            <WidgetHighlight icon={Timer} text="No upcoming renewals" />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
