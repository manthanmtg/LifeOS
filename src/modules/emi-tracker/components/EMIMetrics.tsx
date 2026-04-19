"use client";

import { Calendar, TrendingDown, Landmark, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { formatMoney, CURR_SYM } from "../lib/emi-utils";
import { EmiLoan, ScheduleRow } from "../types";

interface EMIMetricsProps {
  quickStats: {
    activeCount: number;
    outstandingByCurrency: Array<{ currency: string; amount: number }>;
    nearestDue: { loan: EmiLoan; row: ScheduleRow } | null;
  };
  totalInterestSaved: number;
  currency: string;
  numberFormat: "western" | "indian";
  decimals: number;
}

export default function EMIMetrics({
  quickStats,
  totalInterestSaved,
  currency,
  numberFormat,
  decimals,
}: EMIMetricsProps) {
  const sym = CURR_SYM[currency] || currency;

  const cards = [
    {
      label: "Active Loans",
      value: quickStats.activeCount,
      sub: "Currently tracking",
      icon: CreditCard,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Outstanding Total",
      value:
        quickStats.outstandingByCurrency.length <= 1
          ? quickStats.outstandingByCurrency[0]
            ? formatMoney(
                quickStats.outstandingByCurrency[0].amount,
                CURR_SYM[quickStats.outstandingByCurrency[0].currency] ||
                  quickStats.outstandingByCurrency[0].currency,
                decimals,
                numberFormat,
              )
            : formatMoney(0, sym, decimals)
          : `Mixed (${quickStats.outstandingByCurrency.length})`,
      sub: "Total Principal left",
      icon: Landmark,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Interest Saved",
      value: formatMoney(totalInterestSaved, sym, decimals, numberFormat),
      sub: "Through prepayments",
      icon: TrendingDown,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Nearest Due",
      value: quickStats.nearestDue
        ? quickStats.nearestDue.row.due_date.slice(0, 10)
        : "—",
      sub: quickStats.nearestDue
        ? quickStats.nearestDue.loan.payload.title
        : "No upcoming dues",
      icon: Calendar,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-lg hover:border-zinc-700/80 transition-all"
        >
          <div
            className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}
          >
            <card.icon className="w-16 h-16" />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest leading-none">
              {card.label}
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-zinc-50 tracking-tight">
              {card.value}
            </h3>
            <p className="text-xs text-zinc-500 font-medium italic">
              {card.sub}
            </p>
          </div>

          <div
            className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-${card.color.split("-")[1]}-500/20 to-transparent w-full`}
          />
        </motion.div>
      ))}
    </div>
  );
}
