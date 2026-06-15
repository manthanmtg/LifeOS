"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Sparkles, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { useModuleSettings } from "@/hooks/useModuleSettings";
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
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const format = settings.numberFormat || "western";

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=recurring_expense", {
      signal: ac.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`summary request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((d) => {
        setSummary(d.data || null);
        setSummaryError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setSummary(null);
        setSummaryError(
          error instanceof Error ? error.message : "Unable to load summary",
        );
      })
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
  const totalBurn = summary?.totalBurn ?? 0;
  const overdueCount = summary?.overdueCount ?? 0;
  const dueSoonCount = summary?.dueSoonCount ?? 0;
  const summaryLabel = summary?.activeCount
    ? `${summary.activeCount} active`
    : "no active subscriptions";

  const detail = summaryError
    ? {
        icon: AlertTriangle,
        text: "Summary unavailable",
        subtext: "Please retry from dashboard",
        variant: "danger" as const,
      }
    : summary?.nextRenewal
      ? {
          icon: Timer,
          text: summary.nextRenewal.name,
          subtext: `${daysLabel || "upcoming"} · ${overdueCount} overdue · ${dueSoonCount} due soon`,
          variant:
            summary.daysUntilNext !== null && summary.daysUntilNext < 3
              ? ("danger" as const)
              : overdueCount > 0
                ? ("warning" as const)
                : ("default" as const),
        }
      : {
          icon: Timer,
          text: "No upcoming renewals",
          subtext: `${summary?.activeCount ?? 0} active subscriptions`,
          variant: "default" as const,
        };

  return (
    <WidgetCard
      title="Subscriptions"
      icon={Sparkles}
      loading={loading}
      href="/admin/recurring-expenses"
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="space-y-3"
      >
        <WidgetStat
          value={
            summaryError
              ? "—"
              : `${sym}${formatNumber(totalBurn, format)}`
          }
          label={`monthly · ${summaryLabel}`}
        />
        <WidgetHighlight
          icon={detail.icon}
          text={detail.text}
          subtext={detail.subtext}
          variant={detail.variant}
        />
      </motion.div>
    </WidgetCard>
  );
}
