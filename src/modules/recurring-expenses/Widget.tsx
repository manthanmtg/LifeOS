"use client";

import { useState, useEffect } from "react";
import { Sparkles, Timer } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
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
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=recurring_expense", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <WidgetCard
      title="Subscriptions"
      icon={Sparkles}
      loading={loading}
      href="/admin/recurring-expenses"
      footer={
        summary && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <span
              className={cn(
                "flex items-center gap-1",
                summary.overdueCount > 0 ? "text-danger" : "text-zinc-500",
              )}
            >
              {summary.overdueCount} Overdue
            </span>
            <span className="text-zinc-800">•</span>
            <span
              className={cn(
                "flex items-center gap-1",
                summary.dueSoonCount > 0 ? "text-warning" : "text-zinc-500",
              )}
            >
              {summary.dueSoonCount} Due Soon
            </span>
          </div>
        )
      }
    >
      {summary && (
        <div className="py-2 space-y-4">
          <div>
            <p className="text-4xl font-bold text-zinc-50 tracking-tight">
              <span className="text-zinc-500 mr-1 text-2xl font-medium">
                {sym}
              </span>
              {formatNumber(summary.totalBurn, format)}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              monthly projection · {summary.activeCount} active expenses
            </p>
          </div>

          {settings.enableReminders && summary.nextRenewal && (
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                  Next Renewal
                </p>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    summary.daysUntilNext !== null && summary.daysUntilNext < 3
                      ? "text-danger"
                      : "text-zinc-400",
                  )}
                >
                  {summary.daysUntilNext !== null && summary.daysUntilNext < 0
                    ? `overdue`
                    : summary.daysUntilNext === 0
                      ? "today"
                      : summary.daysUntilNext === 1
                        ? "tomorrow"
                        : `in ${summary.daysUntilNext}d`}
                </span>
              </div>
              <p className="text-[13px] text-zinc-300 font-medium line-clamp-1">
                {summary.nextRenewal.name}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1 uppercase font-bold tracking-wider">
                <Timer className="w-3 h-3" />
                {new Date(
                  summary.nextRenewal.next_renewal_date,
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
