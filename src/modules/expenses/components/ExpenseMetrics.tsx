"use client";

import { motion } from "framer-motion";
import { Scale, TrendingDown, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpenseSettings, formatNumber, CURR_SYM } from "./types";

interface WalletData {
  name: string;
  total: number;
  income: number;
  expense: number;
}

interface ExpenseMetricsProps {
  stats: {
    incomeThis: number;
    expenseThis: number;
    netThis: number;
    expenseTrend: number;
    netTrend: number;
    budgetUsage: number;
    wallets: WalletData[];
  };
  settings: ExpenseSettings;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min;
  const width = 100;
  const height = 30;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / (range || 1)) * height,
  }));

  const pathData = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    </svg>
  );
}

export default function ExpenseMetrics({
  stats,
  settings,
}: ExpenseMetricsProps) {
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {/* Net Flow */}
      <motion.div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group"
        whileHover={{ y: -2 }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <Scale className="w-16 h-16 text-accent" />
        </div>

        <div className="relative z-10">
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
            Net Flow
          </p>
          <h2
            className={cn(
              "text-3xl font-black tracking-tighter",
              stats.netThis >= 0 ? "text-success" : "text-danger",
            )}
          >
            {stats.netThis < 0 ? "-" : "+"}
            {sym}
            {formatNumber(Math.abs(stats.netThis), settings.numberFormat)}
          </h2>

          <div className="mt-2 h-8 flex items-end">
            <Sparkline
              data={[
                stats.netThis * 0.8,
                stats.netThis * 0.9,
                stats.netThis * 1.1,
                stats.netThis,
              ]}
              color={
                stats.netThis >= 0
                  ? "var(--color-success)"
                  : "var(--color-danger)"
              }
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 relative z-10">
          <div
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1",
              stats.netTrend >= 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger",
            )}
          >
            {stats.netTrend >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(stats.netTrend).toFixed(0)}%
          </div>
          <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider">
            vs Last Mo
          </span>
        </div>
      </motion.div>

      {/* Total Spending */}
      <motion.div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group"
        whileHover={{ y: -2 }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <TrendingDown className="w-16 h-16 text-danger" />
        </div>

        <div className="relative z-10">
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
            Outflow
          </p>
          <h2 className="text-3xl font-black text-zinc-50 tracking-tighter">
            {sym}
            {formatNumber(stats.expenseThis, settings.numberFormat)}
          </h2>

          <div className="mt-2 h-8 flex items-end">
            <Sparkline
              data={[
                stats.expenseThis * 1.2,
                stats.expenseThis * 1.1,
                stats.expenseThis * 1.05,
                stats.expenseThis,
              ]}
              color="var(--color-danger)"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-zinc-500 relative z-10">
          <span
            className={stats.expenseTrend > 0 ? "text-danger" : "text-success"}
          >
            {stats.expenseTrend > 0 ? "↑" : "↓"}{" "}
            {Math.abs(stats.expenseTrend).toFixed(0)}%
          </span>
          <span className="opacity-50 tracking-widest uppercase italic font-black">
            Financial Pressure
          </span>
        </div>
      </motion.div>

      {/* Budget Status */}
      <motion.div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col relative overflow-hidden group"
        whileHover={{ y: -2 }}
      >
        <div className="flex justify-between items-start mb-4">
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em]">
            Budget Plan
          </p>
          <CreditCard className="w-4 h-4 text-zinc-700" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <span className="text-3xl font-black text-zinc-50">
              {stats.budgetUsage.toFixed(0)}%
            </span>
            <span className="text-[9px] text-zinc-600 font-bold tracking-wider uppercase">
              {formatNumber(settings.monthlyBudget, settings.numberFormat)} Cap
            </span>
          </div>
          <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 shadow-inner border border-zinc-800/50">
            <motion.div
              className={cn(
                "h-full rounded-full shadow-lg relative overflow-hidden",
                stats.budgetUsage > 100
                  ? "bg-danger"
                  : stats.budgetUsage > 85
                    ? "bg-warning"
                    : "bg-accent",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(stats.budgetUsage, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

        <p className="mt-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
          {stats.budgetUsage > 100
            ? "CRITICAL: OVER LIMIT"
            : stats.budgetUsage > 85
              ? "WARNING: LIMIT NEAR"
              : "STABLE: WITHIN PLAN"}
        </p>
      </motion.div>
    </div>
  );
}
