"use client";

import { useMemo, useState, useEffect, useRef } from "react";

import { AlertTriangle, Plus, Save, RefreshCw, Trash2, X, MessageSquare, TrendingUp, TrendingDown, GripVertical } from "lucide-react";
import { Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import { evaluateAllCalculatedFields } from "./FormulaEngine";
import type { FormulaContext } from "./FormulaEngine";
import ConfirmDialog from "./ConfirmDialog";
import Toast, { ToastType } from "./Toast";

// --- Types (from AdminView) ---
interface FieldDef {
    id: string;
    name: string;
    type: "number" | "text";
    unit?: string;
}

interface CalcFieldDef {
    id: string;
    name: string;
    formula: string;
    format: "number" | "currency" | "percentage";
    unit?: string;
}

interface AreaDef {
    id: string;
    name: string;
}

interface ConstantDef {
    id: string;
    name: string;
    value: number;
}

interface CropConfig {
    id: string;
    name: string;
    scheduleType: "yearly" | "half-yearly" | "quarterly" | "monthly" | "custom";
    sourceFields: FieldDef[];
    summaryFields: FieldDef[];
    calculatedFields: CalcFieldDef[];
    constants?: ConstantDef[];
    periodOrder?: string[];
}

interface CropRecord {
    _id: string;
    payload: {
        crop_id: string;
        schedule_period: string;
        source_data: Record<string, Record<string, number>>;
        summary_data: Record<string, number>;
        notes?: string;
    };
}

interface PeriodData {
    _id?: string;
    source_data: Record<string, Record<string, number | string>>;
    summary_data: Record<string, number | string>;
    notes?: string;
}

type LocalData = Record<string, PeriodData>;

interface SpreadsheetTabProps {
    activeCrop: CropConfig | undefined;
    crops: CropConfig[];
    areas: AreaDef[];
    records: CropRecord[];
    schedulePeriods: string[];
    setActiveCropId: (id: string) => void;
    onReorderPeriods: (newOrder: string[]) => void;
    onRefresh: () => void;
}


const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatNum = (val: number, decimals = 1) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(val);

function YoYBadge({ current, previous }: { current: number; previous: number }) {
    if (!previous || previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.1) return null;
    const isUp = pct > 0;
    return (
        <span className={cn(
            "inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded ml-1",
            isUp ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
        )}>
            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isUp ? "+" : ""}{pct.toFixed(1)}%
        </span>
    );
}

function formatCalcValue(val: number, format?: string, unit?: string): string {
    let str = "";
    if (format === "currency") str = formatINR(val);
    else if (format === "percentage") str = `${formatNum(val, 1)}%`;
    else str = formatNum(val, 1);
    if (unit && format !== "currency" && format !== "percentage") str += ` ${unit}`;
    return str;
}

