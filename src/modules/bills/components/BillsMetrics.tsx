"use client";

import { useMemo } from "react";
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Bill } from "../types";

interface BillsMetricsProps {
  bills: Bill[];
}

export default function BillsMetrics({ bills }: BillsMetricsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastYear = lastMonthDate.getFullYear();

    const currentMonthBills = bills.filter((b) => {
      const d = new Date(b.payload.bill_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthBills = bills.filter((b) => {
      const d = new Date(b.payload.bill_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });

    const currentTotal = currentMonthBills.reduce(
      (sum, b) => sum + (b.payload.amount || 0),
      0,
    );
    const lastTotal = lastMonthBills.reduce(
      (sum, b) => sum + (b.payload.amount || 0),
      0,
    );

    const countTrend =
      lastMonthBills.length === 0
        ? currentMonthBills.length === 0 ? 0 : 100
        : Math.round(
            ((currentMonthBills.length - lastMonthBills.length) /
              lastMonthBills.length) *
              100,
          );
    const amountTrend =
      lastTotal === 0
        ? currentTotal === 0 ? 0 : 100
        : Math.round(((currentTotal - lastTotal) / lastTotal) * 100);

    return {
      totalCount: bills.length,
      currentCount: currentMonthBills.length,
      currentTotal,
      countTrend,
      amountTrend,
    };
  }, [bills]);

  const cards = [
    {
      label: "Total Bills",
      value: stats.totalCount,
      subValue: "lifetime",
      icon: Receipt,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Month Count",
      value: stats.currentCount,
      trend: stats.countTrend,
      icon: FileText,
      color: "text-zinc-400",
      bgColor: "bg-zinc-800/50",
    },
    {
      label: "Month Total",
      value: `₹${stats.currentTotal.toLocaleString()}`,
      trend: stats.amountTrend,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      isMoney: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-5 rounded-3xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                {card.label}
              </p>
              <h3 className="text-2xl font-black text-zinc-100 italic">
                {card.value}
              </h3>
              <div className="mt-2 flex items-center gap-1.5">
                {card.trend !== undefined ? (
                  <>
                    {card.trend >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-danger" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-success" />
                    )}
                    <span
                      className={
                        card.trend >= 0
                          ? "text-[10px] font-bold text-danger"
                          : "text-[10px] font-bold text-success"
                      }
                    >
                      {Math.abs(card.trend)}% {card.trend >= 0 ? "up" : "down"}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      vs last month
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-zinc-600 font-medium">
                    {card.subValue}
                  </span>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-2xl ${card.bgColor} ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>

          {/* Subtle background decoration */}
          <div
            className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.bgColor} blur-3xl opacity-20 pointer-events-none`}
          />
        </motion.div>
      ))}
    </div>
  );
}
