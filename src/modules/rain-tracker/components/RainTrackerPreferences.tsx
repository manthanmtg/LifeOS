"use client";

import { useRef } from "react";
import type { RainChartType, RainSettings, RainUnit } from "../types";
import { CHART_OPTIONS, UNIT_OPTIONS } from "../utils";
import { RainEditorDialog } from "./RainEditorDialogs";
import { controlClass } from "./styles";

const unitLabels: Record<RainUnit, string> = {
  mm: "Millimeters (mm)",
  cm: "Centimeters (cm)",
  in: "Inches (in)",
};

const chartLabels: Record<RainChartType, string> = {
  bar: "Bar chart",
  area: "Area chart",
};

export function RainTrackerPreferences({
  displayUnit,
  chartType,
  onClose,
  onSave,
}: {
  displayUnit: RainUnit;
  chartType: RainChartType;
  onClose: () => void;
  onSave: (settings: Partial<RainSettings>) => Promise<void>;
}) {
  const firstField = useRef<HTMLSelectElement>(null);
  return (
    <RainEditorDialog
      title="Rain Tracker preferences"
      submitLabel="Save preferences"
      initialFocusRef={firstField}
      onClose={onClose}
      onSave={(data) =>
        onSave({
          defaultUnit: data.get("unit") as RainUnit,
          chartType: data.get("chart") as RainChartType,
        })
      }
    >
      <div className="space-y-1.5 text-sm font-medium text-zinc-300">
        <label htmlFor="rain-preference-unit" className="block">
          Display unit
        </label>
        <select
          ref={firstField}
          id="rain-preference-unit"
          name="unit"
          defaultValue={displayUnit}
          className={controlClass}
        >
          {UNIT_OPTIONS.map((unit) => (
            <option key={unit} value={unit}>
              {unitLabels[unit]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5 text-sm font-medium text-zinc-300">
        <label htmlFor="rain-preference-chart" className="block">
          Chart style
        </label>
        <select
          id="rain-preference-chart"
          name="chart"
          defaultValue={chartType}
          className={controlClass}
        >
          {CHART_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {chartLabels[option]}
            </option>
          ))}
        </select>
      </div>
    </RainEditorDialog>
  );
}
