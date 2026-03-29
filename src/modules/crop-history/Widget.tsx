"use client";

import { useEffect, useState, useMemo } from "react";
import { Wheat, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { cn } from "@/lib/utils";
import type { ModuleSettings, CropRecord } from "./AdminView";
import { evaluateAllCalculatedFields } from "./FormulaEngine";
import type { FormulaContext } from "./FormulaEngine";

const DEFAULT_SETTINGS: ModuleSettings = { crops: [], sources: [] };

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function CropHistoryWidget() {
  const { settings, loaded } = useModuleSettings<ModuleSettings>(
    "cropHistorySettings",
    DEFAULT_SETTINGS,
  );
  const [records, setRecords] = useState<CropRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=crop_history")
      .then((r) => r.json())
      .then((d) => setRecords(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!loaded || !settings.crops.length || !settings.sources.length)
      return null;

    const areaIds = settings.sources.map((s) => s.id);
    let bestCropName = "";
    let latestRevenue = 0;
    let prevRevenue = 0;
    let latestPeriod = "";
    let prevPeriod = "";

    for (const crop of settings.crops) {
      const cropRecords = records.filter(
        (r) => r.payload.crop_id === crop.id,
      );
      if (!cropRecords.length) continue;

      const revenueField =
        crop.analyticsConfig?.revenueFieldId
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
  }, [loaded, settings, records]);

  const pctChange =
    stats && stats.prevRevenue > 0
      ? ((stats.latestRevenue - stats.prevRevenue) / stats.prevRevenue) * 100
      : null;

  return (
    <WidgetCard
      title="Crop History"
      icon={Wheat}
      loading={loading || !loaded}
      href="/admin/crop-history"
      accentColor="success"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {stats?.totalPeriods ?? 0} periods recorded
          </span>
          <span>{stats?.totalCrops ?? 0} crops</span>
        </div>
      }
    >
      <div className="py-2 space-y-3">
        {stats && stats.latestRevenue > 0 ? (
          <>
            <div>
              <p className="text-3xl font-bold text-zinc-50 tracking-tight">
                {formatINR(stats.latestRevenue)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-widest leading-none">
                {stats.bestCropName} · {stats.latestPeriod}
              </p>
            </div>
            {pctChange !== null && (
              <p
                className={cn(
                  "text-xs flex items-center gap-1 font-medium",
                  pctChange > 0 ? "text-success" : "text-danger",
                )}
              >
                {pctChange > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {pctChange > 0 ? "+" : ""}
                {pctChange.toFixed(1)}% vs {stats.prevPeriod}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500 py-2">
            <Wheat className="w-5 h-5 opacity-40" />
            <p className="text-sm">No revenue data yet</p>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
