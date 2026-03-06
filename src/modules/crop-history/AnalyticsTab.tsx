"use client";

import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
    LineChart, Line, AreaChart, Area
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Wheat, MapPin, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluateAllCalculatedFields } from "./FormulaEngine";
import type { FormulaContext } from "./FormulaEngine";
import type { CropConfig, AreaDef, CropRecord, CalcFieldDef, FieldDef } from "./AdminView";

const COLORS = ["#34d399", "#60a5fa", "#f59e0b", "#f472b6", "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9"];

const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatNum = (val: number, decimals = 1) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(val);

interface AnalyticsTabProps {
    crops: CropConfig[];
    allRecords: CropRecord[];
    sources: AreaDef[];
}

interface CropAnalyticsProps {
    activeCrop: CropConfig;
    records: CropRecord[];
    schedulePeriods: string[];
    areas: AreaDef[];
}

export function AnalyticsTab({ crops, allRecords, sources }: AnalyticsTabProps) {
    const areas = sources || [];
    const [activeCropId, setActiveCropId] = useState<string | null>(crops?.[0]?.id || null);

    const activeCrop = useMemo(() => crops?.find((c: CropConfig) => c.id === activeCropId), [crops, activeCropId]);

    const records = useMemo(() =>
        (allRecords || []).filter((r: CropRecord) => r.payload.crop_id === activeCropId),
        [allRecords, activeCropId]
    );

    const schedulePeriods = useMemo(() => {
        if (!records.length) return [];
        const periods = Array.from(new Set(records.map((r: CropRecord) => r.payload.schedule_period)));
        return periods.sort();
    }, [records]);

    if (!crops?.length || !areas.length) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center py-12 shadow-sm">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-medium text-zinc-200">No Data Available</h3>
                <p className="text-zinc-500 mt-1">Configure crops and areas, then add data in the Spreadsheet tab to see analytics.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Crop Selector */}
            <div className="flex gap-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-sm overflow-x-auto hide-scrollbar">
                {crops.map((c: CropConfig) => (
                    <button key={c.id} onClick={() => setActiveCropId(c.id)}
                        className={cn("px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                            c.id === activeCropId ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner"
                                : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                        )}>
                        {c.name}
                    </button>
                ))}
            </div>

            {activeCrop && <CropAnalytics activeCrop={activeCrop} records={records} schedulePeriods={schedulePeriods} areas={areas} />}
        </div>
    );
}