export function SpreadsheetTab({ activeCrop, crops, areas, records, schedulePeriods: externalPeriods, setActiveCropId, onReorderPeriods, onRefresh }: SpreadsheetTabProps) {
    const [localData, setLocalData] = useState<LocalData>({});
    const [isSaving, setIsSaving] = useState(false);
    const [savingPeriod, setSavingPeriod] = useState<string | null>(null);
    const [showAddPeriod, setShowAddPeriod] = useState(false);
    const [newPeriodValue, setNewPeriodValue] = useState("");
    const [localPeriods, setLocalPeriods] = useState<string[]>([]);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: "danger" | "warning";
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { }
    });

    const [toastState, setToastState] = useState<{
        isVisible: boolean;
        message: string;
        type: ToastType;
    }>({
        isVisible: false,
        message: "",
        type: "success"
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const showToast = (message: string, type: ToastType = "success") => {
        setToastState({ isVisible: true, message, type });
    };


    useEffect(() => { setLocalPeriods([...externalPeriods]); }, [externalPeriods]);
    const schedulePeriods = localPeriods;

    useEffect(() => {
        const newData: LocalData = {};
        records.forEach((r: CropRecord) => {
            newData[r.payload.schedule_period] = {
                _id: r._id,
                source_data: r.payload.source_data || {},
                summary_data: r.payload.summary_data || {},
                notes: r.payload.notes || "",
            };
        });
        setLocalData(newData);
    }, [records]);

    // Scroll to right by default when periods or active crop changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [schedulePeriods, activeCrop]);

    const areaIds = useMemo(() => (areas || []).map((a: AreaDef) => a.id), [areas]);

    if (!crops?.length) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center py-12 shadow-sm">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-medium text-zinc-200">No Crop Types Found</h3>
                <p className="text-zinc-500 mt-1">Please configure your crops and areas in the Crop Settings tab first.</p>
            </div>
        );
    }

    if (!activeCrop) return null;

    const handleSourceChange = (period: string, areaId: string, fieldId: string, value: string) => {
        setLocalData((prev: LocalData) => {
            const periodData = prev[period] || { source_data: {}, summary_data: {}, notes: "" };
            const areaData = periodData.source_data[areaId] || {};
            return {
                ...prev,
                [period]: {
                    ...periodData,
                    source_data: {
                        ...periodData.source_data,
                        [areaId]: { ...areaData, [fieldId]: value === "" ? "" : Number(value) }
                    }
                }
            };
        });
    };

    const handleSummaryChange = (period: string, fieldId: string, value: string) => {
        setLocalData((prev: LocalData) => {
            const periodData = prev[period] || { source_data: {}, summary_data: {}, notes: "" };
            return {
                ...prev,
                [period]: { ...periodData, summary_data: { ...periodData.summary_data, [fieldId]: value === "" ? "" : Number(value) } }
            };
        });
    };

    const handleNotesChange = (period: string, notes: string) => {
        setLocalData((prev: LocalData) => {
            const periodData = prev[period] || { source_data: {}, summary_data: {}, notes: "" };
            return { ...prev, [period]: { ...periodData, notes } };
        });
    };

    const handleSavePeriod = async (period: string) => {
        setSavingPeriod(period);
        setIsSaving(true);
        try {
            const periodData = localData[period] || { source_data: {}, summary_data: {}, notes: "" };
            const payload = {
                crop_id: activeCrop.id,
                schedule_period: period,
                source_data: periodData.source_data,
                summary_data: periodData.summary_data,
                notes: periodData.notes || "",
            };
            const method = periodData._id ? "PUT" : "POST";
            const url = periodData._id ? `/api/content/${periodData._id}` : "/api/content";
            const reqBody = periodData._id ? { payload } : { module_type: "crop_history", is_public: false, payload };
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) });
            if (!res.ok) throw new Error("Failed to save");
            onRefresh();
            showToast(`Saved ${period} successfully`);
        } catch (e) {
            console.error("Save failed", e);
            showToast("Failed to save records.", "error");
        } finally {

            setIsSaving(false);
            setSavingPeriod(null);
        }
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            for (const period of schedulePeriods) {
                if (localData[period]) await handleSavePeriod(period);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPeriod = () => {
        const val = newPeriodValue.trim();
        if (val && !schedulePeriods.includes(val)) {
            setLocalPeriods(prev => [...prev, val].sort());
            setLocalData((prev: LocalData) => ({ ...prev, [val]: { source_data: {}, summary_data: {}, notes: "" } }));
        }
        setNewPeriodValue("");
        setShowAddPeriod(false);
    };

    const handleDeletePeriod = async (period: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Period",
            description: `Delete period "${period}"? This will remove the data permanently.`,
            onConfirm: async () => {
                const periodData = localData[period];
                if (periodData?._id) {
                    try {
                        const res = await fetch(`/api/content/${periodData._id}`, { method: "DELETE" });
                        if (!res.ok) throw new Error("Failed to delete");
                        onRefresh();
                        showToast(`Deleted period ${period}`);
                    } catch (e) {
                        console.error("Delete failed", e);
                        showToast("Failed to delete period.", "error");
                        return;
                    }
                }
                setLocalPeriods(prev => prev.filter(p => p !== period));
                setLocalData((prev: LocalData) => { const next = { ...prev }; delete next[period]; return next; });
            },
            variant: "danger"
        });
    };

    // Build formula context for a period
    const getFormulaContext = (period: string): FormulaContext => {
        const periodData = localData[period];
        if (!periodData) return { areaValues: {}, summaryValues: {}, calculatedValues: {}, areaIds };

        // Build areaValues with numeric coercion
        const areaValues: Record<string, Record<string, number>> = {};
        for (const aId of areaIds) {
            areaValues[aId] = {};
            for (const f of activeCrop.sourceFields) {
                areaValues[aId][f.id] = Number(periodData.source_data?.[aId]?.[f.id]) || 0;
            }
        }

        const summaryValues: Record<string, number> = {};
        for (const f of activeCrop.summaryFields) {
            summaryValues[f.id] = Number(periodData.summary_data?.[f.id]) || 0;
        }

        // Build constants map from crop config
        const constants: Record<string, number> = {};
        if (activeCrop.constants) {
            for (const c of activeCrop.constants) {
                constants[c.id] = c.value;
            }
        }

        return { areaValues, summaryValues, calculatedValues: {}, areaIds, constants };
    };

    // Evaluate all calculated fields for a period
    const getCalcResults = (period: string): Record<string, number> => {
        const ctx = getFormulaContext(period);
        return evaluateAllCalculatedFields(activeCrop.calculatedFields, ctx);
    };

    // Get SUM of a source field across areas
    const getSourceFieldTotal = (period: string, fieldId: string) => {
        const periodData = localData[period];
        if (!periodData) return 0;
        let total = 0;
        for (const aId of areaIds) {
            total += Number(periodData.source_data?.[aId]?.[fieldId]) || 0;
        }
        return total;
    };

    return (
        <div className="space-y-6">
            {/* Crop Selector */}
            <div className="flex gap-2 mb-4 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-sm overflow-x-auto hide-scrollbar">
                {crops.map((c: CropConfig) => (
                    <button key={c.id} onClick={() => setActiveCropId(c.id)}
                        className={cn("px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                            c.id === activeCrop.id ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner"
                                : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                        )}>
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Spreadsheet */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col relative w-full">
                {/* Header */}
                <div className="p-3 md:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-zinc-950/50 border-b border-zinc-800">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-zinc-100 text-base md:text-lg flex items-center gap-2">
                            {activeCrop.name} Records
                            <span className="text-xs text-zinc-500 font-normal">({schedulePeriods.length} periods)</span>
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">Edit yields, view totals, and track period-over-period changes.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleSaveAll} disabled={isSaving}
                            className="text-xs md:text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-3 md:px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50">
                            {isSaving && !savingPeriod ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save All
                        </button>
                        {showAddPeriod ? (
                            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-1.5 border border-zinc-700">
                                <input autoFocus value={newPeriodValue} onChange={e => setNewPeriodValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddPeriod(); if (e.key === 'Escape') setShowAddPeriod(false); }}
                                    placeholder="e.g. 2026-27" className="w-24 md:w-28 bg-transparent text-sm text-zinc-100 outline-none placeholder-zinc-500 font-mono" />
                                <button onClick={handleAddPeriod} className="text-emerald-400 hover:text-emerald-300 p-1"><Plus className="w-4 h-4" /></button>
                                <button onClick={() => setShowAddPeriod(false)} className="text-zinc-500 hover:text-zinc-300 p-1"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowAddPeriod(true)} className="text-xs md:text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 md:px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-700">
                                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add</span> Period
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div ref={scrollContainerRef} className="overflow-x-auto scroll-smooth">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                            <Reorder.Group
                                axis="x"
                                values={schedulePeriods}
                                onReorder={onReorderPeriods}
                                as="tr"
                            >
                                <th className="px-2 md:px-4 py-2 md:py-3 font-medium border-r border-zinc-800 sticky left-0 bg-zinc-900 z-10 w-[120px] md:w-[200px] shadow-[4px_0_12px_rgba(0,0,0,0.5)] text-xs md:text-sm">
                                    Metric / Area
                                </th>
                                {schedulePeriods.map((period: string) => (
                                    <Reorder.Item
                                        key={period}
                                        value={period}
                                        as="th"
                                        className="px-2 md:px-4 py-2 md:py-3 font-medium text-center border-r border-zinc-800 bg-zinc-800/20 min-w-[150px] md:min-w-[180px] select-none"
                                    >
                                        <div className="flex justify-between items-center group/header">
                                            <div className="flex items-center gap-1.5">
                                                <GripVertical className="w-3.5 h-3.5 text-zinc-600 cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                                <span className="font-semibold text-zinc-200">{period}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleSavePeriod(period)} disabled={isSaving} className="text-emerald-500 hover:text-emerald-400 p-1" title="Save this period">
                                                    {savingPeriod === period ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => handleDeletePeriod(period)} className="text-zinc-600 hover:text-red-400 p-1" title="Delete period">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">

                            {/* Per-area source fields */}
                            {areas.map((area: AreaDef) => (
                                <tr key={`area-${area.id}`} className="group hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-zinc-800 sticky left-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors z-10 align-top shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                        <div className="font-medium text-zinc-200 text-xs md:text-sm truncate">{area.name}</div>
                                        <div className="text-[10px] text-zinc-600 font-mono hidden md:block">{area.id}</div>
                                    </td>
                                    {schedulePeriods.map((period: string, pIdx: number) => (
                                        <td key={`${area.id}-${period}`} className="px-0 py-0 border-r border-zinc-800 align-top bg-zinc-950/20 min-w-[150px] md:min-w-[180px]">
                                            <div className="flex flex-col h-full divide-y divide-zinc-800/50">
                                                {activeCrop.sourceFields.map((f: FieldDef) => {
                                                    const val = Number(localData[period]?.source_data?.[area.id]?.[f.id]) || 0;
                                                    const prevPeriod = pIdx > 0 ? schedulePeriods[pIdx - 1] : null;
                                                    const prevVal = prevPeriod ? (Number(localData[prevPeriod]?.source_data?.[area.id]?.[f.id]) || 0) : 0;
                                                    return (
                                                        <div key={f.id} className="flex justify-between items-center px-4 py-2 hover:bg-zinc-800">
                                                            <span className="text-xs text-zinc-500 w-16 md:w-24 shrink-0 truncate" title={`${f.name}${f.unit ? ` (${f.unit})` : ''}`}>
                                                                {f.name}
                                                                {f.unit && <span className="text-zinc-600 ml-0.5 text-[10px]">{f.unit}</span>}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <input type="number"
                                                                    value={localData[period]?.source_data?.[area.id]?.[f.id] ?? ''}
                                                                    onChange={(e) => handleSourceChange(period, area.id, f.id, e.target.value)}
                                                                    className="w-24 bg-transparent border-none text-right text-zinc-300 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:bg-zinc-800 rounded p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    placeholder="-" />
                                                                {pIdx > 0 && val > 0 && <YoYBadge current={val} previous={prevVal} />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {/* Totals Row */}
                            {areas.length > 1 && activeCrop.sourceFields.length > 0 && (
                                <tr className="bg-zinc-800/40 border-t-2 border-zinc-700">
                                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-zinc-800 sticky left-0 bg-zinc-800 z-10 align-top shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                        <div className="font-bold text-zinc-100 text-xs md:text-sm">Totals</div>
                                        <div className="text-[10px] text-zinc-500 hidden md:block">Sum across all areas</div>
                                    </td>
                                    {schedulePeriods.map((period: string, pIdx: number) => (
                                        <td key={`totals-${period}`} className="px-0 py-0 border-r border-zinc-800 align-top min-w-[150px] md:min-w-[180px]">
                                            <div className="flex flex-col h-full divide-y divide-zinc-700/50">
                                                {activeCrop.sourceFields.map((f: FieldDef) => {
                                                    const total = getSourceFieldTotal(period, f.id);
                                                    const prevPeriod = pIdx > 0 ? schedulePeriods[pIdx - 1] : null;
                                                    const prevTotal = prevPeriod ? getSourceFieldTotal(prevPeriod, f.id) : 0;
                                                    return (
                                                        <div key={f.id} className="flex justify-between items-center px-4 py-2 bg-zinc-800/30">
                                                            <span className="text-xs text-zinc-400 w-16 md:w-24 shrink-0 truncate font-medium">{f.name}</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="w-24 text-right text-zinc-100 font-mono font-bold p-1">
                                                                    {formatNum(total, 1)}
                                                                    {f.unit && <span className="text-zinc-500 text-[10px] ml-0.5">{f.unit}</span>}
                                                                </span>
                                                                {pIdx > 0 && total > 0 && <YoYBadge current={total} previous={prevTotal} />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            )}

                            {/* Summary Fields */}
                            {activeCrop.summaryFields.length > 0 && (
                                <tr className="bg-emerald-950/10 hover:bg-emerald-950/20 transition-colors border-t-2 border-zinc-800">
                                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-zinc-800 sticky left-0 bg-zinc-900 z-10 align-top shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                        <div className="font-semibold text-emerald-400 text-xs md:text-sm">Period Inputs</div>
                                        <div className="text-[10px] text-zinc-500 mt-1 hidden md:block">Values per period</div>
                                    </td>
                                    {schedulePeriods.map((period: string, pIdx: number) => (
                                        <td key={`summary-${period}`} className="px-0 py-0 border-r border-zinc-800 align-top min-w-[150px] md:min-w-[180px]">
                                            <div className="flex flex-col h-full divide-y divide-zinc-800/50">
                                                {activeCrop.summaryFields.map((f: FieldDef) => {
                                                    const val = Number(localData[period]?.summary_data?.[f.id]) || 0;
                                                    const prevPeriod = pIdx > 0 ? schedulePeriods[pIdx - 1] : null;
                                                    const prevVal = prevPeriod ? (Number(localData[prevPeriod]?.summary_data?.[f.id]) || 0) : 0;
                                                    return (
                                                        <div key={f.id} className="flex justify-between items-center px-4 py-2 hover:bg-zinc-800/50">
                                                            <span className="text-xs text-emerald-500/70 w-16 md:w-24 shrink-0 truncate" title={`${f.name}${f.unit ? ` (${f.unit})` : ''}`}>
                                                                {f.name}
                                                                {f.unit && <span className="text-emerald-700 ml-0.5 text-[10px]">{f.unit}</span>}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <input type="number"
                                                                    value={localData[period]?.summary_data?.[f.id] ?? ''}
                                                                    onChange={(e) => handleSummaryChange(period, f.id, e.target.value)}
                                                                    className="w-24 bg-transparent border-none text-right text-emerald-300 font-mono focus:ring-1 focus:ring-emerald-500/50 focus:bg-zinc-800 rounded p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    placeholder="-" />
                                                                {pIdx > 0 && val > 0 && <YoYBadge current={val} previous={prevVal} />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            )}

                            {/* Calculated Fields */}
                            {activeCrop.calculatedFields.length > 0 && (
                                <tr className="bg-blue-950/10 hover:bg-blue-950/20 transition-colors border-t-2 border-blue-900/20">
                                    <td className="px-2 md:px-4 py-2 md:py-3 border-r border-zinc-800 sticky left-0 bg-zinc-900 z-10 align-top shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                        <div className="font-semibold text-blue-400 text-xs md:text-sm">Calculated</div>
                                        <div className="text-[10px] text-zinc-500 mt-1 hidden md:block">Auto-computed</div>
                                    </td>
                                    {schedulePeriods.map((period: string, pIdx: number) => {
                                        const results = getCalcResults(period);
                                        const prevPeriod = pIdx > 0 ? schedulePeriods[pIdx - 1] : null;
                                        const prevResults = prevPeriod ? getCalcResults(prevPeriod) : {};
                                        return (
                                            <td key={`calc-${period}`} className="px-0 py-0 border-r border-zinc-800 align-top min-w-[150px] md:min-w-[180px]">
                                                <div className="flex flex-col h-full divide-y divide-zinc-800/50">
                                                    {activeCrop.calculatedFields.map((f: CalcFieldDef) => {
                                                        const val = results[f.id] ?? 0;
                                                        const prevVal = prevResults[f.id] ?? 0;
                                                        return (
                                                            <div key={f.id} className="flex justify-between items-center px-4 py-2 bg-blue-950/5">
                                                                <span className="text-xs text-blue-400/70 w-16 md:w-24 shrink-0 truncate" title={`${f.name} = ${f.formula}`}>{f.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-24 text-right text-blue-300 font-mono font-medium p-1 truncate" title={val.toString()}>
                                                                        {formatCalcValue(val, f.format, f.unit)}
                                                                    </div>
                                                                    {pIdx > 0 && val > 0 && <YoYBadge current={val} previous={prevVal} />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}

                            {/* Notes */}
                            <tr className="border-t border-zinc-800">
                                <td className="px-2 md:px-4 py-2 md:py-3 border-r border-zinc-800 sticky left-0 bg-zinc-900 z-10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-xs font-medium">Notes</span>
                                    </div>
                                </td>
                                {schedulePeriods.map((period: string) => (
                                    <td key={`notes-${period}`} className="px-3 py-2 border-r border-zinc-800 align-top min-w-[150px] md:min-w-[180px]">
                                        <textarea value={localData[period]?.notes || ''} onChange={(e) => handleNotesChange(period, e.target.value)}
                                            placeholder="Add notes..." rows={2}
                                            className="w-full bg-transparent text-xs text-zinc-400 resize-none outline-none focus:ring-1 focus:ring-zinc-700 rounded p-1.5 placeholder-zinc-600" />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                variant={confirmState.variant}
            />

            <Toast
                message={toastState.message}
                type={toastState.type}
                isVisible={toastState.isVisible}
                onClose={() => setToastState({ ...toastState, isVisible: false })}
            />
        </div>
    );
}
