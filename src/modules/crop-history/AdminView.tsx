"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Table as TableIcon,
  BarChart3,
  Wheat,
  BookOpen,
  Settings,
  Layers,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";

import dynamic from "next/dynamic";

const SpreadsheetTab = dynamic(() => import("./SpreadsheetTab").then((mod) => mod.SpreadsheetTab));
const AnalyticsTab = dynamic(() => import("./AnalyticsTab").then((mod) => mod.AnalyticsTab));
const SettingsTab = dynamic(() => import("./SettingsTab").then((mod) => mod.SettingsTab));
const DocsTab = dynamic(() => import("./DocsTab").then((mod) => mod.DocsTab));

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
  id: string; // e.g. UNDRIED_TO_BAG_CONVERT
  name: string; // e.g. "Undried to Bag Convert"
  value: number; // e.g. 120
}

interface AnalyticsConfig {
  revenueFieldId?: string; // Which calculated field represents revenue/income
  yieldFieldId?: string; // Which source field is the primary yield (e.g. weight, undried)
}

export interface CropConfig {
  id: string;
  name: string;
  scheduleType: "yearly" | "half-yearly" | "quarterly" | "monthly" | "custom";
  sourceFields: FieldDef[]; // Data entered per area, per period (e.g. Undried weight, OT)
  summaryFields: FieldDef[]; // Data entered once per period (e.g. Avg Price per 50kg bag)
  calculatedFields: CalcFieldDef[]; // Auto-computed via formulas
  constants?: ConstantDef[]; // Named constants usable in formulas
  analyticsConfig?: AnalyticsConfig; // Tags for analytics tab
  periodOrder?: string[]; // Custom order for schedule periods
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
  sources: [],
};

export default function CropHistoryAdminView() {
  const {
    settings,
    updateSettings,
    saving: settingsSaving,
    loaded: settingsLoaded,
  } = useModuleSettings<ModuleSettings>(
    "cropHistorySettings",
    DEFAULT_SETTINGS,
  );

  const [records, setRecords] = useState<CropRecord[]>([]);

  const [activeTab, setActiveTab] = useState<
    "spreadsheet" | "analytics" | "settings" | "docs"
  >("spreadsheet");
  const [activeCropId, setActiveCropId] = useState<string | null>(null);

  // Derive the effective crop ID: user selection if valid, otherwise first crop
  const resolvedCropId = useMemo(() => {
    if (activeCropId && settings.crops.some((c) => c.id === activeCropId)) {
      return activeCropId;
    }
    return settings.crops[0]?.id ?? null;
  }, [activeCropId, settings.crops]);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/content?module_type=crop_history");
      const data = await res.json();
      if (res.ok) setRecords(data.data || []);
    } catch (e) {
      console.error("Failed to fetch records", e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content?module_type=crop_history")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRecords(data.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCrop = useMemo(
    () => settings.crops.find((c) => c.id === resolvedCropId),
    [settings.crops, resolvedCropId],
  );

  const activeCropRecords = useMemo(
    () => records.filter((r) => r.payload.crop_id === resolvedCropId),
    [records, resolvedCropId],
  );

  const schedulePeriods = useMemo(() => {
    if (!activeCropRecords.length) return [];
    const periods = Array.from(
      new Set(activeCropRecords.map((r) => r.payload.schedule_period)),
    );

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
  }, [activeCropRecords, activeCrop]);

  const areas = useMemo(() => settings.sources || [], [settings.sources]);

  const totalPeriods = useMemo(
    () => new Set(records.map((r) => r.payload.schedule_period)).size,
    [records],
  );

  const handleReorderPeriods = useCallback(
    (newOrder: string[]) => {
      if (!activeCrop) return;
      const updatedCrops = [...settings.crops];
      const idx = updatedCrops.findIndex((c) => c.id === activeCrop.id);
      if (idx !== -1) {
        updatedCrops[idx] = {
          ...activeCrop,
          periodOrder: newOrder,
        };
        updateSettings({ crops: updatedCrops });
      }
    },
    [activeCrop, settings.crops, updateSettings]
  );

  if (!settingsLoaded) {
    return <AdminModuleSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-success/10 blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-accent/5 blur-2xl opacity-60 pointer-events-none" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold tracking-tight text-zinc-50">
              <Wheat className="w-6 h-6 md:w-8 md:h-8 text-success" />
              Crop History
            </h1>
            <p className="text-zinc-400 mt-1 text-sm md:text-base hidden sm:block">
              Track yields, dynamic calculations, and year-over-year revenue.
            </p>
          </div>
          {/* Quick Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-success" />
              <span className="text-zinc-300 font-medium">
                {settings.crops.length}
              </span>
              <span className="text-zinc-500">crops</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span className="text-zinc-300 font-medium">{areas.length}</span>
              <span className="text-zinc-500">areas</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2.5 py-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-warning" />
              <span className="text-zinc-300 font-medium">{totalPeriods}</span>
              <span className="text-zinc-500">periods</span>
            </div>
          </div>
        </div>

        <div
          className="mt-6 flex items-center gap-2 border-b border-zinc-800 pb-px text-sm overflow-x-auto hide-scrollbar"
          role="tablist"
          aria-label="Crop history sections"
        >
          <TabButton
            active={activeTab === "spreadsheet"}
            onClick={() => setActiveTab("spreadsheet")}
            icon={TableIcon}
            panelId="crop-history-spreadsheet-panel"
          >
            Spreadsheet
          </TabButton>
          <TabButton
            active={activeTab === "analytics"}
            onClick={() => setActiveTab("analytics")}
            icon={BarChart3}
            panelId="crop-history-analytics-panel"
          >
            Analytics
          </TabButton>
          <TabButton
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
            icon={Settings}
            panelId="crop-history-settings-panel"
          >
            Settings
          </TabButton>
          <TabButton
            active={activeTab === "docs"}
            onClick={() => setActiveTab("docs")}
            icon={BookOpen}
            panelId="crop-history-docs-panel"
          >
            Docs
          </TabButton>
        </div>
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "spreadsheet" && (
            <div id="crop-history-spreadsheet-panel" role="tabpanel">
              <SpreadsheetTab
                activeCrop={activeCrop}
                crops={settings.crops}
                areas={areas}
                records={activeCropRecords}
                schedulePeriods={schedulePeriods}
                setActiveCropId={setActiveCropId}
                onReorderPeriods={handleReorderPeriods}
                onRefresh={fetchRecords}
              />
            </div>
          )}

          {activeTab === "analytics" && (
            <div id="crop-history-analytics-panel" role="tabpanel">
              <AnalyticsTab
                crops={settings.crops}
                allRecords={records}
                sources={areas}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <div id="crop-history-settings-panel" role="tabpanel">
              <SettingsTab
                settings={settings}
                updateSettings={updateSettings}
                saving={settingsSaving}
              />
            </div>
          )}

          {activeTab === "docs" && (
            <div id="crop-history-docs-panel" role="tabpanel">
              <DocsTab />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon: Icon,
  panelId,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  panelId: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 hover:bg-zinc-800/50 rounded-t-lg transition-colors -mb-px border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
        active
          ? "border-success text-success"
          : "border-transparent text-zinc-400",
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      {children}
    </button>
  );
}
