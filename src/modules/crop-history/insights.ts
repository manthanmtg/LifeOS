import { evaluateAllCalculatedFields, FormulaContext } from "./FormulaEngine";
import type { CropRecord, ModuleSettings } from "./AdminView";

export interface CropHistorySummary {
  bestCropName: string;
  latestRevenue: number;
  prevRevenue: number;
  latestPeriod: string;
  prevPeriod: string;
  totalCrops: number;
  totalPeriods: number;
}

export function getCropHistorySummary(
  records: CropRecord[],
  settings: ModuleSettings
): CropHistorySummary {
  if (!settings.crops.length || !settings.sources.length) {
    return {
      bestCropName: "",
      latestRevenue: 0,
      prevRevenue: 0,
      latestPeriod: "",
      prevPeriod: "",
      totalCrops: 0,
      totalPeriods: 0,
    };
  }

  const areaIds = settings.sources.map((s) => s.id);
  let bestCropName = "";
  let latestRevenue = 0;
  let prevRevenue = 0;
  let latestPeriod = "";
  let prevPeriod = "";

  for (const crop of settings.crops) {
    const cropRecords = records.filter((r) => r.payload.crop_id === crop.id);
    if (!cropRecords.length) continue;

    const revenueField = crop.analyticsConfig?.revenueFieldId
      ? crop.calculatedFields.find(
          (f) => f.id === crop.analyticsConfig?.revenueFieldId,
        )
      : crop.calculatedFields.find((f) => f.format === "currency");

    if (!revenueField) continue;

    const periods = Array.from(
      new Set(cropRecords.map((r) => r.payload.schedule_period)),
    ).sort();
    if (!periods.length) continue;

    const latest = periods[periods.length - 1];
    const prev = periods.length >= 2 ? periods[periods.length - 2] : null;

    const calcRevenue = (period: string) => {
      const rec = cropRecords.find(
        (r) => r.payload.schedule_period === period,
      );
      if (!rec) return 0;

      const areaValues: Record<string, Record<string, number>> = {};
      for (const aId of areaIds) {
        areaValues[aId] = {};
        for (const f of crop.sourceFields) {
          areaValues[aId][f.id] =
            Number(rec.payload.source_data?.[aId]?.[f.id]) || 0;
        }
      }
      const summaryValues: Record<string, number> = {};
      for (const f of crop.summaryFields) {
        summaryValues[f.id] = Number(rec.payload.summary_data?.[f.id]) || 0;
      }
      const constants: Record<string, number> = {};
      if (crop.constants) {
        for (const c of crop.constants) constants[c.id] = c.value;
      }
      const ctx: FormulaContext = {
        areaValues,
        summaryValues,
        calculatedValues: {},
        areaIds,
        constants,
      };
      const results = evaluateAllCalculatedFields(crop.calculatedFields, ctx);
      return results[revenueField.id] || 0;
    };

    const rev = calcRevenue(latest);
    if (rev > latestRevenue) {
      latestRevenue = rev;
      prevRevenue = prev ? calcRevenue(prev) : 0;
      latestPeriod = latest;
      prevPeriod = prev || "";
      bestCropName = crop.name;
    }
  }

  const totalCrops = settings.crops.length;
  const totalPeriods = new Set(records.map((r) => r.payload.schedule_period))
    .size;

  return {
    bestCropName,
    latestRevenue,
    prevRevenue,
    latestPeriod,
    prevPeriod,
    totalCrops,
    totalPeriods,
  };
}
