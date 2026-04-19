"use client";

import { Calculator } from "lucide-react";
import { useMemo } from "react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
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
  const { settings } = useModuleSettings<CalculatorsModuleSettings>(
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
    return { enabledCategories, enabledCalculators };
  }, [normalized.enabledCategories, normalized.enabledCalculators]);

  return (
    <WidgetCard
      title="Calculators"
      icon={Calculator}
      href="/admin/calculators"
      footer={
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {summary.enabledCategories.length} categories available
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={summary.enabledCalculators.length}
          label="calculators ready"
        />
        <WidgetHighlight
          icon={Calculator}
          text={
            summary.enabledCalculators.length > 0
              ? "Quick access to all tools"
              : "Enable calculators in settings"
          }
          variant={summary.enabledCalculators.length > 0 ? "accent" : "warning"}
        />
      </div>
    </WidgetCard>
  );
}
