"use client";

import { Calculator, TrendingUp, Landmark, Receipt } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetMiniStats,
} from "@/components/dashboard/widget-primitives";
import {
  buildDefaultCalculatorsSettings,
  CALCULATOR_CATEGORIES,
  CALCULATOR_DEFINITIONS,
} from "./catalog";
import { CalculatorsModuleSettings } from "./types";

const DEFAULT_SETTINGS: CalculatorsModuleSettings =
  buildDefaultCalculatorsSettings();

function normalizeSettings(
  settings: CalculatorsModuleSettings,
): CalculatorsModuleSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    enabledCategories: {
      ...DEFAULT_SETTINGS.enabledCategories,
      ...(settings.enabledCategories || {}),
    },
    enabledCalculators: {
      ...DEFAULT_SETTINGS.enabledCalculators,
      ...(settings.enabledCalculators || {}),
    },
  };
}

export default function CalculatorsWidget() {
  const { settings, loaded } = useModuleSettings<CalculatorsModuleSettings>(
    "calculatorsSettings",
    DEFAULT_SETTINGS,
  );
  const normalized = useMemo(() => normalizeSettings(settings), [settings]);

  const summary = useMemo(() => {
    const enabledCategories = CALCULATOR_CATEGORIES.filter(
      (c) => normalized.enabledCategories[c.id] !== false,
    );
    const enabledCalculators = CALCULATOR_DEFINITIONS.filter((calc) => {
      const catEnabled =
        normalized.enabledCategories[calc.categoryId] !== false;
      const calcEnabled = normalized.enabledCalculators[calc.id] !== false;
      return catEnabled && calcEnabled;
    });

    const investingCount = enabledCalculators.filter(
      (c) => c.categoryId === "core",
    ).length;
    const debtCount = enabledCalculators.filter(
      (c) => c.categoryId === "debt",
    ).length;
    const taxCount = enabledCalculators.filter(
      (c) => c.categoryId === "tax",
    ).length;

    return {
      enabledCategories,
      enabledCalculators,
      investingCount,
      debtCount,
      taxCount,
    };
  }, [normalized.enabledCategories, normalized.enabledCalculators]);

  return (
    <WidgetCard
      title="Calculators"
      icon={Calculator}
      href="/admin/calculators"
      loading={!loaded}
      footer={
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {summary.enabledCategories.length} categories available
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="space-y-4"
      >
        <WidgetStat
          value={summary.enabledCalculators.length}
          label="calculators ready"
        />
        <WidgetMiniStats
          stats={[
            {
              value: summary.investingCount,
              label: "Investing",
              icon: TrendingUp,
            },
            { value: summary.debtCount, label: "Debt", icon: Landmark },
            { value: summary.taxCount, label: "Tax", icon: Receipt },
          ]}
        />
      </motion.div>
    </WidgetCard>
  );
}
