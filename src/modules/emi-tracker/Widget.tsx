"use client";

import { useState, useEffect } from "react";
import { Landmark, TrendingDown, Clock, AlertTriangle } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
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

const NOW_REFERENCE = Date.now();
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

  const nearestDays = summary?.nearest
    ? Math.ceil(
        (new Date(summary.nearest.due).getTime() - NOW_REFERENCE) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <WidgetCard
      title="Loans & EMIs"
      icon={Landmark}
      loading={loading}
      href="/admin/emi-tracker"
      footer={
        summary && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {summary.activeCount} active loan
            {summary.activeCount !== 1 ? "s" : ""}
          </div>
        )
      }
    >
      {summary && (
        <div className="py-2 flex flex-col h-full space-y-4">
          <div className="flex-1 space-y-4">
            {summary.outstandingByCurrency.length > 0 ? (
              summary.outstandingByCurrency.map((os) => {
                const sym = CURR_SYM[os.currency] || os.currency;
                return (
                  <div key={os.currency}>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">
                      <span className="text-zinc-500 mr-1 text-2xl font-medium">
                        {sym}
                      </span>
                      {formatNumber(os.amount, settings.numberFormat)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-accent" />
                      Total outstanding principal
                    </p>
                  </div>
                );
              })
            ) : (
              <div>
                <p className="text-4xl font-bold text-zinc-50 tracking-tight">
                  <span className="text-zinc-500 mr-1 text-2xl font-medium">
                    {CURR_SYM[settings.defaultCurrency] ||
                      settings.defaultCurrency}
                  </span>
                  0
                </p>
                <p className="text-xs text-zinc-500 mt-1 font-medium flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-zinc-600" />
                  Debt free
                </p>
              </div>
            )}
          </div>

          {summary.nearest && nearestDays !== null && (
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                  Next EMI Due
                </p>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1",
                    nearestDays < 0
                      ? "text-danger"
                      : nearestDays <= 3
                        ? "text-warning"
                        : "text-zinc-400",
                  )}
                >
                  {nearestDays < 0 && <AlertTriangle className="w-3 h-3" />}
                  {nearestDays < 0
                    ? `${Math.abs(nearestDays)}d overdue`
                    : nearestDays === 0
                      ? "today"
                      : nearestDays === 1
                        ? "tomorrow"
                        : `in ${nearestDays}d`}
                </span>
              </div>
              <p className="text-[13px] text-zinc-300 font-medium line-clamp-1">
                {summary.nearest.title}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                <Clock className="w-3 h-3" />
                {new Date(summary.nearest.due).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
