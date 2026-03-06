"use client";

import { useMemo } from "react";
import { Check, Eye, Settings2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
    buildDefaultCalculatorsSettings,
    CALCULATOR_CATEGORIES,
    CALCULATOR_DEFINITIONS,
} from "./catalog";
import { CalculatorsModuleSettings } from "./types";
import CalculatorsPublicView from "./PublicView";

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

export default function CalculatorsAdminView() {
    const { settings, updateSettings, saving } = useModuleSettings<CalculatorsModuleSettings>("calculatorsSettings", DEFAULT_SETTINGS);

    const normalized = useMemo(() => normalizeSettings(settings), [settings]);

    const enabledCategoryCount = CALCULATOR_CATEGORIES.filter((category) => normalized.enabledCategories[category.id] !== false).length;
    const enabledCalculatorCount = CALCULATOR_DEFINITIONS.filter((calculator) => normalized.enabledCalculators[calculator.id] !== false).length;

    const groupedAll = useMemo(() => {
        const map: Record<string, typeof CALCULATOR_DEFINITIONS> = {};
        for (const calculator of CALCULATOR_DEFINITIONS) {
            if (!map[calculator.categoryId]) map[calculator.categoryId] = [];
            map[calculator.categoryId].push(calculator);
        }
        return map;
    }, []);

    const toggleCategory = (categoryId: string) => {
        const next = !(normalized.enabledCategories[categoryId] !== false);
        void updateSettings({
            enabledCategories: {
                ...normalized.enabledCategories,
                [categoryId]: next,
            },
        });
    };

    const toggleCalculator = (calculatorId: string) => {
        const next = !(normalized.enabledCalculators[calculatorId] !== false);
        void updateSettings({
            enabledCalculators: {
                ...normalized.enabledCalculators,
                [calculatorId]: next,
            },
        });
    };

    const setAllCategories = (enabled: boolean) => {
        const next: Record<string, boolean> = {};
        for (const category of CALCULATOR_CATEGORIES) {
            next[category.id] = enabled;
        }
        void updateSettings({ enabledCategories: next });
    };

    const setAllCalculators = (enabled: boolean) => {
        const next: Record<string, boolean> = {};
        for (const calculator of CALCULATOR_DEFINITIONS) {
            next[calculator.id] = enabled;
        }
        void updateSettings({ enabledCalculators: next });
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-14 right-0 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />
                <div className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Calculators Module</h1>
                            <p className="text-zinc-400 mt-1">Configure category and calculator visibility for your public calculators.</p>
                        </div>
                        <p className="text-xs text-zinc-500 self-start md:self-center inline-flex items-center gap-1.5">
                            {saving ? <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" /> : <Check className="w-3.5 h-3.5 text-accent" />}
                            {saving ? "Saving settings..." : "Settings saved"}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total calculators</p>
                            <p className="text-lg font-semibold text-zinc-50">{CALCULATOR_DEFINITIONS.length}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Enabled calculators</p>
                            <p className="text-lg font-semibold text-zinc-50">{enabledCalculatorCount}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Categories enabled</p>
                            <p className="text-lg font-semibold text-zinc-50">{enabledCategoryCount}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Public experience</p>
                            <p className="text-lg font-semibold text-zinc-50">Top-tier</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-zinc-50 inline-flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-accent" /> Visibility Controls
                        </h2>
                        <span className="text-xs text-zinc-500">Public scope</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Categories</p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAllCategories(true)}
                                    className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-50"
                                >
                                    Enable all
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAllCategories(false)}
                                    className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-50"
                                >
                                    Disable all
                                </button>
                            </div>
                        </div>

                        {CALCULATOR_CATEGORIES.map((category) => {
                            const enabled = normalized.enabledCategories[category.id] !== false;
                            const count = groupedAll[category.id]?.length || 0;

                            return (
                                <button
                                    type="button"
                                    key={category.id}
                                    onClick={() => toggleCategory(category.id)}
                                    aria-label={`Toggle ${category.name} category`}
                                    aria-pressed={enabled}
                                    className={cn(
                                        "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                        enabled
                                            ? "bg-accent/10 border-accent/30"
                                            : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                                    )}
                                >
                                    <div>
                                        <p className={cn("text-sm font-medium", enabled ? "text-accent" : "text-zinc-300")}>{category.name}</p>
                                        <p className="text-[11px] text-zinc-500">{count} calculators</p>
                                    </div>
                                    <span
                                        className={cn(
                                            "inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] px-1.5 border",
                                            enabled
                                                ? "bg-accent/15 border-accent/40 text-accent"
                                                : "bg-zinc-900 border-zinc-700 text-zinc-500"
                                        )}
                                    >
                                        {enabled ? "ON" : "OFF"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Calculators</p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAllCalculators(true)}
                                    className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-50"
                                >
                                    Enable all
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAllCalculators(false)}
                                    className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-50"
                                >
                                    Disable all
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                            {CALCULATOR_DEFINITIONS.map((calculator) => {
                                const enabled = normalized.enabledCalculators[calculator.id] !== false;
                                const categoryEnabled = normalized.enabledCategories[calculator.categoryId] !== false;

                                return (
                                    <button
                                        type="button"
                                        key={calculator.id}
                                        onClick={() => toggleCalculator(calculator.id)}
                                        aria-label={`Toggle ${calculator.name} calculator`}
                                        aria-pressed={enabled}
                                        className={cn(
                                            "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                            enabled && categoryEnabled
                                                ? "bg-zinc-900 border-zinc-700"
                                                : "bg-zinc-950/70 border-zinc-800"
                                        )}
                                    >
                                        <div>
                                            <p className={cn("text-sm", enabled ? "text-zinc-100" : "text-zinc-500")}>{calculator.shortName}</p>
                                            <p className="text-[11px] text-zinc-500">{calculator.name}</p>
                                        </div>
                                        <span
                                            className={cn(
                                                "inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] px-1.5 border",
                                                enabled
                                                    ? "bg-green-500/10 border-green-500/30 text-green-300"
                                                    : "bg-zinc-900 border-zinc-700 text-zinc-500"
                                            )}
                                        >
                                            {enabled ? "ON" : "OFF"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>

                <div className="xl:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-base font-semibold text-zinc-50 inline-flex items-center gap-2">
                            <Eye className="w-4 h-4 text-accent" /> Public Preview
                        </h2>
                        <p className="text-xs text-zinc-500">Same component as public route (live)</p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                        <CalculatorsPublicView items={[]} settingsOverride={normalized} />
                    </div>
                </div>
            </div>
        </div>
    );
}
