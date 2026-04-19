"use client";

import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  CloudRain,
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRainIntensity } from "../utils";
import type { RainEntry, RainEntryListItem, RainUnit } from "../types";

interface RainEntriesPanelProps {
  entries: RainEntryListItem[];
  displayUnit: RainUnit;
  showFilters: boolean;
  searchQuery: string;
  filterAmountMin: string;
  filterAmountMax: string;
  filterNotes: string;
  showEntryForm: boolean;
  editingEntryId: string | null;
  entryAmount: string;
  entryDate: string;
  entryTime: string;
  entrySource: string;
  entryNotes: string;
  entryFormError: string;
  isSavingEntry: boolean;
  onToggleFilters: () => void;
  onSearchQueryChange: (value: string) => void;
  onFilterAmountMinChange: (value: string) => void;
  onFilterAmountMaxChange: (value: string) => void;
  onFilterNotesChange: (value: string) => void;
  onClearFilters: () => void;
  onOpenNewEntry: () => void;
  onCloseEntryForm: () => void;
  onSaveEntry: (event: FormEvent<HTMLFormElement>) => void;
  onEntryAmountChange: (value: string) => void;
  onEntryDateChange: (value: string) => void;
  onEntryTimeChange: (value: string) => void;
  onEntrySourceChange: (value: string) => void;
  onEntryNotesChange: (value: string) => void;
  onEditEntry: (entry: RainEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export function RainEntriesPanel({
  entries,
  displayUnit,
  showFilters,
  searchQuery,
  filterAmountMin,
  filterAmountMax,
  filterNotes,
  showEntryForm,
  editingEntryId,
  entryAmount,
  entryDate,
  entryTime,
  entrySource,
  entryNotes,
  entryFormError,
  isSavingEntry,
  onToggleFilters,
  onSearchQueryChange,
  onFilterAmountMinChange,
  onFilterAmountMaxChange,
  onFilterNotesChange,
  onClearFilters,
  onOpenNewEntry,
  onCloseEntryForm,
  onSaveEntry,
  onEntryAmountChange,
  onEntryDateChange,
  onEntryTimeChange,
  onEntrySourceChange,
  onEntryNotesChange,
  onEditEntry,
  onDeleteEntry,
}: RainEntriesPanelProps) {
  const hasActiveFilters = Boolean(
    showFilters ||
    filterAmountMin ||
    filterAmountMax ||
    filterNotes ||
    searchQuery.trim(),
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
    >
      <div className="border-b border-zinc-800/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <CloudRain className="h-4 w-4 text-accent" />
            Entries
            <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
              {entries.length}
            </span>
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleFilters}
              className={cn(
                "rounded-lg border p-1.5 transition-all",
                hasActiveFilters
                  ? "border-accent/20 bg-accent/10 text-accent"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-300",
              )}
              aria-label="Toggle filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenNewEntry}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-zinc-50 transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-3 w-3" />
              Log
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search by note, source, or date"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFilters ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-zinc-800/80 bg-zinc-900/40"
          >
            <div className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Min ({displayUnit})
                </label>
                <input
                  type="number"
                  value={filterAmountMin}
                  onChange={(event) =>
                    onFilterAmountMinChange(event.target.value)
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Max ({displayUnit})
                </label>
                <input
                  type="number"
                  value={filterAmountMax}
                  onChange={(event) =>
                    onFilterAmountMaxChange(event.target.value)
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Notes
                </label>
                <input
                  value={filterNotes}
                  onChange={(event) => onFilterNotesChange(event.target.value)}
                  placeholder="Contains..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-zinc-200"
                  aria-label="Clear filters"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {showEntryForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="m-3 rounded-xl border border-accent/20 bg-zinc-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-200">
                    {editingEntryId ? "Edit entry" : "Log rainfall"}
                  </h4>
                  <button
                    type="button"
                    onClick={onCloseEntryForm}
                    className="text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label="Close entry form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form className="space-y-3" onSubmit={onSaveEntry}>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Amount ({displayUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      value={entryAmount}
                      onChange={(event) =>
                        onEntryAmountChange(event.target.value)
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-lg font-bold text-zinc-100 tabular-nums placeholder:text-zinc-700 focus:border-accent/50 focus:outline-none"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Date
                      </label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={(event) =>
                          onEntryDateChange(event.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Time
                      </label>
                      <input
                        type="time"
                        value={entryTime}
                        onChange={(event) =>
                          onEntryTimeChange(event.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Source
                      </label>
                      <select
                        value={entrySource}
                        onChange={(event) =>
                          onEntrySourceChange(event.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-accent/50 focus:outline-none"
                      >
                        <option value="manual">Manual</option>
                        <option value="sensor">Sensor</option>
                        <option value="imported">Imported</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Notes
                      </label>
                      <input
                        value={entryNotes}
                        onChange={(event) =>
                          onEntryNotesChange(event.target.value)
                        }
                        placeholder="Optional"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  {entryFormError ? (
                    <p className="text-xs text-danger">{entryFormError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={isSavingEntry}
                    className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-zinc-50 transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isSavingEntry
                      ? "Saving..."
                      : editingEntryId
                        ? "Update entry"
                        : "Save entry"}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {entries.length === 0 && !showEntryForm ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <CloudRain className="h-8 w-8 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-500">
              No entries match the current view.
            </p>
            <p className="text-xs text-zinc-600">
              Log a new reading or clear the filters to broaden the list.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 p-2">
            <AnimatePresence initial={false}>
              {entries.map((item, index) => {
                const intensity = getRainIntensity(
                  item.entry.payload.rainfall_amount,
                );
                const IntensityIcon = intensity.icon;

                return (
                  <motion.div
                    key={item.entry._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 transition-all hover:border-zinc-700/60 hover:bg-zinc-900/70"
                  >
                    <div className="hidden min-w-[54px] flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 sm:flex">
                      <span className="text-[10px] font-medium leading-none text-zinc-500">
                        {item.monthLabel}
                      </span>
                      <span className="text-sm font-bold leading-tight text-zinc-200">
                        {item.dayLabel}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "shrink-0 rounded-lg border p-1.5",
                        intensity.bgColor,
                      )}
                    >
                      <IntensityIcon
                        className={cn("h-3.5 w-3.5", intensity.color)}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-base font-bold tabular-nums text-zinc-100">
                          {item.displayAmount}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-500">
                          {displayUnit}
                        </span>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                            intensity.bgColor,
                            intensity.color,
                          )}
                        >
                          {intensity.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {item.dateLabel} at {item.timeLabel}
                        </span>
                        <span className="capitalize">
                          {item.entry.payload.source}
                        </span>
                        {item.entry.payload.notes ? (
                          <span className="truncate">
                            {item.entry.payload.notes}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEditEntry(item.entry)}
                        className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-accent"
                        aria-label={`Edit ${item.dateLabel} entry`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(item.entry._id)}
                        className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-danger"
                        aria-label={`Delete ${item.dateLabel} entry`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.section>
  );
}
