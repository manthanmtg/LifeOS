"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CloudRain,
  Edit3,
  MapPin,
  Plus,
  RefreshCcw,
  Settings2,
} from "lucide-react";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { cn } from "@/lib/utils";
import { RainAreaSummary } from "./components/RainAreaSummary";
import {
  RainAreaEditor,
  RainEntryEditor,
} from "./components/RainEditorDialogs";
import { RainEntriesPanel } from "./components/RainEntriesPanel";
import { RainMeasurementGuide } from "./components/RainMeasurementGuide";
import { RainOverview } from "./components/RainOverview";
import { RainTrackerPreferences } from "./components/RainTrackerPreferences";
import {
  actionClass,
  controlClass,
  iconActionClass,
  primaryClass,
  secondaryClass,
} from "./components/styles";
import type {
  RainArea,
  RainEntry,
  RainFilters,
  RainSettings,
  RainUnit,
} from "./types";
import {
  buildRainAreaPortfolioSummary,
  buildRainAnalytics,
  DEFAULT_RAIN_SETTINGS,
  getAreaListItems,
  getLast30Trend,
  getVisibleRainEntries,
} from "./utils";

const EMPTY_FILTERS: RainFilters = {
  amountMin: "",
  amountMax: "",
  notes: "",
  preset: "all",
};

type RainEditor =
  | { type: "area"; area?: RainArea }
  | { type: "entry"; area: RainArea; entry?: RainEntry; unit: RainUnit }
  | { type: "preferences" }
  | { type: "guide" };

async function readResponseJson<T>(response: Response): Promise<T | undefined> {
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: string | { message?: string };
  } | null;
  if (!response.ok) {
    const error = body?.error;
    throw new Error(
      (typeof error === "string" ? error : error?.message) || "Request failed.",
    );
  }
  return body?.data;
}

async function saveRecord(
  moduleType: "rain_area" | "rain_entry",
  payload: RainArea["payload"] | RainEntry["payload"],
  id?: string,
) {
  const response = await fetch(id ? `/api/content/${id}` : "/api/content", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      id ? { payload } : { module_type: moduleType, is_public: false, payload },
    ),
  });
  return readResponseJson<{ _id: string }>(response);
}

async function deleteRecord(id: string) {
  await readResponseJson(
    await fetch(`/api/content/${id}`, { method: "DELETE" }),
  );
}

