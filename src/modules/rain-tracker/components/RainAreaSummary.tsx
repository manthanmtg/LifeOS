"use client";

import { ChevronDown } from "lucide-react";
import type {
  RainAreaListItem,
  RainAreaPortfolioSummary,
  RainUnit,
} from "../types";
import { disclosureClass } from "./styles";

export function RainAreaSummary({
  areas,
  summary,
  displayUnit,
}: {
  areas: RainAreaListItem[];
  summary: RainAreaPortfolioSummary;
  displayUnit: RainUnit;
}) {
  return (
    <details className="@container/rain-areas group rounded-2xl border border-zinc-800 px-5 sm:px-6">
      <summary className={disclosureClass}>
        Across all areas
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-zinc-500 group-open:rotate-180"
        />
      </summary>
      <dl className="grid grid-cols-2 gap-4 border-t border-zinc-800 py-4 @2xl/rain-areas:grid-cols-4">
        <div>
          <dt className="text-xs text-zinc-500">Active areas</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-zinc-100">
            {summary.activeAreas} of {summary.totalAreas}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Rainfall logged in 7 days</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-zinc-100">
            {summary.last7Total.toLocaleString()} {displayUnit}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">
            Areas without a reading in 7 days
          </dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-zinc-100">
            {summary.staleAreaCount}
          </dd>
        </div>
        {summary.wettestArea && (
          <div className="min-w-0">
            <dt className="text-xs text-zinc-500">
              {summary.wettestArea.label}
            </dt>
            <dd className="mt-1 text-sm font-medium break-words text-zinc-100">
              {summary.wettestArea.value}
            </dd>
            <dd className="text-xs text-zinc-500">
              {summary.wettestArea.sublabel}
            </dd>
          </div>
        )}
      </dl>
      {areas.length > 1 && (
        <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
          {areas.map(({ area, entryCount, lastRainLabel }) => (
            <li
              key={area._id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm"
            >
              <span className="min-w-0 font-medium break-words text-zinc-300">
                {area.payload.name}
              </span>
              <span className="text-xs tabular-nums text-zinc-500">
                {entryCount} {entryCount === 1 ? "reading" : "readings"}
                {lastRainLabel && ` · Latest ${lastRainLabel}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
