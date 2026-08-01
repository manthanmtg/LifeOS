"use client";

import { useState } from "react";
import { Bell, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { NOTIFICATION_OFFSET_PRESETS } from "@/lib/notifications/contracts";
import { normalizeNotificationOffsetsDays } from "@/lib/notifications/recurring-preferences";

export interface RelativeDateNotificationFieldsProps {
  enabled: boolean;
  offsetsDays: number[];
  disabled?: boolean;
  eventLabel: string;
  onEnabledChange(enabled: boolean): void;
  onOffsetsChange(offsetsDays: number[]): void;
}

function labelForOffset(offset: number, eventLabel: string) {
  if (offset === 0) return `${eventLabel} day`;
  if (offset === 1) return "1 day before";
  return `${offset} days before`;
}

export function RelativeDateNotificationFields({
  enabled,
  offsetsDays,
  disabled = false,
  eventLabel,
  onEnabledChange,
  onOffsetsChange,
}: RelativeDateNotificationFieldsProps) {
  const [customOffset, setCustomOffset] = useState("");
  const selected = normalizeNotificationOffsetsDays(offsetsDays);
  const isControlDisabled = disabled || !enabled;

  const toggleOffset = (offset: number) => {
    const next = selected.includes(offset)
      ? selected.filter((value) => value !== offset)
      : [...selected, offset];
    onOffsetsChange(normalizeNotificationOffsetsDays(next));
  };

  const addCustomOffset = () => {
    const parsed = Number(customOffset);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) return;
    onOffsetsChange(normalizeNotificationOffsetsDays([...selected, parsed]));
    setCustomOffset("");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => {
              const nextEnabled = event.target.checked;
              onEnabledChange(nextEnabled);
              if (nextEnabled && selected.length === 0) {
                onOffsetsChange([1]);
              }
            }}
            className="h-4 w-4 rounded border-zinc-700 accent-accent"
          />
          <Bell className="h-4 w-4 text-accent" />
          Notify of {eventLabel.toLowerCase()}
        </label>
        <span className="text-xs text-zinc-500">
          {enabled ? `${selected.length} timing rule(s)` : "Notifications off"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NOTIFICATION_OFFSET_PRESETS.map((offset) => (
          <label
            key={offset}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              selected.includes(offset)
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400",
              isControlDisabled && "opacity-50",
            )}
          >
            <input
              type="checkbox"
              checked={selected.includes(offset)}
              disabled={isControlDisabled}
              onChange={() => toggleOffset(offset)}
              className="h-4 w-4 rounded border-zinc-700 accent-accent"
            />
            {labelForOffset(offset, eventLabel)}
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-xs text-zinc-500">
          Custom day offset
          <input
            type="number"
            min={0}
            max={365}
            value={customOffset}
            disabled={isControlDisabled}
            onChange={(event) => setCustomOffset(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        <button
          type="button"
          disabled={isControlDisabled}
          onClick={addCustomOffset}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-accent/30 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
        >
          <Plus className="h-4 w-4" />
          <span>Add custom notification offset</span>
        </button>
      </div>
    </div>
  );
}
