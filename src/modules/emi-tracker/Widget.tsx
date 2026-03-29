"use client";

import { useState, useEffect } from "react";
import { Landmark, Clock, AlertTriangle } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { formatNumber, type NumberFormat } from "@/lib/formatters";

interface EmiSettings {
  defaultCurrency: string;
  numberFormat: NumberFormat;
  roundingDecimals: number;
  [key: string]: unknown;
}

interface EmiSummary {
  activeCount: number;
  outstandingByCurrency: Array<{ currency: string; amount: number }>;
  nearest: { title: string; due: string } | null;
}

const NOW_MS = Date.now();

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

export default function EMITrackerWidget() {
  const { settings } = useModuleSettings<EmiSettings>("emiTrackerSettings", {
    defaultCurrency: "INR",
    numberFormat: "indian",
    roundingDecimals: 2,
  });

  const [summary, setSummary] = useState<EmiSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dec = settings.roundingDecimals || 2;
    const cur = settings.defaultCurrency || "INR";
    fetch(
      `/api/widgets/summary?module_type=emi_loan&decimals=${dec}&currency=${cur}`,
    )
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [settings.roundingDecimals, settings.defaultCurrency]);

  const primary = summary?.outstandingByCurrency?.[0];
  const sym = primary
    ? CURR_SYM[primary.currency] || primary.currency
    : CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const amount = primary ? primary.amount : 0;

  const nearestDays = summary?.nearest
    ? Math.ceil(
        (new Date(summary.nearest.due).getTime() - NOW_MS) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const daysLabel = (() => {
    if (nearestDays === null) return "";
    if (nearestDays < 0) return `${Math.abs(nearestDays)}d overdue`;
    if (nearestDays === 0) return "today";
    if (nearestDays === 1) return "tomorrow";
    return `in ${nearestDays}d`;
  })();

  return (
    <WidgetCard
      title="Loans & EMIs"
      icon={Landmark}
      loading={loading}
      href="/admin/emi-tracker"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3 h-3" />
              {summary.activeCount} active loan
              {summary.activeCount !== 1 ? "s" : ""}
            </span>
            {summary.nearest && (
              <span>
                due{" "}
                {new Date(summary.nearest.due).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        )
      }
    >
      {summary && (
        <div className="space-y-3">
          <WidgetStat
            value={`${sym}${formatNumber(amount, settings.numberFormat)}`}
            label="total principal"
          />
          {summary.nearest ? (
            <WidgetHighlight
              icon={nearestDays !== null && nearestDays < 0 ? AlertTriangle : Clock}
              text={summary.nearest.title}
              subtext={daysLabel}
              variant={
                nearestDays !== null && nearestDays < 0
                  ? "danger"
                  : nearestDays !== null && nearestDays <= 3
                    ? "warning"
                    : "default"
              }
            />
          ) : (
            <WidgetHighlight icon={Clock} text="No upcoming EMIs" />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
