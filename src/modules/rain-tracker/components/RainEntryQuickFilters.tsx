"use client";

import { cn } from "@/lib/utils";
import type { RainFilterPreset } from "../types";
import { QUICK_FILTER_PRESETS } from "../utils";

interface RainEntryQuickFiltersProps {
  activePreset: RainFilterPreset;
  onChange: (preset: RainFilterPreset) => void;
}

export function RainEntryQuickFilters({
  activePreset,
  onChange,
}: RainEntryQuickFiltersProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {QUICK_FILTER_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
            activePreset === preset.id
              ? "border-accent/20 bg-accent/10 text-accent"
              : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
