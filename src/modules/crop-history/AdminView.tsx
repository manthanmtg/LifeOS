"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
    Table as TableIcon, BarChart3, Wheat, BookOpen, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

import { SpreadsheetTab } from "./SpreadsheetTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SettingsTab } from "./SettingsTab";
import { DocsTab } from "./DocsTab";

// --- Types ---
export interface FieldDef {
    id: string;
    name: string;
    type: "number" | "text";
    unit?: string; // e.g. "kg", "%", "₹/50kg bag"
}

export interface CalcFieldDef {
    id: string;
    name: string;
    formula: string;
    format: "number" | "currency" | "percentage";
    unit?: string;
}

export interface ConstantDef {
    id: string;   // e.g. UNDRIED_TO_BAG_CONVERT
    name: string; // e.g. "Undried to Bag Convert"
    value: number; // e.g. 120
}

export interface AnalyticsConfig {
    revenueFieldId?: string;  // Which calculated field represents revenue/income
    yieldFieldId?: string;    // Which source field is the primary yield (e.g. weight, undried)
}

export interface CropConfig {
    id: string;
    name: string;
    scheduleType: "yearly" | "half-yearly" | "quarterly" | "monthly" | "custom";
    sourceFields: FieldDef[];    // Data entered per area, per period (e.g. Undried weight, OT)
    summaryFields: FieldDef[];   // Data entered once per period (e.g. Avg Price per 50kg bag)
    calculatedFields: CalcFieldDef[]; // Auto-computed via formulas
    constants?: ConstantDef[];   // Named constants usable in formulas
    analyticsConfig?: AnalyticsConfig; // Tags for analytics tab
    periodOrder?: string[];      // Custom order for schedule periods
}

export interface AreaDef {
    id: string;
    name: string;
}

export interface ModuleSettings {
    [key: string]: unknown;
    crops: CropConfig[];
    sources: AreaDef[];
}

export interface CropRecord {
    _id: string;
    created_at: string;
    payload: {
        crop_id: string;
        schedule_period: string;
        source_data: Record<string, Record<string, number>>;
        summary_data: Record<string, number>;
        notes?: string;
    };
}

const DEFAULT_SETTINGS: ModuleSettings = {
    crops: [],
    sources: []
};

export default function CropHistoryAdminView() {
    const { settings, updateSettings, saving: settingsSaving, loaded: settingsLoaded } = useModuleSettings<ModuleSettings>("cropHistorySettings", DEFAULT_SETTINGS);

    const [records, setRecords] = useState<CropRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    void loadingRecords;

    const [activeTab, setActiveTab] = useState<"spreadsheet" | "analytics" | "settings" | "docs">("spreadsheet");
    const [activeCropId, setActiveCropId] = useState<string | null>(null);

    useEffect(() => {
        if (settingsLoaded && settings.crops.length > 0 && !activeCropId) {
            setActiveCropId(settings.crops[0].id);
        }
    }, [settingsLoaded, settings.crops, activeCropId]);

    const fetchRecords = useCallback(async () => {
        setLoadingRecords(true);
        try {
            const res = await fetch("/api/content?module_type=crop_history");
            const data = await res.json();
            if (res.ok) setRecords(data.data || []);
        } catch (e) {
            console.error("Failed to fetch records", e);
        } finally {
            setLoadingRecords(false);
        }
    }, []);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const activeCrop = useMemo(() =>
        settings.crops.find(c => c.id === activeCropId),
        [settings.crops, activeCropId]
    );

    const activeCropRecords = useMemo(() =>
        records.filter(r => r.payload.crop_id === activeCropId),
        [records, activeCropId]
    );

    const schedulePeriods = useMemo(() => {
        if (!activeCropRecords.length) return [];
        const periods = Array.from(new Set(activeCropRecords.map(r => r.payload.schedule_period)));

        if (activeCrop?.periodOrder && activeCrop.periodOrder.length > 0) {
            // Sort by the custom order. Any periods not in the order go to the end (sorted naturally)
            return periods.sort((a, b) => {
                const idxA = activeCrop.periodOrder!.indexOf(a);
                const idxB = activeCrop.periodOrder!.indexOf(b);

                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });
        }

        return periods.sort();
    }, [activeCropRecords, activeCrop?.periodOrder]);

    const areas = settings.sources || [];

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl opacity-50" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold tracking-tight text-zinc-50">
                            <Wheat className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
                            Crop History
                        </h1>
                        <p className="text-zinc-400 mt-1 text-sm md:text-base hidden sm:block">Track yields, dynamic calculations, and year-over-year revenue.</p>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-2 border-b border-zinc-800 pb-px text-sm overflow-x-auto hide-scrollbar">
                    <TabButton active={activeTab === "spreadsheet"} onClick={() => setActiveTab("spreadsheet")} icon={TableIcon}>Spreadsheet</TabButton>
                    <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")} icon={BarChart3}>Analytics</TabButton>
                    <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={Settings}>Settings</TabButton>
                    <TabButton active={activeTab === "docs"} onClick={() => setActiveTab("docs")} icon={BookOpen}>Docs</TabButton>
                </div>
            </div>

            {activeTab === "spreadsheet" && (
                <SpreadsheetTab
                    activeCrop={activeCrop}
                    crops={settings.crops}
                    areas={areas}
                    records={activeCropRecords}
                    schedulePeriods={schedulePeriods}
                    setActiveCropId={setActiveCropId}
                    onReorderPeriods={(newOrder) => {
                        if (!activeCrop) return;
                        const updatedCrops = [...settings.crops];
                        const idx = updatedCrops.findIndex(c => c.id === activeCrop.id);
                        if (idx !== -1) {
                            updatedCrops[idx] = { ...activeCrop, periodOrder: newOrder };
                            updateSettings({ crops: updatedCrops });
                        }
                    }}
                    onRefresh={fetchRecords}
                />
            )}

            {activeTab === "analytics" && (
                <AnalyticsTab
                    crops={settings.crops}
                    allRecords={records}
                    sources={areas}
                />
            )}

            {activeTab === "settings" && (
                <SettingsTab
                    settings={settings}
                    updateSettings={updateSettings}
                    saving={settingsSaving}
                />
            )}

            {activeTab === "docs" && <DocsTab />}
        </div>
    );
}

function TabButton({ children, active, onClick, icon: Icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon: LucideIcon }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 hover:bg-zinc-800/50 rounded-t-lg transition-colors -mb-px border-b-2 whitespace-nowrap",
                active ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-400"
            )}
        >
            <Icon className="w-4 h-4" />
            {children}
        </button>
    );
}