export default function RainTrackerAdminView() {
  const { settings, updateSettings, loaded } = useModuleSettings<RainSettings>(
    "rainTrackerSettings",
    DEFAULT_RAIN_SETTINGS,
  );
  const displayUnit = settings.defaultUnit || "mm";
  const chartType = settings.chartType || "bar";

  const [areas, setAreas] = useState<RainArea[]>([]);
  const [entries, setEntries] = useState<RainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [editor, setEditor] = useState<RainEditor | null>(null);
  const [filters, setFilters] = useState<RainFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async (preferredAreaId?: string) => {
    setLoadError("");
    try {
      const [nextAreas = [], nextEntries = []] = await Promise.all([
        fetch("/api/content?module_type=rain_area").then(
          readResponseJson<RainArea[]>,
        ),
        fetch("/api/content?module_type=rain_entry").then(
          readResponseJson<RainEntry[]>,
        ),
      ]);
      setAreas(nextAreas);
      setEntries(nextEntries);
      setSelectedAreaId((current) => {
        const desired = preferredAreaId ?? current;
        return nextAreas.some((area) => area._id === desired)
          ? desired
          : (nextAreas[0]?._id ?? null);
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load rainfall data.",
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
  const selectedAreaItem = areaListItems.find(
    ({ area }) => area._id === selectedAreaId,
  );
  const selectedArea = selectedAreaItem?.area;
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
    [areas, entries, displayUnit],
  );
  const analytics = useMemo(
    () => buildRainAnalytics(entries, selectedAreaId, displayUnit),
    [displayUnit, entries, selectedAreaId],
  );
  const editingArea = editor?.type === "area" ? editor.area : undefined;
  const last30Trend = getLast30Trend(analytics.last30, analytics.prevLast30);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearchQuery("");
  }

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div className="space-y-5 pb-4 sm:space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-x-4">
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-zinc-50 sm:text-4xl">
          Rain Tracker
        </h1>
        <div className="contents sm:flex sm:items-center sm:gap-2">
          {selectedArea && (
            <button
              type="button"
              onClick={() => setEditor({ type: "preferences" })}
              disabled={!loaded}
              aria-label="Rain Tracker preferences"
              aria-haspopup="dialog"
              title="Preferences"
              className={cn(
                iconActionClass,
                "col-start-2 row-start-1 border border-zinc-800 disabled:opacity-50",
              )}
            >
              <Settings2 aria-hidden="true" className="size-4" />
            </button>
          )}
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setEditor({ type: "guide" })}
              className={cn(
                actionClass,
                secondaryClass,
                "gap-1.5 px-2.5 sm:gap-2 sm:px-3",
              )}
            >
              <BookOpen
                aria-hidden="true"
                className="size-4 max-[350px]:hidden"
              />
              How to measure
            </button>
            {selectedArea && (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() =>
                  setEditor({
                    type: "entry",
                    area: selectedArea,
                    unit: displayUnit,
                  })
                }
                className={cn(actionClass, primaryClass, "sm:px-4")}
              >
                <Plus aria-hidden="true" className="size-4" />
                Log rainfall
              </button>
            )}
          </div>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-muted/20 px-4 py-3 text-sm text-danger"
        >
          <span>{loadError}</span>
          <button
            type="button"
            aria-label="Retry loading rain tracker"
            className={cn(
              actionClass,
              "border border-danger/30 hover:bg-danger/10",
            )}
            onClick={() => {
              if (!selectedArea) setLoading(true);
              void fetchData();
            }}
          >
            <RefreshCcw aria-hidden="true" className="size-4" />
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger"
        >
          {actionError}
        </p>
      )}

      {selectedArea && selectedAreaItem ? (
        <>
          <div className="grid gap-3 border-y border-zinc-800 py-3 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="flex min-w-0 items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial sm:gap-3">
                <span className="text-xs font-medium text-zinc-500">Area</span>
                <select
                  value={selectedArea._id}
                  onChange={(event) => {
                    setSelectedAreaId(event.target.value);
                    setActionError("");
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className={cn(
                    controlClass,
                    "font-medium sm:min-w-32 sm:max-w-64",
                  )}
                >
                  {areas.map((area) => (
                    <option key={area._id} value={area._id}>
                      {area.payload.name}
                      {area.payload.is_active === false ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Edit ${selectedArea.payload.name}`}
                title="Edit area"
                onClick={() => setEditor({ type: "area", area: selectedArea })}
                className={iconActionClass}
              >
                <Edit3 aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setEditor({ type: "area" })}
                aria-label="Add area"
                title="Add area"
                className={cn(
                  actionClass,
                  secondaryClass,
                  "max-[440px]:w-11 max-[440px]:px-0",
                )}
              >
                <Plus aria-hidden="true" className="size-4" />
                <span className="max-[440px]:hidden">Add area</span>
              </button>
            </div>
            {(selectedArea.payload.location ||
              selectedArea.payload.description) && (
              <div className="min-w-0 text-sm break-words text-zinc-500 sm:text-right">
                {selectedArea.payload.location && (
                  <p className="flex items-start gap-1.5 text-zinc-300 sm:justify-end">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-zinc-500"
                    />
                    <span className="min-w-0">
                      {selectedArea.payload.location}
                    </span>
                  </p>
                )}
                {selectedArea.payload.description && (
                  <p className="mt-0.5">{selectedArea.payload.description}</p>
                )}
              </div>
            )}
          </div>

          <RainOverview
            analytics={analytics}
            last30Trend={last30Trend}
            displayUnit={displayUnit}
            chartType={chartType}
          />

          <RainEntriesPanel
            entries={selectedAreaEntries}
            entryCount={selectedAreaItem.entryCount}
            displayUnit={displayUnit}
            filters={filters}
            showFilters={showFilters}
            searchQuery={searchQuery}
            onToggleFilters={() => setShowFilters((current) => !current)}
            onFiltersChange={(next) =>
              setFilters((current) => ({ ...current, ...next }))
            }
            onSearchQueryChange={setSearchQuery}
            onClearFilters={clearFilters}
            onEditEntry={(entry) =>
              setEditor({
                type: "entry",
                area: selectedArea,
                entry,
                unit: displayUnit,
              })
            }
            onDeleteEntry={async (id) => {
              if (!window.confirm("Delete this rainfall reading?")) return;
              setActionError("");
              try {
                await deleteRecord(id);
                await fetchData();
              } catch (error) {
                setActionError(
                  error instanceof Error
                    ? error.message
                    : "Failed to delete the reading.",
                );
              }
            }}
          />
          <RainAreaSummary
            areas={areaListItems}
            summary={portfolioSummary}
            displayUnit={displayUnit}
          />
        </>
      ) : !loadError ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 px-5 py-14 text-center">
          <CloudRain aria-hidden="true" className="mb-4 size-7 text-accent" />
          <h2 className="text-lg font-semibold text-zinc-100">No areas yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add an area to start logging rainfall.
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setEditor({ type: "area" })}
            className={cn(actionClass, primaryClass, "mt-5")}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add area
          </button>
        </section>
      ) : null}

      {editor?.type === "area" && (
        <RainAreaEditor
          area={editor.area}
          onClose={() => setEditor(null)}
          onSave={async (payload) => {
            const saved = await saveRecord(
              "rain_area",
              payload,
              editor.area?._id,
            );
            if (!editor.area) clearFilters();
            await fetchData(editor.area ? undefined : saved?._id);
            setEditor(null);
          }}
          onDelete={
            editingArea &&
            (async () => {
              if (
                !window.confirm(
                  "Delete this area? Its rainfall readings will stay in the database.",
                )
              )
                return;
              await deleteRecord(editingArea._id);
              clearFilters();
              await fetchData();
              setEditor(null);
            })
          }
        />
      )}
      {editor?.type === "entry" && (
        <RainEntryEditor
          area={editor.area}
          entry={editor.entry}
          displayUnit={editor.unit}
          onClose={() => setEditor(null)}
          onSave={async (payload) => {
            await saveRecord("rain_entry", payload, editor.entry?._id);
            if (!editor.entry) clearFilters();
            await fetchData();
            setEditor(null);
          }}
        />
      )}
      {editor?.type === "guide" && (
        <RainMeasurementGuide onClose={() => setEditor(null)} />
      )}
      {editor?.type === "preferences" && (
        <RainTrackerPreferences
          displayUnit={displayUnit}
          chartType={chartType}
          onClose={() => setEditor(null)}
          onSave={async (updates) => {
            if (!(await updateSettings(updates)))
              throw new Error("Could not save preferences. Try again.");
            if (updates.defaultUnit !== displayUnit) {
              setFilters((current) => ({
                ...current,
                amountMin: "",
                amountMax: "",
              }));
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}
