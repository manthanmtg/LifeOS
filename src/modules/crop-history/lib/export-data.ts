import { evaluateAllCalculatedFields } from "../FormulaEngine";
import type { AreaDef, CropConfig, CropRecord } from "../AdminView";

export type CropExportFormat = "xlsx" | "pdf" | "html";
export type CropExportRecord = Pick<CropRecord, "_id" | "payload">;

export interface CropExportOptions {
  periods: string[];
  includeNotes: boolean;
}

export interface CropExportRow {
  section: "area" | "total" | "summary" | "calculated" | "notes";
  group: string;
  label: string;
  unit: string;
  format: "number" | "currency" | "percentage" | "text";
  values: Array<number | string | null>;
}

export interface CropExportReport {
  cropId: string;
  cropName: string;
  generatedAt: string;
  localDate: string;
  timeZone: string;
  areaCount: number;
  periods: string[];
  rows: CropExportRow[];
}

function dateForFilename(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function numeric(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const result =
    typeof value === "string" && value.trim() === "" ? 0 : Number(value);
  return Number.isFinite(result) ? result : null;
}

export function buildCropExportReport({
  crop,
  areas,
  records,
  orderedPeriods,
  options,
  now,
  timeZone,
}: {
  crop: CropConfig;
  areas: AreaDef[];
  records: CropExportRecord[];
  orderedPeriods: string[];
  options: CropExportOptions;
  now: Date;
  timeZone: string;
}): CropExportReport {
  const requested = new Set(options.periods);
  if (!requested.size)
    throw new Error("Select at least one period to download.");

  const cropRecords = records.filter(
    (record) => record.payload.crop_id === crop.id,
  );
  const byPeriod = new Map<string, CropExportRecord>();
  for (const record of cropRecords) {
    const period = record.payload.schedule_period;
    if (byPeriod.has(period))
      throw new Error(
        "Duplicate saved records were found. Reload and try again.",
      );
    byPeriod.set(period, record);
  }

  const periods = orderedPeriods.filter((period) => requested.has(period));
  if (
    periods.length !== requested.size ||
    periods.some((period) => !byPeriod.has(period))
  ) {
    throw new Error("The selected records changed. Reload and try again.");
  }

  const rows: CropExportRow[] = [];
  for (const area of areas) {
    for (const field of crop.sourceFields) {
      rows.push({
        section: "area",
        group: area.name,
        label: field.name,
        unit: field.unit || "",
        format: "number",
        values: periods.map((period) =>
          numeric(
            byPeriod.get(period)?.payload.source_data?.[area.id]?.[field.id],
          ),
        ),
      });
    }
  }

  if (areas.length > 1) {
    for (const field of crop.sourceFields) {
      rows.push({
        section: "total",
        group: "Totals",
        label: field.name,
        unit: field.unit || "",
        format: "number",
        values: periods.map((period) =>
          areas.reduce(
            (total, area) =>
              total +
              (numeric(
                byPeriod.get(period)?.payload.source_data?.[area.id]?.[
                  field.id
                ],
              ) ?? 0),
            0,
          ),
        ),
      });
    }
  }

  for (const field of crop.summaryFields) {
    rows.push({
      section: "summary",
      group: "Period inputs",
      label: field.name,
      unit: field.unit || "",
      format: "number",
      values: periods.map((period) =>
        numeric(byPeriod.get(period)?.payload.summary_data?.[field.id]),
      ),
    });
  }

  if (crop.calculatedFields.length) {
    const calculated = new Map<string, Record<string, number>>();
    for (const period of periods) {
      const record = byPeriod.get(period)!;
      const areaValues: Record<string, Record<string, number>> = {};
      for (const area of areas) {
        areaValues[area.id] = {};
        for (const field of crop.sourceFields) {
          areaValues[area.id][field.id] =
            numeric(record.payload.source_data?.[area.id]?.[field.id]) ?? 0;
        }
      }
      const summaryValues: Record<string, number> = {};
      for (const field of crop.summaryFields)
        summaryValues[field.id] =
          numeric(record.payload.summary_data?.[field.id]) ?? 0;
      const constants = Object.fromEntries(
        (crop.constants || []).map((constant) => [constant.id, constant.value]),
      );
      calculated.set(
        period,
        evaluateAllCalculatedFields(crop.calculatedFields, {
          areaValues,
          summaryValues,
          calculatedValues: {},
          areaIds: areas.map((area) => area.id),
          constants,
        }),
      );
    }
    for (const field of crop.calculatedFields) {
      rows.push({
        section: "calculated",
        group: "Calculated",
        label: field.name,
        unit: field.unit || "",
        format: field.format,
        values: periods.map(
          (period) => calculated.get(period)?.[field.id] ?? 0,
        ),
      });
    }
  }

  if (options.includeNotes) {
    rows.push({
      section: "notes",
      group: "Notes",
      label: "Notes",
      unit: "",
      format: "text",
      values: periods.map(
        (period) => byPeriod.get(period)?.payload.notes?.trim() || null,
      ),
    });
  }

  if (!rows.length)
    throw new Error("There are no fields to download for this crop.");
  if (rows.length * (3 + periods.length) > 100000)
    throw new Error(
      "This download is too large. Select fewer periods and try again.",
    );

  return {
    cropId: crop.id,
    cropName: crop.name,
    generatedAt: now.toISOString(),
    localDate: dateForFilename(now, timeZone),
    timeZone,
    areaCount: areas.length,
    periods,
    rows,
  };
}

export function formatExportValue(
  value: number | string | null,
  format: CropExportRow["format"],
) {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (format === "currency")
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  if (format === "percentage")
    return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}%`;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(
    value,
  );
}
