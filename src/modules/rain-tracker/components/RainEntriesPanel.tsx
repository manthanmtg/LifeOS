"use client";

import { CloudRain, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RainEntry,
  RainEntryListItem,
  RainFilters,
  RainDisplayUnit,
} from "../types";
import { DISPLAY_UNIT_LABELS, QUICK_FILTER_PRESETS } from "../utils";
import { RainEntryList } from "./RainEntryList";
import { actionClass, controlClass, secondaryClass } from "./styles";

export function RainEntriesPanel({
  entries,
  entryCount,
  displayUnit,
  filters,
  searchQuery,
  showFilters,
  onToggleFilters,
  onFiltersChange,
  onSearchQueryChange,
  onClearFilters,
  onEditEntry,
  onDeleteEntry,
}: {
  entries: RainEntryListItem[];
  entryCount: number;
  displayUnit: RainDisplayUnit;
  filters: RainFilters;
  searchQuery: string;
  showFilters: boolean;
  onToggleFilters: () => void;
  onFiltersChange: (filters: Partial<RainFilters>) => void;
  onSearchQueryChange: (query: string) => void;
  onClearFilters: () => void;
  onEditEntry: (entry: RainEntry) => void;
  onDeleteEntry: (id: string) => void;
}) {
  const advancedFilterCount = [
    filters.amountMin,
    filters.amountMax,
    filters.notes,
  ].filter(Boolean).length;
  const hasFilters =
    advancedFilterCount > 0 ||
    filters.preset !== "all" ||
    Boolean(searchQuery.trim());

  return (
    <section
      aria-labelledby="rain-log-title"
      className="@container/rain-log rounded-2xl border border-zinc-800 bg-zinc-950"
    >
      <div className="flex flex-col gap-4 border-b border-zinc-800 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2
            id="rain-log-title"
            className="text-lg font-semibold tracking-tight text-zinc-100"
          >
            Rainfall log
          </h2>
          <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
            {hasFilters ? `${entries.length} of ${entryCount}` : entryCount}{" "}
            {entryCount === 1 ? "reading" : "readings"}
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 @2xl/rain-log:grid-cols-[minmax(0,1fr)_11rem_auto]">
          <label className="relative col-span-2 min-w-0 @2xl/rain-log:col-span-1">
            <span className="sr-only">Search readings</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-zinc-500"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search readings"
              className={cn(controlClass, "pl-9")}
            />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Quick filter</span>
            <select
              value={filters.preset}
              onChange={(event) =>
                onFiltersChange({
                  preset: event.target.value as RainFilters["preset"],
                })
              }
              className={controlClass}
            >
              {QUICK_FILTER_PRESETS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={showFilters}
            aria-controls="rain-advanced-filters"
            className={cn(
              actionClass,
              secondaryClass,
              (showFilters || advancedFilterCount > 0) &&
                "border-accent/50 bg-accent/5",
            )}
          >
            <ListFilter aria-hidden="true" className="size-4" />
            Filters{advancedFilterCount > 0 && ` (${advancedFilterCount})`}
          </button>
        </div>

        <div hidden={!showFilters} id="rain-advanced-filters">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-900/60 p-3 @2xl/rain-log:grid-cols-[1fr_1fr_1.5fr]">
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-zinc-400">
              <span className="block">
                Minimum ({DISPLAY_UNIT_LABELS[displayUnit]})
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={filters.amountMin}
                onChange={(event) =>
                  onFiltersChange({ amountMin: event.target.value })
                }
                className={controlClass}
              />
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-zinc-400">
              <span className="block">
                Maximum ({DISPLAY_UNIT_LABELS[displayUnit]})
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={filters.amountMax}
                onChange={(event) =>
                  onFiltersChange({ amountMax: event.target.value })
                }
                className={controlClass}
              />
            </label>
            <label className="col-span-2 min-w-0 space-y-1.5 text-xs font-medium text-zinc-400 @2xl/rain-log:col-span-1">
              <span className="block">Notes contain</span>
              <input
                value={filters.notes}
                onChange={(event) =>
                  onFiltersChange({ notes: event.target.value })
                }
                className={controlClass}
              />
            </label>
          </div>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className={cn(
              actionClass,
              "min-h-9 self-start px-0 text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-zinc-100",
            )}
          >
            Clear filters
          </button>
        )}
      </div>

      {entries.length > 0 ? (
        <RainEntryList
          entries={entries}
          onEditEntry={onEditEntry}
          onDeleteEntry={onDeleteEntry}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          {entryCount > 0 ? (
            <Search aria-hidden="true" className="size-5 text-zinc-500" />
          ) : (
            <CloudRain aria-hidden="true" className="size-5 text-zinc-500" />
          )}
          <p className="text-sm font-semibold text-zinc-100">
            {entryCount > 0 ? "No matching readings" : "No readings yet"}
          </p>
          <p className="text-sm text-zinc-500">
            {entryCount > 0
              ? "Try another search or clear your filters."
              : "Log rainfall to start this area's history."}
          </p>
        </div>
      )}
    </section>
  );
}
