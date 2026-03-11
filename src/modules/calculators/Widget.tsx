"use client";

import { Calculator, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
    buildDefaultCalculatorsSettings,
    CALCULATOR_CATEGORIES,
    CALCULATOR_DEFINITIONS,
} from "./catalog";
import { CalculatorsModuleSettings } from "./types";

const DEFAULT_SETTINGS: CalculatorsModuleSettings = buildDefaultCalculatorsSettings();

function normalizeSettings(settings: CalculatorsModuleSettings): CalculatorsModuleSettings {
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
    const { settings } = useModuleSettings<CalculatorsModuleSettings>("calculatorsSettings", DEFAULT_SETTINGS);
    const normalized = useMemo(() => normalizeSettings(settings), [settings]);

    const summary = useMemo(() => {
        const enabledCategories = CALCULATOR_CATEGORIES.filter((category) => normalized.enabledCategories[category.id] !== false);
        const enabledCalculators = CALCULATOR_DEFINITIONS.filter((calculator) => {
            const categoryEnabled = normalized.enabledCategories[calculator.categoryId] !== false;
            const calculatorEnabled = normalized.enabledCalculators[calculator.id] !== false;
            return categoryEnabled && calculatorEnabled;
        });

        return {
            enabledCategories,
            enabledCalculators,
        };
    }, [normalized.enabledCategories, normalized.enabledCalculators]);

    return (
        <WidgetCard
            title="Calculators"
            icon={Calculator}
            href="/admin/calculators"
            footer={
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span>{summary.enabledCalculators.length > 0 ? "Ready for operation" : "Action required: enable modules"}</span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.enabledCalculators.length}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">active logic engines</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {summary.enabledCategories.slice(0, 3).map((category) => (
                        <span key={category.id} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                            {category.name}
                        </span>
                    ))}
                    {summary.enabledCategories.length > 3 && (
                        <span className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg text-[9px] font-bold uppercase tracking-wider text-accent">
                            +{summary.enabledCategories.length - 3}
                        </span>
                    )}
                </div>
            </div>
        </WidgetCard>
    );
}
