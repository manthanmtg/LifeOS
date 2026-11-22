"use client";

import { Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RainEntry, RainEntryListItem, RainUnit } from "../types";
import { getRainIntensity } from "../utils";
import { iconActionClass } from "./styles";

const rowColumns =
  "@2xl/rain-log:grid-cols-[minmax(8.5rem,1fr)_minmax(7rem,0.9fr)_minmax(4.5rem,0.7fr)_minmax(0,1.5fr)_5.5rem]";

export function RainEntryList({
  entries,
  displayUnit,
  onEditEntry,
  onDeleteEntry,
}: {
  entries: RainEntryListItem[];
  displayUnit: RainUnit;
  onEditEntry: (entry: RainEntry) => void;
  onDeleteEntry: (id: string) => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "hidden gap-3 border-b border-zinc-800 bg-zinc-900/50 px-5 py-2.5 text-xs font-medium text-zinc-500 sm:px-6 @2xl/rain-log:grid",
          rowColumns,
        )}
      >
        <span>Date</span>
        <span>Rainfall</span>
        <span>Source</span>
        <span>Notes</span>
      </div>
      <ul aria-label="Rainfall readings" className="divide-y divide-zinc-800">
        {entries.map((item) => {
          const { label: intensity, color } = getRainIntensity(
            item.entry.payload.rainfall_amount,
          );
          const notes = item.entry.payload.notes;
          return (
            <li
              key={item.entry._id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_5.5rem] items-start gap-x-3 gap-y-1 px-4 py-3 hover:bg-zinc-900/35 sm:px-6 @2xl/rain-log:items-center",
                rowColumns,
              )}
            >
              <time
                dateTime={item.entry.payload.date}
                className="text-sm font-medium text-zinc-100"
              >
                {item.dateLabel}
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  {item.timeLabel}
                  <span className="@2xl/rain-log:hidden">
                    {" "}
                    · {item.sourceLabel}
                  </span>
                </span>
              </time>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold tabular-nums text-zinc-100">
                  {item.displayAmount}{" "}
                  <span className="text-xs font-normal text-zinc-500">
                    {displayUnit}
                  </span>
                </p>
                <p className={cn("mt-0.5 text-xs font-medium", color)}>
                  {intensity}
                </p>
              </div>
              <span className="hidden text-sm text-zinc-400 @2xl/rain-log:block">
                {item.sourceLabel}
              </span>
              <p
                className={cn(
                  "col-span-3 row-start-2 break-words text-sm text-zinc-400 @2xl/rain-log:col-span-1 @2xl/rain-log:row-start-auto",
                  !notes && "hidden @2xl/rain-log:block",
                )}
              >
                {notes || "—"}
              </p>
              <div className="col-start-3 row-start-1 -my-1.5 flex justify-end @2xl/rain-log:col-start-auto @2xl/rain-log:row-start-auto">
                <button
                  type="button"
                  onClick={() => onEditEntry(item.entry)}
                  className={iconActionClass}
                  aria-label={`Edit reading from ${item.dateLabel} at ${item.timeLabel}`}
                >
                  <Edit3 aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(item.entry._id)}
                  className={cn(iconActionClass, "hover:text-danger")}
                  aria-label={`Delete reading from ${item.dateLabel} at ${item.timeLabel}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
