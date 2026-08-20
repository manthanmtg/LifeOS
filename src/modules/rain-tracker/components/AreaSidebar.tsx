"use client";

import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Droplets, Edit3, MapPin, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RainArea,
  RainAreaListItem,
  RainAreaPortfolioSummary,
  RainUnit,
} from "../types";
import { RainAreaSummary } from "./RainAreaSummary";

interface AreaSidebarProps {
  areas: RainAreaListItem[];
  summary: RainAreaPortfolioSummary;
  displayUnit: RainUnit;
  selectedAreaId: string | null;
  showAreaForm: boolean;
  areaFormError: string;
  isSavingArea: boolean;
  areaName: string;
  areaLocation: string;
  areaDescription: string;
  areaIsActive: boolean;
  editingAreaId: string | null;
  onSelectArea: (id: string) => void;
  onOpenNewArea: () => void;
  onEditArea: (area: RainArea) => void;
  onDeleteArea: (id: string) => void;
  onCloseAreaForm: () => void;
  onSaveArea: (event: FormEvent<HTMLFormElement>) => void;
  onAreaNameChange: (value: string) => void;
  onAreaLocationChange: (value: string) => void;
  onAreaDescriptionChange: (value: string) => void;
  onAreaIsActiveChange: (value: boolean) => void;
}

export function AreaSidebar({
  areas,
  summary,
  displayUnit,
  selectedAreaId,
  showAreaForm,
  areaFormError,
  isSavingArea,
  areaName,
  areaLocation,
  areaDescription,
  areaIsActive,
  editingAreaId,
  onSelectArea,
  onOpenNewArea,
  onEditArea,
  onDeleteArea,
  onCloseAreaForm,
  onSaveArea,
  onAreaNameChange,
  onAreaLocationChange,
  onAreaDescriptionChange,
  onAreaIsActiveChange,
}: AreaSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full lg:w-80 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950"
    >
      <div className="border-b border-zinc-800/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-200">
            <MapPin className="h-4 w-4 text-accent" />
            Areas
            <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-zinc-500">
              {areas.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={onOpenNewArea}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-accent/30 hover:text-accent"
            aria-label="Create area"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <RainAreaSummary summary={summary} displayUnit={displayUnit} />

      <AnimatePresence initial={false}>
        {showAreaForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="m-3 rounded-xl border border-accent/20 bg-zinc-900/70 p-3">
              <h3 className="mb-2.5 text-xs font-semibold text-zinc-300">
                {editingAreaId ? "Edit area" : "New area"}
              </h3>
              <form className="space-y-2.5" onSubmit={onSaveArea}>
                <input
                  autoFocus
                  value={areaName}
                  onChange={(event) => onAreaNameChange(event.target.value)}
                  placeholder="Name"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none"
                />
                <input
                  value={areaLocation}
                  onChange={(event) => onAreaLocationChange(event.target.value)}
                  placeholder="Location"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={areaDescription}
                  onChange={(event) =>
                    onAreaDescriptionChange(event.target.value)
                  }
                  placeholder="Description"
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none"
                />
                <label className="flex cursor-pointer items-center gap-2 px-1 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={areaIsActive}
                    onChange={(event) =>
                      onAreaIsActiveChange(event.target.checked)
                    }
                    className="accent-accent"
                  />
                  Active
                </label>
                {areaFormError ? (
                  <p className="text-xs text-danger">{areaFormError}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onCloseAreaForm}
                    className="px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingArea}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-zinc-50 transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isSavingArea ? "Saving..." : "Save area"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="max-h-[46rem] space-y-1.5 overflow-y-auto px-3 pb-3 no-scrollbar">
        {areas.length === 0 && !showAreaForm ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <MapPin className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500">
              Add an area before you start logging rainfall.
            </p>
          </div>
        ) : null}

        {areas.map(({ area, entryCount, lastRainLabel }, index) => {
          const isSelected = selectedAreaId === area._id;

          return (
            <motion.div
              key={area._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={cn(
                "group relative rounded-xl border transition-all",
                isSelected
                  ? "border-accent/25 bg-accent/8 shadow-[0_0_20px_-8px_var(--color-accent)]"
                  : "border-transparent bg-zinc-900/30 hover:border-zinc-800 hover:bg-zinc-900/60",
              )}
            >
              {isSelected ? (
                <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
              ) : null}

              <motion.button
                type="button"
                onClick={() => onSelectArea(area._id)}
                className="block w-full cursor-pointer rounded-xl p-3 pr-16 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                <div className="min-w-0 overflow-hidden">
                  <h4
                    className={cn(
                      "flex items-center gap-1.5 truncate text-sm font-semibold",
                      isSelected ? "text-accent" : "text-zinc-200",
                    )}
                  >
                    {area.payload.name}
                    {!area.payload.is_active ? (
                      <span className="shrink-0 rounded-md bg-danger/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-danger">
                        Archived
                      </span>
                    ) : null}
                  </h4>
                  {area.payload.location ? (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {area.payload.location}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Droplets className="h-2.5 w-2.5" />
                      {entryCount} {entryCount === 1 ? "entry" : "entries"}
                    </span>
                    {lastRainLabel ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {lastRainLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </motion.button>

              <div className="absolute right-3 top-3 flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-0.5 opacity-60 transition-all group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditArea(area);
                  }}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  aria-label={`Edit ${area.payload.name}`}
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteArea(area._id);
                  }}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
                  aria-label={`Delete ${area.payload.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.aside>
  );
}