function CropAnalytics({ activeCrop, records, schedulePeriods, areas }: CropAnalyticsProps) {
    const areaIds = useMemo(() => areas.map((a: AreaDef) => a.id), [areas]);

    const recordsByPeriod = useMemo(() => {
        const map: Record<string, CropRecord["payload"]> = {};
        records.forEach((r: CropRecord) => { map[r.payload.schedule_period] = r.payload; });
        return map;
    }, [records]);

    // Resolve which fields to use for analytics
    const revenueFieldId = activeCrop.analyticsConfig?.revenueFieldId
        || activeCrop.calculatedFields.find((f: CalcFieldDef) => f.format === 'currency')?.id;
    const yieldFieldId = activeCrop.analyticsConfig?.yieldFieldId
        || activeCrop.sourceFields[0]?.id;

    const revenueField = activeCrop.calculatedFields.find((f: CalcFieldDef) => f.id === revenueFieldId);
    const yieldField = activeCrop.sourceFields.find((f: FieldDef) => f.id === yieldFieldId);

    // Build full context per period
    const contextByPeriod = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        schedulePeriods.forEach((period: string) => {
            const rec = recordsByPeriod[period];
            if (!rec) { map[period] = {}; return; }

            const areaValues: Record<string, Record<string, number>> = {};
            for (const aId of areaIds) {
                areaValues[aId] = {};
                for (const f of activeCrop.sourceFields) {
                    areaValues[aId][f.id] = Number(rec.source_data?.[aId]?.[f.id]) || 0;
                }
            }

            const summaryValues: Record<string, number> = {};
            for (const f of activeCrop.summaryFields) {
                summaryValues[f.id] = Number(rec.summary_data?.[f.id]) || 0;
            }

            const constants: Record<string, number> = {};
            if (activeCrop.constants) {
                for (const c of activeCrop.constants) {
                    constants[c.id] = c.value;
                }
            }

            const ctx: FormulaContext = { areaValues, summaryValues, calculatedValues: {}, areaIds, constants };
            const calcResults = evaluateAllCalculatedFields(activeCrop.calculatedFields, ctx);

            // Flatten
            const flat: Record<string, number> = {};
            for (const f of activeCrop.sourceFields) {
                let total = 0;
                for (const aId of areaIds) { total += areaValues[aId]?.[f.id] || 0; }
                flat[f.id] = total;
                flat[`total_${f.id}`] = total;
            }
            for (const aId of areaIds) {
                for (const f of activeCrop.sourceFields) {
                    flat[`${aId}_${f.id}`] = areaValues[aId]?.[f.id] || 0;
                }
            }
            Object.assign(flat, summaryValues, calcResults);
            map[period] = flat;
        });
        return map;
    }, [schedulePeriods, recordsByPeriod, activeCrop, areaIds]);

    // KPIs
    const kpiData = useMemo(() => {
        const periods = schedulePeriods.filter((p: string) => Object.keys(contextByPeriod[p] || {}).length > 0);
        if (!periods.length) return null;

        const latest = periods[periods.length - 1];
        const prev = periods.length >= 2 ? periods[periods.length - 2] : null;
        const latestCtx = contextByPeriod[latest] || {};
        const prevCtx = prev ? (contextByPeriod[prev] || {}) : null;

        let bestArea = areas[0];
        let bestAreaVal = 0;
        if (yieldField) {
            areas.forEach((a: AreaDef) => {
                const val = latestCtx[`${a.id}_${yieldField.id}`] || 0;
                if (val > bestAreaVal) { bestAreaVal = val; bestArea = a; }
            });
        }

        const latestRevenue = revenueField ? (latestCtx[revenueField.id] || 0) : 0;
        const prevRevenue = revenueField && prevCtx ? (prevCtx[revenueField.id] || 0) : 0;
        const latestYield = yieldField ? (latestCtx[yieldField.id] || 0) : 0;
        const prevYield = yieldField && prevCtx ? (prevCtx[yieldField.id] || 0) : 0;

        let totalRevenue = 0;
        periods.forEach((p: string) => { totalRevenue += revenueField ? (contextByPeriod[p]?.[revenueField.id] || 0) : 0; });

        return {
            latestPeriod: latest, prevPeriod: prev,
            revenue: { current: latestRevenue, previous: prevRevenue, avg: periods.length ? totalRevenue / periods.length : 0, label: revenueField?.name || "Revenue" },
            yield: { current: latestYield, previous: prevYield, label: yieldField?.name || "Yield", unit: yieldField?.unit },
            bestArea: { name: bestArea?.name || "-", value: bestAreaVal, fieldName: yieldField?.name || "", unit: yieldField?.unit },
            totalPeriods: periods.length,
        };
    }, [schedulePeriods, contextByPeriod, areas, revenueField, yieldField]);

    // Per-area chart data (uses primary yield field)
    const perAreaChartData = useMemo(() => {
        if (!yieldField) return [];
        return areas.map((a: AreaDef) => {
            const entry: Record<string, number | string> = { name: a.name };
            schedulePeriods.forEach((period: string) => {
                const rec = recordsByPeriod[period];
                entry[period] = Number(rec?.source_data?.[a.id]?.[yieldField.id]) || 0;
            });
            return entry;
        });
    }, [areas, schedulePeriods, recordsByPeriod, yieldField]);

    // Revenue trend
    const revenueTrendData = useMemo(() => {
        if (!revenueField) return [];
        return schedulePeriods.map((period: string) => ({
            name: period, revenue: contextByPeriod[period]?.[revenueField.id] || 0
        }));
    }, [schedulePeriods, contextByPeriod, revenueField]);

    // Yield trends (all source fields)
    const trendData = useMemo(() => {
        return schedulePeriods.map((period: string) => {
            const ctx = contextByPeriod[period] || {};
            const entry: Record<string, number | string> = { name: period };
            activeCrop.sourceFields.forEach((f: FieldDef) => { entry[f.name] = ctx[f.id] || 0; });
            return entry;
        });
    }, [schedulePeriods, contextByPeriod, activeCrop]);

    const noData = !kpiData || schedulePeriods.every((p: string) => !recordsByPeriod[p]);

    if (noData) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center py-12 shadow-sm">
                <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-200">No Records Yet</h3>
                <p className="text-zinc-500 mt-1">Add data in the Spreadsheet tab for <strong>{activeCrop.name}</strong> to see analytics.</p>
            </div>
        );
    }

    const pctChange = (curr: number, prev: number) => prev ? ((curr - prev) / prev) * 100 : null;

    return (
        <>
            {/* KPI Cards */}
            {kpiData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {revenueField && (
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <p className="text-sm font-medium text-zinc-400">{kpiData.revenue.label} ({kpiData.latestPeriod})</p>
                            </div>
                            <p className="text-2xl font-bold text-emerald-400">{formatINR(kpiData.revenue.current)}</p>
                            {kpiData.prevPeriod && (() => {
                                const c = pctChange(kpiData.revenue.current, kpiData.revenue.previous);
                                if (c === null) return null;
                                return (
                                    <p className={cn("text-xs mt-1 flex items-center gap-1", c > 0 ? "text-emerald-500" : "text-red-400")}>
                                        {c > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {c > 0 ? "+" : ""}{c.toFixed(1)}% from {kpiData.prevPeriod}
                                    </p>
                                );
                            })()}
                            <p className="text-[10px] text-zinc-600 mt-2">Avg across {kpiData.totalPeriods} periods: {formatINR(kpiData.revenue.avg)}</p>
                        </div>
                    )}
                    {yieldField && (
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Wheat className="w-4 h-4 text-blue-500" />
                                <p className="text-sm font-medium text-zinc-400">Total {kpiData.yield.label} ({kpiData.latestPeriod})</p>
                            </div>
                            <p className="text-2xl font-bold text-blue-400">{formatNum(kpiData.yield.current, 0)}{kpiData.yield.unit ? ` ${kpiData.yield.unit}` : ''}</p>
                            {kpiData.prevPeriod && (() => {
                                const c = pctChange(kpiData.yield.current, kpiData.yield.previous);
                                if (c === null) return null;
                                return (
                                    <p className={cn("text-xs mt-1 flex items-center gap-1", c > 0 ? "text-emerald-500" : "text-red-400")}>
                                        {c > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {c > 0 ? "+" : ""}{c.toFixed(1)}% from {kpiData.prevPeriod}
                                    </p>
                                );
                            })()}
                        </div>
                    )}
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-amber-500" />
                            <p className="text-sm font-medium text-zinc-400">Best Area ({kpiData.latestPeriod})</p>
                        </div>
                        <p className="text-2xl font-bold text-zinc-100">{kpiData.bestArea.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">{formatNum(kpiData.bestArea.value, 0)} {kpiData.bestArea.unit || kpiData.bestArea.fieldName}</p>
                    </div>
                </div>
            )}

            {/* Per-Area Grouped Bar Chart */}
            {perAreaChartData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-medium text-zinc-200 mb-1">{activeCrop.name} by Area</h3>
                    <p className="text-xs text-zinc-500 mb-6">{yieldField?.name || "Primary field"} per area, grouped by period</p>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={perAreaChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickMargin={10} />
                                <YAxis stroke="#52525b" fontSize={12} tickFormatter={(val: number) => formatNum(val, 0)} />
                                <Tooltip cursor={{ fill: '#1a1a1e' }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => formatNum(Number(value), 0)} />
                                <Legend />
                                {schedulePeriods.map((period: string, idx: number) => (
                                    <Bar key={period} dataKey={period} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Revenue Trend */}
            {revenueTrendData.length > 0 && revenueTrendData.some((d: { revenue: number }) => d.revenue > 0) && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-medium text-zinc-200 mb-1">Revenue Trend</h3>
                    <p className="text-xs text-zinc-500 mb-6">{revenueField?.name || "Income"} over time</p>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id={`revenueGradient-${activeCrop.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={12} />
                                <YAxis stroke="#52525b" fontSize={12} tickFormatter={(val: number) => `${(val / 100000).toFixed(1)}L`} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => formatINR(Number(value))} />
                                <Area type="monotone" dataKey="revenue" stroke="#34d399" fill={`url(#revenueGradient-${activeCrop.id})`} strokeWidth={2} name={revenueField?.name || "Revenue"} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Yield Trends */}
            {trendData.length > 0 && activeCrop.sourceFields.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-lg font-medium text-zinc-200 mb-1">Yield Trends</h3>
                    <p className="text-xs text-zinc-500 mb-6">Total per-area field values over time</p>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={12} />
                                <YAxis stroke="#52525b" fontSize={12} tickFormatter={(val: number) => formatNum(val, 0)} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => formatNum(Number(value), 0)} />
                                <Legend />
                                {activeCrop.sourceFields.map((f: FieldDef, idx: number) => (
                                    <Line key={f.id} type="monotone" dataKey={f.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Comparison Table */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-medium text-zinc-200 mb-1">Period Comparison</h3>
                <p className="text-xs text-zinc-500 mb-4">All metrics with change indicators</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left px-3 py-2 text-zinc-400 font-medium">Metric</th>
                                {schedulePeriods.map((p: string) => <th key={p} className="text-right px-3 py-2 text-zinc-400 font-medium">{p}</th>)}
                                {schedulePeriods.length >= 2 && <th className="text-right px-3 py-2 text-zinc-400 font-medium">Change</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {activeCrop.sourceFields.map((f: FieldDef) => {
                                const values = schedulePeriods.map((p: string) => contextByPeriod[p]?.[f.id] || 0);
                                const last2 = values.slice(-2);
                                const change = last2.length === 2 && last2[0] > 0 ? ((last2[1] - last2[0]) / last2[0]) * 100 : null;
                                return (
                                    <tr key={f.id} className="hover:bg-zinc-800/30">
                                        <td className="px-3 py-2.5 text-zinc-300 font-medium">{f.name} (Total){f.unit && <span className="text-zinc-500 ml-1 text-xs">{f.unit}</span>}</td>
                                        {values.map((v: number, i: number) => <td key={i} className="text-right px-3 py-2.5 text-zinc-200 font-mono">{formatNum(v, 1)}</td>)}
                                        {schedulePeriods.length >= 2 && <td className="text-right px-3 py-2.5">{change !== null && <span className={cn("text-xs font-medium", change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-zinc-500")}>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>}</td>}
                                    </tr>
                                );
                            })}
                            {activeCrop.calculatedFields.map((f: CalcFieldDef) => {
                                const values = schedulePeriods.map((p: string) => contextByPeriod[p]?.[f.id] || 0);
                                const last2 = values.slice(-2);
                                const change = last2.length === 2 && last2[0] > 0 ? ((last2[1] - last2[0]) / last2[0]) * 100 : null;
                                const isCurrency = f.format === 'currency';
                                return (
                                    <tr key={f.id} className="hover:bg-zinc-800/30 bg-blue-950/5">
                                        <td className="px-3 py-2.5 text-blue-400/80 font-medium">{f.name}{f.unit && <span className="text-blue-500/40 ml-1 text-xs">{f.unit}</span>}</td>
                                        {values.map((v: number, i: number) => <td key={i} className="text-right px-3 py-2.5 text-blue-300 font-mono font-medium">{isCurrency ? formatINR(v) : formatNum(v, 1)}</td>)}
                                        {schedulePeriods.length >= 2 && <td className="text-right px-3 py-2.5">{change !== null && <span className={cn("text-xs font-medium", change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-zinc-500")}>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
