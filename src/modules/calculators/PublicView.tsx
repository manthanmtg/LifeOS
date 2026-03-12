"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Sparkles,
    PiggyBank,
    HandCoins,
    ReceiptText,
    TrendingUp,
    Ruler,
    Wrench,
    ArrowRight,
    X,
} from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
    buildDefaultCalculatorsSettings,
    CALCULATOR_CATEGORIES,
    CALCULATOR_DEFINITIONS,
} from "./catalog";
import { CalculatorsModuleSettings } from "./types";
import { cn } from "@/lib/utils";
import CalculatorCard from "./CalculatorCard";

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

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    core: PiggyBank,
    debt: HandCoins,
    tax: ReceiptText,
    returns: TrendingUp,
    conversion: Ruler,
    utilities: Wrench,
};

interface CalculatorsPublicViewProps {
    items: Record<string, unknown>[];
    settingsOverride?: CalculatorsModuleSettings;
}

export default function CalculatorsPublicView({ items: _items, settingsOverride }: CalculatorsPublicViewProps) {
    void _items;
    const { settings } = useModuleSettings<CalculatorsModuleSettings>("calculatorsSettings", DEFAULT_SETTINGS);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [activeCalculatorId, setActiveCalculatorId] = useState<string | null>(null);

    const normalized = useMemo(
        () => normalizeSettings(settingsOverride ?? settings),
        [settingsOverride, settings]
    );

    const visibleCategories = useMemo(
        () => CALCULATOR_CATEGORIES.filter((category) => normalized.enabledCategories[category.id] !== false),
        [normalized.enabledCategories]
    );

    const visibleCalculators = useMemo(() => {
        return CALCULATOR_DEFINITIONS.filter((calculator) => {
            const categoryEnabled = normalized.enabledCategories[calculator.categoryId] !== false;
            const calculatorEnabled = normalized.enabledCalculators[calculator.id] !== false;
            if (!categoryEnabled || !calculatorEnabled) return false;

            if (activeCategory !== "all" && calculator.categoryId !== activeCategory) return false;

            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;

            const haystack = `${calculator.name} ${calculator.description} ${calculator.shortName}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [normalized.enabledCategories, normalized.enabledCalculators, activeCategory, searchQuery]);

    const groupedCalculators = useMemo(() => {
        const map: Record<string, typeof visibleCalculators> = {};
        for (const calculator of visibleCalculators) {
            if (!map[calculator.categoryId]) map[calculator.categoryId] = [];
            map[calculator.categoryId].push(calculator);
        }
        return map;
    }, [visibleCalculators]);

    const activeCalculator = useMemo(
        () => CALCULATOR_DEFINITIONS.find((calculator) => calculator.id === activeCalculatorId) || null,
        [activeCalculatorId]
    );

    const activeCategoryMeta = useMemo(() => {
        if (!activeCalculator) return null;
        return CALCULATOR_CATEGORIES.find((category) => category.id === activeCalculator.categoryId) || null;
    }, [activeCalculator]);

    useEffect(() => {
        if (!activeCalculatorId) {
            document.body.style.overflow = "";
            return;
        }

        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [activeCalculatorId]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setActiveCalculatorId(null);
            }
        };

        if (activeCalculatorId) {
            document.addEventListener("keydown", onKeyDown);
        }

        return () => document.removeEventListener("keydown", onKeyDown);
    }, [activeCalculatorId]);

    return (
        <section className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
                <div className="absolute -top-16 -right-8 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative">
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-50">
                        Calculators
                    </h2>
                    <p className="text-zinc-400 mt-3 max-w-3xl text-sm sm:text-base">
                        Browse available tools with a clean catalog. Click any calculator to open it in a focused modal.
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search calculators by purpose..."
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setActiveCategory("all")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                            activeCategory === "all"
                                ? "bg-accent/15 border-accent/35 text-accent"
                                : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        All Categories
                    </button>

                    {visibleCategories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                activeCategory === category.id
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {visibleCalculators.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
                    <p className="text-zinc-300 text-lg font-medium">No calculators available right now.</p>
                    <p className="text-zinc-500 mt-1 text-sm">This module is currently configured with no public calculators.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleCategories.map((category) => {
                        const calculators = groupedCalculators[category.id] || [];
                        if (calculators.length === 0) return null;

                        const CategoryIcon = CATEGORY_ICON_MAP[category.id] || Sparkles;

                        return (
                            <div key={category.id} className="space-y-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-zinc-50 inline-flex items-center gap-2">
                                        <CategoryIcon className="w-4 h-4 text-accent" /> {category.name}
                                    </h3>
                                    <p className="text-sm text-zinc-500 mt-0.5">{category.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {calculators.map((calculator) => (
                                        <button
                                            key={calculator.id}
                                            type="button"
                                            onClick={() => setActiveCalculatorId(calculator.id)}
                                            className="text-left group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-zinc-700 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{calculator.shortName}</span>
                                                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 group-hover:text-accent transition-colors">
                                                    Open <ArrowRight className="w-3.5 h-3.5" />
                                                </span>
                                            </div>
                                            <h4 className="text-base font-semibold text-zinc-50">{calculator.name}</h4>
                                            <p className="text-sm text-zinc-400 mt-1 line-clamp-3">{calculator.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeCalculator && (
                <div className="fixed inset-0 z-50 px-4 py-6 sm:px-6 sm:py-8">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveCalculatorId(null)} />

                    <div className="relative max-w-5xl mx-auto max-h-full overflow-y-auto">
                        <div className="rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{activeCategoryMeta?.name || "Calculator"}</p>
                                    <h3 className="text-xl font-semibold text-zinc-50 mt-1">{activeCalculator.name}</h3>
                                    <p className="text-sm text-zinc-400 mt-1">Adjust inputs and see instant results.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveCalculatorId(null)}
                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-50 hover:border-zinc-600 transition-colors"
                                    aria-label="Close calculator"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <CalculatorCard
                                definition={activeCalculator}
                                categoryLabel={activeCategoryMeta?.name || "Calculator"}
                                startExpanded
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
