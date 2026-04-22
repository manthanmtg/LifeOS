"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
  Expense,
  ExpenseSettings,
  DEFAULT_CATEGORIES,
  DashboardTabProps,
  AnalyticsTabProps,
  SettingsTabProps,
} from "./components/types";

// Dynamic imports for tabs with explicit types
import dynamic from "next/dynamic";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";

const DashboardTab = dynamic<DashboardTabProps>(
  () => import("./tabs/DashboardTab"),
  {
    loading: () => <AdminModuleSkeleton />,
  },
);
const AnalyticsTab = dynamic<AnalyticsTabProps>(
  () => import("./tabs/AnalyticsTab"),
  {
    loading: () => <AdminModuleSkeleton />,
  },
);
const SettingsTab = dynamic<SettingsTabProps>(
  () => import("./tabs/SettingsTab"),
  {
    loading: () => <AdminModuleSkeleton />,
  },
);

const SUB_DEFAULTS: ExpenseSettings = {
  categories: DEFAULT_CATEGORIES,
  defaultCurrency: "USD",
  monthlyBudget: 0,
  numberFormat: "western",
};

export default function ExpensesAdminView() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "analytics" | "settings"
  >("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    settings,
    updateSettings,
    loaded: settingsLoaded,
  } = useModuleSettings<ExpenseSettings>("expenseSettings", SUB_DEFAULTS);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/content?module_type=expense");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch expenses");
      setExpenses(data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ] as const;

  if (!settingsLoaded) return <AdminModuleSkeleton />;

  return (
    <div className="space-y-8 pb-24">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-50 flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <CreditCard className="w-8 h-8 text-accent" />
            </div>
            Expense Intelligence
          </h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">
            Professional-grade financial tracking and analysis.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Expense views"
          className="flex items-center bg-zinc-900/50 border border-zinc-800 p-1.5 rounded-2xl backdrop-blur-sm self-start md:self-auto"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`${tab.id}-tab`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative",
                  isActive
                    ? "text-accent bg-zinc-800 shadow-xl"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-accent" : "text-zinc-500",
                  )}
                />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
          >
            {activeTab === "dashboard" && (
              <DashboardTab
                expenses={expenses}
                loading={loading}
                settings={settings}
                onRefresh={fetchExpenses}
                onUpdateSettings={updateSettings}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsTab
                expenses={expenses}
                loading={loading}
                settings={settings}
              />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
