"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, RefreshCcw, Settings2 } from "lucide-react";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { cn } from "@/lib/utils";
import { AreaSidebar } from "./components/AreaSidebar";
import { RainEntriesPanel } from "./components/RainEntriesPanel";
import { RainOverview } from "./components/RainOverview";
import { RainTrackerPreferences } from "./components/RainTrackerPreferences";
import type { RainArea, RainEntry, RainFilters, RainSettings } from "./types";
import {
  buildRainAreaPortfolioSummary,
  buildRainAnalytics,
  CONVERSION_FROM_MM,
  CONVERSION_TO_MM,
  DEFAULT_RAIN_SETTINGS,
  getAreaListItems,
  getDefaultEntryDateTime,
  getLast30Trend,
  getVisibleRainEntries,
  parseDateInputToISO,
} from "./utils";

const EMPTY_FILTERS: RainFilters = {
  amountMin: "",
  amountMax: "",
  notes: "",
  preset: "all",
};

async function readResponseJson(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    data?: unknown;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(body?.error?.message || "Request failed");
  }

  return body ?? {};
}

export default function RainTrackerAdminView() {
  const { settings, updateSettings } = useModuleSettings<RainSettings>(
    "rainTrackerSettings",
    DEFAULT_RAIN_SETTINGS,
  );

  const displayUnit = settings.defaultUnit || "mm";
  const chartType = settings.chartType || "bar";
  const defaultEntryDateTime = useMemo(() => getDefaultEntryDateTime(), []);

  const [areas, setAreas] = useState<RainArea[]>([]);
  const [entries, setEntries] = useState<RainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState("");
  const [areaLocation, setAreaLocation] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [areaIsActive, setAreaIsActive] = useState(true);
  const [areaFormError, setAreaFormError] = useState("");
  const [isSavingArea, setIsSavingArea] = useState(false);

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(defaultEntryDateTime.date);
  const [entryTime, setEntryTime] = useState(defaultEntryDateTime.time);
  const [entryNotes, setEntryNotes] = useState("");
  const [entrySource, setEntrySource] = useState("manual");
  const [entryFormError, setEntryFormError] = useState("");
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const [filters, setFilters] = useState<RainFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resetAreaForm = useCallback(() => {
    setEditingAreaId(null);
    setAreaName("");
    setAreaLocation("");
    setAreaDescription("");
    setAreaIsActive(true);
    setAreaFormError("");
  }, []);

  const resetEntryForm = useCallback((now = new Date()) => {
    const defaults = getDefaultEntryDateTime(now);
    setEditingEntryId(null);
    setEntryAmount("");
    setEntryDate(defaults.date);
    setEntryTime(defaults.time);
    setEntryNotes("");
    setEntrySource("manual");
    setEntryFormError("");
  }, []);

  const fetchData = useCallback(async () => {
    setLoadError("");

    try {
      const [areasResponse, entriesResponse] = await Promise.all([
        fetch("/api/content?module_type=rain_area"),
        fetch("/api/content?module_type=rain_entry"),
      ]);

      const [areasBody, entriesBody] = await Promise.all([
        readResponseJson(areasResponse),
        readResponseJson(entriesResponse),
      ]);

      const nextAreas = (areasBody.data as RainArea[] | undefined) ?? [];
      const nextEntries = (entriesBody.data as RainEntry[] | undefined) ?? [];

      setAreas(nextAreas);
      setEntries(nextEntries);
      setSelectedAreaId((current) => {
        if (current && nextAreas.some((area) => area._id === current)) {
          return current;
        }
        return nextAreas[0]?._id ?? null;
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load rain data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const areaListItems = useMemo(
    () => getAreaListItems(areas, entries),
    [areas, entries],
  );

  const selectedArea = useMemo(
    () => areas.find((area) => area._id === selectedAreaId),
    [areas, selectedAreaId],
  );

  const selectedAreaEntries = useMemo(
    () =>
      getVisibleRainEntries(
        entries,
        selectedAreaId,
        filters,
        displayUnit,
        searchQuery,
      ),
    [displayUnit, entries, filters, searchQuery, selectedAreaId],
  );

  const portfolioSummary = useMemo(
    () => buildRainAreaPortfolioSummary(areas, entries, displayUnit),
    [areas, displayUnit, entries],
  );

  const analytics = useMemo(
    () => buildRainAnalytics(entries, selectedAreaId, displayUnit),
    [displayUnit, entries, selectedAreaId],
  );

  const last30Trend = useMemo(
    () => getLast30Trend(analytics.last30, analytics.prevLast30),
    [analytics.last30, analytics.prevLast30],
  );

  const openNewArea = useCallback(() => {
    resetAreaForm();
    setShowAreaForm(true);
  }, [resetAreaForm]);

  const openEditArea = useCallback((area: RainArea) => {
    setAreaName(area.payload.name);
    setAreaLocation(area.payload.location || "");
    setAreaDescription(area.payload.description || "");
    setAreaIsActive(area.payload.is_active ?? true);
    setEditingAreaId(area._id);
    setAreaFormError("");
    setShowAreaForm(true);
  }, []);

  const closeAreaForm = useCallback(() => {
    setShowAreaForm(false);
    setAreaFormError("");
  }, []);

  const openNewEntry = useCallback(() => {
    resetEntryForm();
    setShowEntryForm(true);
  }, [resetEntryForm]);

  const openEditEntry = useCallback(
    (entry: RainEntry) => {
      setEntryAmount(
        String(entry.payload.rainfall_amount * CONVERSION_FROM_MM[displayUnit]),
      );

      const parsedDate = new Date(entry.payload.date);
      const isoDate = parsedDate.toISOString();

      setEntryDate(isoDate.slice(0, 10));
      setEntryTime(isoDate.slice(11, 16));
      setEntryNotes(entry.payload.notes || "");
      setEntrySource(entry.payload.source || "manual");
      setEditingEntryId(entry._id);
      setEntryFormError("");
      setShowEntryForm(true);
    },
    [displayUnit],
  );

  const closeEntryForm = useCallback(() => {
    setShowEntryForm(false);
    setEntryFormError("");
  }, []);

  const handleSaveArea = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAreaFormError("");

      if (!areaName.trim()) {
        setAreaFormError("Area name is required.");
        return;
      }

      const payload = {
        name: areaName.trim(),
        location: areaLocation.trim() || undefined,
        description: areaDescription.trim() || undefined,
        is_active: areaIsActive,
      };

      try {
        setIsSavingArea(true);

        if (editingAreaId) {
          await readResponseJson(
            await fetch(`/api/content/${editingAreaId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload }),
            }),
          );
        } else {
          await readResponseJson(
            await fetch("/api/content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                module_type: "rain_area",
                is_public: false,
                payload,
              }),
            }),
          );
        }

        setShowAreaForm(false);
        resetAreaForm();
        await fetchData();
      } catch (error) {
        setAreaFormError(
          error instanceof Error ? error.message : "Failed to save area.",
        );
      } finally {
        setIsSavingArea(false);
      }
    },
    [
      areaDescription,
      areaIsActive,
      areaLocation,
      areaName,
      editingAreaId,
      fetchData,
      resetAreaForm,
    ],
  );

  const handleDeleteArea = useCallback(
    async (id: string) => {
      if (
        !confirm(
          "Delete this area? Existing rain entries will stay in the database until you remove them separately.",
        )
      ) {
        return;
      }

      try {
        await readResponseJson(
          await fetch(`/api/content/${id}`, { method: "DELETE" }),
        );
        if (selectedAreaId === id) {
          setSelectedAreaId(null);
        }
        await fetchData();
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to delete area.",
        );
      }
    },
    [fetchData, selectedAreaId],
  );

  const handleSaveEntry = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setEntryFormError("");

      if (!selectedAreaId) {
        setEntryFormError("Select an area before logging rainfall.");
        return;
      }

      const amountDisplay = Number.parseFloat(entryAmount);
      if (!Number.isFinite(amountDisplay) || amountDisplay < 0) {
        setEntryFormError("Enter a valid rainfall amount.");
        return;
      }

      if (!entryDate) {
        setEntryFormError("Date is required.");
        return;
      }

      const payload = {
        area_id: selectedAreaId,
        rainfall_amount: amountDisplay * CONVERSION_TO_MM[displayUnit],
        rainfall_unit: "mm" as const,
        date: parseDateInputToISO(entryDate, entryTime),
        notes: entryNotes.trim() || undefined,
        source: entrySource,
      };

      try {
        setIsSavingEntry(true);

        if (editingEntryId) {
          await readResponseJson(
            await fetch(`/api/content/${editingEntryId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload }),
            }),
          );
        } else {
          await readResponseJson(
            await fetch("/api/content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                module_type: "rain_entry",
                is_public: false,
                payload,
              }),
            }),
          );
        }

        setShowEntryForm(false);
        resetEntryForm();
        await fetchData();
      } catch (error) {
        setEntryFormError(
          error instanceof Error ? error.message : "Failed to save entry.",
        );
      } finally {
        setIsSavingEntry(false);
      }
    },
    [
      displayUnit,
      editingEntryId,
      entryAmount,
      entryDate,
      entryNotes,
      entrySource,
      entryTime,
      fetchData,
      resetEntryForm,
      selectedAreaId,
    ],
  );

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      if (!confirm("Delete this rainfall entry?")) {
        return;
      }

      try {
        await readResponseJson(
          await fetch(`/api/content/${id}`, { method: "DELETE" }),
        );
        await fetchData();
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to delete entry.",
        );
      }
    },
    [fetchData],
  );

  if (loading) {
    return <AdminModuleSkeleton />;
  }

  return (
    <div className="-mx-6 -mb-6 flex flex-col gap-4 overflow-hidden px-4 pb-4 lg:-mx-8 lg:-mb-8 lg:h-[calc(100vh-7rem)] lg:flex-row lg:px-6 lg:pb-6">
      <AreaSidebar
        areas={areaListItems}
        summary={portfolioSummary}
        displayUnit={displayUnit}
        selectedAreaId={selectedAreaId}
        showAreaForm={showAreaForm}
        areaFormError={areaFormError}
        isSavingArea={isSavingArea}
        areaName={areaName}
        areaLocation={areaLocation}
        areaDescription={areaDescription}
        areaIsActive={areaIsActive}
        editingAreaId={editingAreaId}
        onSelectArea={setSelectedAreaId}
        onOpenNewArea={openNewArea}
        onEditArea={openEditArea}
        onDeleteArea={handleDeleteArea}
        onCloseAreaForm={closeAreaForm}
        onSaveArea={handleSaveArea}
        onAreaNameChange={setAreaName}
        onAreaLocationChange={setAreaLocation}
        onAreaDescriptionChange={setAreaDescription}
        onAreaIsActiveChange={setAreaIsActive}
      />

      {selectedArea ? (
        <motion.div
          key={selectedArea._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-accent/20 bg-accent/10 p-2">
                <CloudRain className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-zinc-100">
                  {selectedArea.payload.name}
                </h2>
                <p className="text-xs text-zinc-500">
                  {selectedArea.payload.location || "No location added"}
                </p>
                {selectedArea.payload.description ? (
                  <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                    {selectedArea.payload.description}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSettings((current) => !current);
                setShowFilters(false);
              }}
              className={cn(
                "rounded-xl border p-2 transition-all",
                showSettings
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300",
              )}
              aria-label="Toggle preferences"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          {loadError ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void fetchData();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-danger/10"
              >
                <RefreshCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : null}

          <RainTrackerPreferences
            open={showSettings}
            displayUnit={displayUnit}
            chartType={chartType}
            onClose={() => setShowSettings(false)}
            onDisplayUnitChange={(unit) =>
              void updateSettings({ defaultUnit: unit })
            }
            onChartTypeChange={(option) =>
              void updateSettings({ chartType: option })
            }
          />

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
            <div className="min-h-0 space-y-4 overflow-y-auto pr-0 xl:pr-1 no-scrollbar">
              <RainOverview
                analytics={analytics}
                last30Trend={last30Trend}
                displayUnit={displayUnit}
                chartType={chartType}
              />
            </div>
            <RainEntriesPanel
              entries={selectedAreaEntries}
              displayUnit={displayUnit}
              showFilters={showFilters}
              activePreset={filters.preset}
              searchQuery={searchQuery}
              filterAmountMin={filters.amountMin}
              filterAmountMax={filters.amountMax}
              filterNotes={filters.notes}
              showEntryForm={showEntryForm}
              editingEntryId={editingEntryId}
              entryAmount={entryAmount}
              entryDate={entryDate}
              entryTime={entryTime}
              entrySource={entrySource}
              entryNotes={entryNotes}
              entryFormError={entryFormError}
              isSavingEntry={isSavingEntry}
              onToggleFilters={() => setShowFilters((current) => !current)}
              onPresetChange={(preset) =>
                setFilters((current) => ({ ...current, preset }))
              }
              onSearchQueryChange={setSearchQuery}
              onFilterAmountMinChange={(value) =>
                setFilters((current) => ({ ...current, amountMin: value }))
              }
              onFilterAmountMaxChange={(value) =>
                setFilters((current) => ({ ...current, amountMax: value }))
              }
              onFilterNotesChange={(value) =>
                setFilters((current) => ({ ...current, notes: value }))
              }
              onClearFilters={() => setFilters({ ...EMPTY_FILTERS })}
              onOpenNewEntry={openNewEntry}
              onCloseEntryForm={closeEntryForm}
              onSaveEntry={handleSaveEntry}
              onEntryAmountChange={setEntryAmount}
              onEntryDateChange={setEntryDate}
              onEntryTimeChange={setEntryTime}
              onEntrySourceChange={setEntrySource}
              onEntryNotesChange={setEntryNotes}
              onEditEntry={openEditEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/30"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 scale-150 rounded-full bg-accent/5 blur-3xl" />
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <CloudRain className="h-10 w-10 text-zinc-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-zinc-400">
            No Area Selected
          </h3>
          <p className="mt-2 max-w-xs text-center text-sm text-zinc-600">
            Select an existing area or create a new one to view rainfall
            history.
          </p>
        </motion.div>
      )}
    </div>
  );
}
