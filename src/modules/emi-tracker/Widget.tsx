"use client";

import { useState, useEffect } from "react";
import { Landmark, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
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
  const { settings } = useModuleSettings<EmiSettings>("emi-tracker", {
    defaultCurrency: "INR",
    numberFormat: "indian",
    roundingDecimals: 2,
  });

  const [summary, setSummary] = useState<EmiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    const dec = settings.roundingDecimals || 2;
    const cur = settings.defaultCurrency || "INR";
    fetch(
      `/api/widgets/summary?module_type=emi_loan&decimals=${dec}&currency=${cur}`,
    )
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, [settings.roundingDecimals, settings.defaultCurrency]);

  const primary = summary?.outstandingByCurrency?.[0];
  const sym = primary
    ? CURR_SYM[primary.currency] || primary.currency
    : CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
  const amount = primary ? primary.amount : 0;

  const nearestDays = summary?.nearest
    ? Math.ceil(
        (new Date(summary.nearest.due).getTime() - nowMs) /
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
      title="EMI Tracker"
      icon={Landmark}
      loading={loading}
      href="/admin/emi-tracker"
    >
      {loading ? null : hasError || !summary ? (
        <WidgetHighlight
          icon={AlertTriangle}
          text="Unable to load loans summary"
          subtext="Please refresh to retry"
          variant="warning"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <WidgetStat
            value={`${sym}${formatNumber(amount, settings.numberFormat)}`}
            label="balance left"
          />
          {summary.nearest ? (
            <WidgetHighlight
              icon={
                nearestDays !== null && nearestDays < 0 ? AlertTriangle : Clock
              }
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
            <WidgetHighlight
              icon={Landmark}
              text="No active loans"
              subtext="Add a loan or EMI to track"
              variant="accent"
            />
          )}
        </motion.div>
      )}
    </WidgetCard>
  );
}
