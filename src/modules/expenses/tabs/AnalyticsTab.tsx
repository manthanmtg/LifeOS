"use client";

import { useState, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Tag,
  Layers,
  TrendingUp,
  Download,
  ArrowUpRight,
  TrendingDown,
  Target,
  Zap,
  Scale,
} from "lucide-react";
import {
  Expense,
  formatNumber,
  AnalyticsTabProps,
  CURR_SYM,
} from "../components/types";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#eab308",
  "#ec4899",
  "#06b6d4",
  "#22c55e",
  "#f43f5e",
  "#6366f1",
  "#14b8a6",
];

const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#f43f5e";

export default function AnalyticsTab({
  expenses,
  settings,
}: AnalyticsTabProps) {
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "categories" | "tags"
  >("overview");
  const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;

  const annualStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(parseInt(selectedYear), i, 1);
      return {
        name: date.toLocaleString("default", { month: "short" }),
        income: 0,
        expense: 0,
        net: 0,
      };
    });

    expenses.forEach((e: Expense) => {
      const d = new Date(e.payload.date);
      if (d.getFullYear().toString() === selectedYear) {
        const type = e.payload.type || "expense";
        if (type === "income") {
          months[d.getMonth()].income += e.payload.amount;
        } else {
          months[d.getMonth()].expense += e.payload.amount;
        }
      }
    });

    months.forEach((m) => {
      m.net = m.income - m.expense;
    });

    return months;
  }, [expenses, selectedYear]);

  const summary = useMemo(() => {
    const totalIncome = annualStats.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = annualStats.reduce((sum, m) => sum + m.expense, 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
    };
  }, [annualStats]);

  const categoryData = useMemo(() => {
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};

    expenses.forEach((e: Expense) => {
      const d = new Date(e.payload.date);
      if (d.getFullYear().toString() === selectedYear) {
        const type = e.payload.type || "expense";
        if (type === "income") {
          incomeCats[e.payload.category] =
            (incomeCats[e.payload.category] || 0) + e.payload.amount;
        } else {
          expenseCats[e.payload.category] =
            (expenseCats[e.payload.category] || 0) + e.payload.amount;
        }
      }
    });

    const mapFn = ([name, value]: [string, number]) => ({ name, value });

    return {
      income: Object.entries(incomeCats)
        .map(mapFn)
        .sort((a, b) => b.value - a.value),
      expense: Object.entries(expenseCats)
        .map(mapFn)
        .sort((a, b) => b.value - a.value),
    };
  }, [expenses, selectedYear]);

  const tagData = useMemo(() => {
    const tags: Record<string, { income: number; expense: number }> = {};
    expenses.forEach((e: Expense) => {
      const d = new Date(e.payload.date);
      if (d.getFullYear().toString() === selectedYear && e.payload.tags) {
        e.payload.tags.forEach((t: string) => {
          if (!tags[t]) tags[t] = { income: 0, expense: 0 };
          const type = e.payload.type || "expense";
          if (type === "income") {
            tags[t].income += e.payload.amount;
          } else {
            tags[t].expense += e.payload.amount;
          }
        });
      }
    });
    return Object.entries(tags)
      .map(([name, data]) => ({
        name,
        income: data.income,
        expense: data.expense,
        total: data.income + data.expense,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [expenses, selectedYear]);

  return (
    <div className="space-y-8 pb-12">
      {/* Precision Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-3xl backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-inner">
            <Calendar className="w-4 h-4 text-accent" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-black text-white focus:outline-none cursor-pointer tracking-tighter"
            >
              {[2026, 2025, 2024].map((y) => (
                <option key={y} value={y.toString()} className="bg-zinc-900">
                  {y} Financial Year
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
            {["overview", "categories", "tags"].map((t) => (
              <button
                key={t}
                onClick={() =>
                  setActiveTab(t as "overview" | "categories" | "tags")
                }
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === t
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all border border-zinc-700/50">
            <Download className="w-4 h-4" />
          </button>
          <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-accent/20">
            <Zap className="w-3 h-3" /> Forensics
          </button>
        </div>
      </div>

      {/* Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl overflow-hidden relative"
        >
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
            Total Inflow
          </p>
          <h3 className="text-3xl font-black text-success tracking-tighter">
            {sym}
            {formatNumber(summary.totalIncome, settings.numberFormat)}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-zinc-500 italic opacity-50 uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" /> Velocity Secured
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp className="w-12 h-12 text-success" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl overflow-hidden relative"
        >
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
            Total Outflow
          </p>
          <h3 className="text-3xl font-black text-white tracking-tighter">
            {sym}
            {formatNumber(summary.totalExpense, settings.numberFormat)}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-zinc-500 italic opacity-50 uppercase tracking-widest">
            <TrendingDown className="w-3 h-3" /> Resources Deployed
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingDown className="w-12 h-12 text-danger" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl overflow-hidden relative"
        >
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
            Net Savings
          </p>
          <h3
            className={cn(
              "text-3xl font-black tracking-tighter",
              summary.netSavings >= 0 ? "text-accent" : "text-danger",
            )}
          >
            {summary.netSavings < 0 ? "-" : "+"}
            {sym}
            {formatNumber(Math.abs(summary.netSavings), settings.numberFormat)}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-zinc-500 italic opacity-50 uppercase tracking-widest">
            <ArrowUpRight className="w-3 h-3" /> Wealth Retention
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Scale className="w-12 h-12 text-accent" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl overflow-hidden relative"
        >
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
            Savings Rate
          </p>
          <h3 className="text-3xl font-black text-white tracking-tighter">
            {summary.savingsRate.toFixed(1)}%
          </h3>
          <div className="mt-4 flex flex-col gap-2">
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.max(0, Math.min(100, summary.savingsRate))}%`,
                }}
                className="h-full bg-accent"
              />
            </div>
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter italic">
              Capital Efficiency
            </span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl relative">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" /> Cash Flow
                    Trend
                  </h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                    Income vs Expense velocity
                  </p>
                </div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={annualStats}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={INCOME_COLOR}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={INCOME_COLOR}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={EXPENSE_COLOR}
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor={EXPENSE_COLOR}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 11, fontWeight: 900 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) =>
                        `${sym}${val > 1000 ? (val / 1000).toFixed(0) + "k" : val}`
                      }
                    />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderRadius: "24px",
                        border: "1px solid #27272a",
                        padding: "20px",
                      }}
                      itemStyle={{
                        fontSize: "12px",
                        fontWeight: "900",
                        textTransform: "uppercase",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area
                      name="Income"
                      type="monotone"
                      dataKey="income"
                      stroke={INCOME_COLOR}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorInc)"
                    />
                    <Area
                      name="Expense"
                      type="monotone"
                      dataKey="expense"
                      stroke={EXPENSE_COLOR}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExp)"
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl flex flex-col relative overflow-hidden">
              <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" /> Efficiency Matrix
              </h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-10">
                Strategic balance forensics
              </p>

              <div className="flex-1 space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Resources Retained
                    </span>
                    <span className="text-lg font-black text-white italic">
                      {formatNumber(summary.netSavings, settings.numberFormat)}{" "}
                      {sym}
                    </span>
                  </div>
                  <div className="h-6 bg-zinc-950 rounded-2xl border border-zinc-800 p-1 flex">
                    <motion.div
                      className="bg-accent rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(5, summary.savingsRate)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-3xl group">
                    <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">
                      Avg Monthly In
                    </p>
                    <p className="text-xl font-black text-success tracking-tighter group-hover:scale-105 transition-transform origin-left">
                      {sym}
                      {formatNumber(
                        summary.totalIncome / 12,
                        settings.numberFormat,
                      )}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-3xl group">
                    <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">
                      Avg Monthly Out
                    </p>
                    <p className="text-xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">
                      {sym}
                      {formatNumber(
                        summary.totalExpense / 12,
                        settings.numberFormat,
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800/50">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
                    Top Targets (Spending)
                  </h4>
                  <div className="space-y-4">
                    {categoryData.expense.slice(0, 3).map((item, idx) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-zinc-700 italic">
                            0{idx + 1}
                          </span>
                          <span className="text-xs font-black text-zinc-300 uppercase letter-tight">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-danger/70">
                          -{sym}
                          {formatNumber(item.value, settings.numberFormat)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Expense Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl relative">
              <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-danger" /> Expense Forensics
              </h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8">
                Resource distribution by sector
              </p>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/2 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.expense}
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.expense.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  {categoryData.expense.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-black text-white">
                          {((cat.value / summary.totalExpense) * 100).toFixed(
                            0,
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${(cat.value / summary.totalExpense) * 100}%`,
                            backgroundColor:
                              CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Income Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl relative">
              <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-success" /> Revenue Intelligence
              </h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8">
                Capital source diversification
              </p>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/2 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.income}
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.income.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  {categoryData.income.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-black text-success">
                          {summary.totalIncome > 0
                            ? ((cat.value / summary.totalIncome) * 100).toFixed(
                                0,
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${summary.totalIncome > 0 ? (cat.value / summary.totalIncome) * 100 : 0}%`,
                            backgroundColor:
                              CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {categoryData.income.length === 0 && (
                    <p className="text-[10px] font-bold text-zinc-600 italic text-center py-12">
                      Zero revenue intelligence data
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "tags" && (
          <motion.div
            key="tags"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <Tag className="w-6 h-6 text-accent" /> Neural Tag Grid
                </h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                  Cross-categorical intensity mapping
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {tagData.map((tag, idx) => (
                <motion.div
                  key={tag.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-800 hover:border-accent/40 hover:bg-zinc-900/50 transition-all group relative overflow-hidden"
                >
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 group-hover:text-accent transition-colors">
                      {tag.name}
                    </span>
                    <p className="text-xl font-black text-white tracking-tighter mb-4 italic group-hover:scale-110 transition-transform">
                      {sym}
                      {formatNumber(tag.total, settings.numberFormat)}
                    </p>
                    <div className="flex w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success opacity-70"
                        style={{ width: `${(tag.income / tag.total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-danger opacity-70"
                        style={{ width: `${(tag.expense / tag.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between w-full mt-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] font-black text-success">
                        +{formatNumber(tag.income, settings.numberFormat)}
                      </span>
                      <span className="text-[8px] font-black text-danger">
                        -{formatNumber(tag.expense, settings.numberFormat)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {tagData.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-zinc-800 rounded-[3rem]">
                  <p className="text-zinc-600 font-bold uppercase tracking-widest italic">
                    Zero neural footprints detected
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
