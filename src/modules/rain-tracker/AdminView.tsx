"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
    Plus, Trash2, Edit3, MapPin, X, CloudRain, Droplets, Settings2,
    Cloud, CloudDrizzle, CloudLightning, Calendar, Clock, TrendingUp,
    TrendingDown, Minus, FileText, Filter, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface RainArea {
    _id: string;
    created_at: string;
    payload: {
        name: string;
        location?: string;
        description?: string;
        is_active: boolean;
    };
}

interface RainEntry {
    _id: string;
    created_at: string;
    payload: {
        area_id: string;
        rainfall_amount: number;
        rainfall_unit: "mm" | "cm" | "in";
        date: string;
        notes?: string;
        source?: string;
    };
}

interface RainSettings {
    defaultUnit: "mm" | "cm" | "in";
    chartType: "bar" | "area";
    [key: string]: unknown;
}

const DEFAULTS: RainSettings = {
    defaultUnit: "mm",
    chartType: "bar"
};

const CONVERSION_TO_MM = { mm: 1, cm: 10, in: 25.4 };
const CONVERSION_FROM_MM = { mm: 1, cm: 0.1, in: 0.0393701 };

function displayValue(mmValue: number, unit: "mm" | "cm" | "in") {
    return (mmValue * CONVERSION_FROM_MM[unit]).toFixed(2);
}

function parseDateInputToISO(dateOnly: string, timeOnly: string = "00:00") {
    return new Date(`${dateOnly}T${timeOnly}`).toISOString();
}

// Rain intensity classification (in mm)
function getRainIntensity(mmAmount: number): { label: string; color: string; bgColor: string; icon: typeof Cloud } {
    if (mmAmount <= 2.5) return { label: "Light", color: "text-sky-400", bgColor: "bg-sky-500/10 border-sky-500/20", icon: CloudDrizzle };
    if (mmAmount <= 7.5) return { label: "Moderate", color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", icon: Cloud };
    if (mmAmount <= 35) return { label: "Heavy", color: "text-indigo-400", bgColor: "bg-indigo-500/10 border-indigo-500/20", icon: CloudRain };
    return { label: "Very Heavy", color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20", icon: CloudLightning };
}

function matchesFilter(entry: RainEntry, filterAmountMin?: string, filterAmountMax?: string, filterNotes?: string, displayUnit: "mm" | "cm" | "in" = "mm") {
    let match = true;
    if (filterAmountMin) {
        const val = parseFloat(filterAmountMin);
        if (!isNaN(val)) {
            const entryVal = entry.payload.rainfall_amount * CONVERSION_FROM_MM[displayUnit];
            if (entryVal < val) match = false;
        }
    }
    if (filterAmountMax) {
        const val = parseFloat(filterAmountMax);
        if (!isNaN(val)) {
            const entryVal = entry.payload.rainfall_amount * CONVERSION_FROM_MM[displayUnit];
            if (entryVal > val) match = false;
        }
    }
    if (filterNotes) {
        const note = entry.payload.notes?.toLowerCase() || "";
        if (!note.includes(filterNotes.toLowerCase())) match = false;
    }
    return match;
}

function StatCard({ label, value, unit, trend, icon: Icon, accentClass, delay = 0 }: {
    label: string;
    value: string;
    unit: string;
    trend?: { value: number; label: string };
    icon: typeof Cloud;
    accentClass: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="relative group bg-zinc-950 border border-zinc-800 p-5 rounded-2xl shadow-sm overflow-hidden hover:border-zinc-700 transition-colors"
        >
            <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500", accentClass)} />
            <div className="flex items-start justify-between relative">
                <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-3xl font-bold text-zinc-50 tracking-tight tabular-nums">
                        {value}
                        <span className="text-sm font-medium text-zinc-500 ml-1.5">{unit}</span>
                    </p>
                    {trend && (
                        <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend.value > 0 ? "text-success" : trend.value < 0 ? "text-danger" : "text-zinc-500")}>
                            {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> : trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            <span>{trend.value > 0 ? "+" : ""}{trend.value.toFixed(1)}% {trend.label}</span>
                        </div>
                    )}
                </div>
                <div className={cn("p-2.5 rounded-xl border", accentClass)}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </motion.div>
    );
}

export default function RainTrackerAdminView() {
    const { settings, updateSettings } = useModuleSettings<RainSettings>("rainTrackerSettings", DEFAULTS);
    const displayUnit = settings.defaultUnit || "mm";
    const chartType = settings.chartType || "bar";

    const [areas, setAreas] = useState<RainArea[]>([]);
    const [entries, setEntries] = useState<RainEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

    // Area Form State
    const [showAreaForm, setShowAreaForm] = useState(false);
    const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
    const [areaName, setAreaName] = useState("");
    const [areaLocation, setAreaLocation] = useState("");
    const [areaDescription, setAreaDescription] = useState("");
    const [areaIsActive, setAreaIsActive] = useState(true);

    // Entry Form State
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [entryAmount, setEntryAmount] = useState("");
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
    const [entryTime, setEntryTime] = useState(new Date().toISOString().slice(11, 16));
    const [entryNotes, setEntryNotes] = useState("");
    const [entrySource, setEntrySource] = useState("manual");
    const [formError, setFormError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Filters
    const [filterAmountMin, setFilterAmountMin] = useState("");
    const [filterAmountMax, setFilterAmountMax] = useState("");
    const [filterNotes, setFilterNotes] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const [areasRes, entriesRes] = await Promise.all([
                fetch("/api/content?module_type=rain_area"),
                fetch("/api/content?module_type=rain_entry")
            ]);
            const areasData = await areasRes.json();
            const entriesData = await entriesRes.json();
            setAreas(areasData.data || []);
            setEntries(entriesData.data || []);
            if (areasData.data?.length > 0 && !selectedAreaId) {
                setSelectedAreaId(areasData.data[0]._id);
            }
        } catch (error) {
            console.error("Failed to fetch rain data", error);
        } finally {
            setLoading(false);
        }
    }, [selectedAreaId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveArea = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (!areaName.trim()) return setFormError("Area name is required");

        const payload = {
            name: areaName.trim(),
            location: areaLocation.trim() || undefined,
            description: areaDescription.trim() || undefined,
            is_active: areaIsActive
        };

        try {
            setIsSaving(true);
            if (editingAreaId) {
                await fetch(`/api/content/${editingAreaId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload })
                });
            } else {
                await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "rain_area", is_public: false, payload })
                });
            }
            setShowAreaForm(false);
            setEditingAreaId(null);
            setAreaName(""); setAreaLocation(""); setAreaDescription(""); setAreaIsActive(true);
            await fetchData();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Failed to save area");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteArea = async (id: string) => {
        if (!confirm("Are you sure you want to delete this area? All associated rain entries will become orphaned.")) return;
        try {
            await fetch(`/api/content/${id}`, { method: "DELETE" });
            if (selectedAreaId === id) setSelectedAreaId(null);
            await fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (!selectedAreaId) return setFormError("No area selected");

        const amountDisplay = parseFloat(entryAmount);
        if (!Number.isFinite(amountDisplay) || amountDisplay < 0) return setFormError("Valid rainfall amount is required");
        if (!entryDate) return setFormError("Date is required");

        const amountMm = amountDisplay * CONVERSION_TO_MM[displayUnit];

        const payload = {
            area_id: selectedAreaId,
            rainfall_amount: amountMm,
            rainfall_unit: "mm",
            date: parseDateInputToISO(entryDate, entryTime),
            notes: entryNotes.trim() || undefined,
            source: entrySource
        };

        try {
            setIsSaving(true);
            if (editingEntryId) {
                await fetch(`/api/content/${editingEntryId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload })
                });
            } else {
                await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "rain_entry", is_public: false, payload })
                });
            }
            setShowEntryForm(false);
            setEditingEntryId(null);
            setEntryAmount(""); setEntryNotes("");
            setEntryDate(new Date().toISOString().slice(0, 10));
            setEntryTime(new Date().toISOString().slice(11, 16));
            setEntrySource("manual");
            await fetchData();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Failed to save entry");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm("Delete this rainfall entry?")) return;
        try {
            await fetch(`/api/content/${id}`, { method: "DELETE" });
            await fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const openEditArea = (area: RainArea) => {
        setAreaName(area.payload.name);
        setAreaLocation(area.payload.location || "");
        setAreaDescription(area.payload.description || "");
        setAreaIsActive(area.payload.is_active ?? true);
        setEditingAreaId(area._id);
        setShowAreaForm(true);
    };

    const openEditEntry = (entry: RainEntry) => {
        const displayAmt = entry.payload.rainfall_amount * CONVERSION_FROM_MM[displayUnit];
        setEntryAmount(displayAmt.toString());
        const d = new Date(entry.payload.date);
        setEntryDate(d.toISOString().slice(0, 10));
        setEntryTime(d.toTimeString().slice(0, 5));
        setEntryNotes(entry.payload.notes || "");
        setEntrySource(entry.payload.source || "manual");
        setEditingEntryId(entry._id);
        setShowEntryForm(true);
    };

    // Area entry counts for sidebar badges
    const areaEntryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const e of entries) {
            counts[e.payload.area_id] = (counts[e.payload.area_id] || 0) + 1;
        }
        return counts;
    }, [entries]);

    // Area last rainfall dates
    const areaLastRain = useMemo(() => {
        const lastDates: Record<string, string> = {};
        for (const e of entries) {
            const areaId = e.payload.area_id;
            if (!lastDates[areaId] || new Date(e.payload.date) > new Date(lastDates[areaId])) {
                lastDates[areaId] = e.payload.date;
            }
        }
        return lastDates;
    }, [entries]);

    const selectedAreaEntries = useMemo(() => {
        if (!selectedAreaId) return [];
        return entries
            .filter((e) => e.payload.area_id === selectedAreaId)
            .filter((e) => matchesFilter(e, filterAmountMin, filterAmountMax, filterNotes, displayUnit))
            .filter((e) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    e.payload.notes?.toLowerCase().includes(q) ||
                    e.payload.source?.toLowerCase().includes(q) ||
                    new Date(e.payload.date).toLocaleDateString().includes(q)
                );
            })
            .sort((a, b) => new Date(b.payload.date).getTime() - new Date(a.payload.date).getTime());
    }, [entries, selectedAreaId, filterAmountMin, filterAmountMax, filterNotes, displayUnit, searchQuery]);

    const analyticsData = useMemo(() => {
        const unfilteredAreaEntries = entries.filter((e) => e.payload.area_id === selectedAreaId);
        if (!unfilteredAreaEntries.length) return { total: 0, last7: 0, last30: 0, prevLast30: 0, avgPerEntry: 0, maxSingle: 0, rainyDays: 0, chartData: [], dailyData: [] };

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        let totalMm = 0, last7Mm = 0, last30Mm = 0, prevLast30Mm = 0, maxSingleMm = 0;
        const monthlyAgg: Record<string, number> = {};
        const dailyAgg: Record<string, number> = {};
        const rainyDaysSet = new Set<string>();

        for (const entry of unfilteredAreaEntries) {
            const date = new Date(entry.payload.date);
            const amtMm = entry.payload.rainfall_amount;

            totalMm += amtMm;
            if (amtMm > maxSingleMm) maxSingleMm = amtMm;
            if (date >= sevenDaysAgo) last7Mm += amtMm;
            if (date >= thirtyDaysAgo) last30Mm += amtMm;
            if (date >= sixtyDaysAgo && date < thirtyDaysAgo) prevLast30Mm += amtMm;

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyAgg[monthKey] = (monthlyAgg[monthKey] || 0) + amtMm;

            const dayKey = date.toISOString().slice(0, 10);
            dailyAgg[dayKey] = (dailyAgg[dayKey] || 0) + amtMm;
            rainyDaysSet.add(dayKey);
        }

        const chartData = Object.entries(monthlyAgg)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([month, valMm]) => {
                const [y, m] = month.split("-");
                const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                return {
                    name: dateObj.toLocaleString("default", { month: "short", year: "2-digit" }),
                    amountMm: valMm,
                    displayAmount: parseFloat((valMm * CONVERSION_FROM_MM[displayUnit]).toFixed(2))
                };
            });

        // Last 30 days daily data for mini chart
        const dailyData: { day: string; amount: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().slice(0, 10);
            dailyData.push({
                day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                amount: parseFloat(((dailyAgg[key] || 0) * CONVERSION_FROM_MM[displayUnit]).toFixed(2))
            });
        }

        return {
            total: parseFloat((totalMm * CONVERSION_FROM_MM[displayUnit]).toFixed(2)),
            last7: parseFloat((last7Mm * CONVERSION_FROM_MM[displayUnit]).toFixed(2)),
            last30: parseFloat((last30Mm * CONVERSION_FROM_MM[displayUnit]).toFixed(2)),
            prevLast30: parseFloat((prevLast30Mm * CONVERSION_FROM_MM[displayUnit]).toFixed(2)),
            avgPerEntry: parseFloat(((totalMm / unfilteredAreaEntries.length) * CONVERSION_FROM_MM[displayUnit]).toFixed(2)),
            maxSingle: parseFloat((maxSingleMm * CONVERSION_FROM_MM[displayUnit]).toFixed(2)),
            rainyDays: rainyDaysSet.size,
            chartData,
            dailyData
        };
    }, [entries, selectedAreaId, displayUnit]);

    const last30Trend = useMemo(() => {
        if (analyticsData.prevLast30 === 0) return undefined;
        const change = ((analyticsData.last30 - analyticsData.prevLast30) / analyticsData.prevLast30) * 100;
        return { value: change, label: "vs prev 30d" };
    }, [analyticsData.last30, analyticsData.prevLast30]);

    const selectedArea = areas.find(a => a._id === selectedAreaId);

    const filteredAreas = useMemo(() => {
        return areas;
    }, [areas]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-accent animate-spin" />
                        <CloudRain className="w-5 h-5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-zinc-500">Loading rainfall data...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-7rem)] gap-4 overflow-hidden -mx-6 lg:-mx-8 -mb-6 lg:-mb-8 px-4 lg:px-6 pb-4 lg:pb-6">
            {/* Left Sidebar - Areas */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full lg:w-72 flex flex-col gap-3 shrink-0 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden"
            >
                <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-200 tracking-tight flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent" /> Areas
                        <span className="text-[10px] font-medium text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded-md">{areas.length}</span>
                    </h2>
                    <button
                        onClick={() => {
                            setAreaName(""); setAreaLocation(""); setAreaDescription(""); setAreaIsActive(true);
                            setEditingAreaId(null); setShowAreaForm(true);
                        }}
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-accent rounded-lg transition-all border border-zinc-800 hover:border-accent/30"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                <AnimatePresence>
                    {showAreaForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 mx-3 bg-zinc-900/60 backdrop-blur border border-accent/20 rounded-xl">
                                <h3 className="text-xs font-semibold text-zinc-300 mb-2.5">{editingAreaId ? "Edit Area" : "New Area"}</h3>
                                <form onSubmit={handleSaveArea} className="space-y-2.5">
                                    <input
                                        autoFocus value={areaName} onChange={(e) => setAreaName(e.target.value)}
                                        placeholder="Name (e.g., Front Yard)"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                                    />
                                    <input
                                        value={areaLocation} onChange={(e) => setAreaLocation(e.target.value)}
                                        placeholder="Location (Optional)"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                                    />
                                    <textarea
                                        value={areaDescription} onChange={(e) => setAreaDescription(e.target.value)}
                                        placeholder="Description (Optional)" rows={2}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 resize-none transition-colors"
                                    />
                                    <label className="flex items-center gap-2 px-1 cursor-pointer">
                                        <input type="checkbox" checked={areaIsActive} onChange={(e) => setAreaIsActive(e.target.checked)} className="accent-accent rounded" />
                                        <span className="text-xs text-zinc-400 select-none">Active</span>
                                    </label>
                                    {formError && <p className="text-xs text-danger">{formError}</p>}
                                    <div className="flex gap-2 justify-end pt-1">
                                        <button type="button" onClick={() => setShowAreaForm(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
                                        <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">Save</button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 no-scrollbar">
                    {filteredAreas.length === 0 && !showAreaForm && (
                        <div className="text-center p-8 flex flex-col items-center gap-3">
                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                <MapPin className="w-5 h-5 text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 text-xs">No areas yet. Create one to start!</p>
                        </div>
                    )}
                    {filteredAreas.map((area, i) => {
                        const entryCount = areaEntryCounts[area._id] || 0;
                        const lastRain = areaLastRain[area._id];
                        const isSelected = selectedAreaId === area._id;
                        return (
                            <motion.div
                                key={area._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                onClick={() => setSelectedAreaId(area._id)}
                                className={cn(
                                    "group p-3 rounded-xl cursor-pointer border transition-all relative",
                                    isSelected
                                        ? "bg-accent/8 border-accent/25 shadow-[0_0_20px_-8px] shadow-accent/20"
                                        : "bg-zinc-900/30 border-transparent hover:bg-zinc-900/60 hover:border-zinc-800"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-accent rounded-r-full" />
                                )}
                                <div className="flex items-start justify-between">
                                    <div className="overflow-hidden flex-1 min-w-0">
                                        <h4 className={cn("text-sm font-semibold truncate flex items-center gap-1.5", isSelected ? "text-accent" : "text-zinc-200")}>
                                            {area.payload.name}
                                            {!area.payload.is_active && (
                                                <span className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider shrink-0">Archived</span>
                                            )}
                                        </h4>
                                        {area.payload.location && (
                                            <p className="text-[11px] text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                {area.payload.location}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                <Droplets className="w-2.5 h-2.5" />
                                                {entryCount} {entryCount === 1 ? "entry" : "entries"}
                                            </span>
                                            {lastRain && (
                                                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                    <Calendar className="w-2.5 h-2.5" />
                                                    {new Date(lastRain).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditArea(area); }}
                                            className="p-1.5 text-zinc-500 hover:text-accent rounded-lg transition-colors"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteArea(area._id); }}
                                            className="p-1.5 text-zinc-500 hover:text-danger rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Main Content Area */}
            {selectedAreaId && selectedArea ? (
                <motion.div
                    key={selectedAreaId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col gap-4 overflow-hidden max-h-full"
                >
                    {/* Area Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between shrink-0"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                                <CloudRain className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{selectedArea.payload.name}</h2>
                                {selectedArea.payload.location && (
                                    <p className="text-xs text-zinc-500">{selectedArea.payload.location}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => { setShowSettings(!showSettings); setShowFilters(false); }}
                            className={cn(
                                "p-2 rounded-xl border transition-all",
                                showSettings ? "bg-accent/10 border-accent/30 text-accent" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
                            )}
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                    </motion.div>

                    {/* Settings Panel */}
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden shrink-0"
                            >
                                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Preferences</h4>
                                        <button onClick={() => setShowSettings(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold text-zinc-400">Display Unit</label>
                                            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
                                                {(["mm", "cm", "in"] as const).map((unit) => (
                                                    <button
                                                        key={unit}
                                                        onClick={() => updateSettings({ defaultUnit: unit })}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                                            displayUnit === unit ? "bg-zinc-800 text-accent shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                                        )}
                                                    >
                                                        {unit}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-zinc-600">Records stored in mm. This only affects display.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold text-zinc-400">Chart Type</label>
                                            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
                                                {(["bar", "area"] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => updateSettings({ chartType: type })}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-lg text-xs font-bold capitalize tracking-wider transition-all",
                                                            chartType === type ? "bg-zinc-800 text-accent shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                        <StatCard
                            label="Total"
                            value={String(analyticsData.total)}
                            unit={displayUnit}
                            icon={CloudRain}
                            accentClass="bg-accent/20"
                            delay={0}
                        />
                        <StatCard
                            label="Last 7 Days"
                            value={String(analyticsData.last7)}
                            unit={displayUnit}
                            icon={Calendar}
                            accentClass="bg-sky-500/20"
                            delay={0.05}
                        />
                        <StatCard
                            label="Last 30 Days"
                            value={String(analyticsData.last30)}
                            unit={displayUnit}
                            trend={last30Trend}
                            icon={TrendingUp}
                            accentClass="bg-blue-500/20"
                            delay={0.1}
                        />
                        <StatCard
                            label="Avg / Entry"
                            value={String(analyticsData.avgPerEntry)}
                            unit={displayUnit}
                            icon={Droplets}
                            accentClass="bg-indigo-500/20"
                            delay={0.15}
                        />
                    </div>

                    {/* Secondary Stats Row */}
                    <div className="grid grid-cols-3 gap-3 shrink-0">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <CloudLightning className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Max Single</p>
                                <p className="text-lg font-bold text-zinc-100 tabular-nums">{analyticsData.maxSingle} <span className="text-xs text-zinc-500">{displayUnit}</span></p>
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                            <div className="p-2 bg-success/10 rounded-lg border border-success/20">
                                <Calendar className="w-4 h-4 text-success" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Rainy Days</p>
                                <p className="text-lg font-bold text-zinc-100 tabular-nums">{analyticsData.rainyDays}</p>
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                            <div className="p-2 bg-warning/10 rounded-lg border border-warning/20">
                                <FileText className="w-4 h-4 text-warning" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Entries</p>
                                <p className="text-lg font-bold text-zinc-100 tabular-nums">{areaEntryCounts[selectedAreaId] || 0}</p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-0 overflow-hidden">
                        {/* Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="xl:col-span-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-0 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-zinc-300 tracking-wide">Rainfall Trend</h3>
                                <span className="text-[10px] text-zinc-600 font-medium">Last 12 Months</span>
                            </div>
                            {analyticsData.chartData.length > 0 ? (
                                <div className="flex-1 min-h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === "area" ? (
                                            <AreaChart data={analyticsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
                                                <XAxis dataKey="name" stroke="#3f3f46" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#3f3f46" fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    cursor={{ stroke: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)' }}
                                                    itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                                                    formatter={(val) => [`${val ?? 0} ${displayUnit}`, "Rainfall"]}
                                                />
                                                <Area type="monotone" dataKey="displayAmount" stroke="var(--color-accent)" fill="url(#rainGradient)" strokeWidth={2} />
                                            </AreaChart>
                                        ) : (
                                            <BarChart data={analyticsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
                                                <XAxis dataKey="name" stroke="#3f3f46" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#3f3f46" fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)' }}
                                                    itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                                                    formatter={(val) => [`${val ?? 0} ${displayUnit}`, "Rainfall"]}
                                                />
                                                <Bar dataKey="displayAmount" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                        <CloudRain className="w-8 h-8 text-zinc-700" />
                                    </div>
                                    <p className="text-zinc-600 text-sm">Not enough data to chart</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Rain Entries List */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="xl:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col min-h-0 overflow-hidden"
                        >
                            {/* Entries Header */}
                            <div className="p-4 border-b border-zinc-800/80 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                        <Droplets className="w-4 h-4 text-accent" />
                                        Entries
                                        <span className="text-[10px] font-medium text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded-md">{selectedAreaEntries.length}</span>
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => { setShowFilters(!showFilters); }}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all",
                                                showFilters || filterAmountMin || filterAmountMax || filterNotes
                                                    ? "bg-accent/10 text-accent border border-accent/20"
                                                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-300 border border-zinc-800"
                                            )}
                                        >
                                            <Filter className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEntryAmount(""); setEntryNotes("");
                                                setEntryDate(new Date().toISOString().slice(0, 10));
                                                setEntryTime(new Date().toISOString().slice(11, 16));
                                                setEntrySource("manual");
                                                setEditingEntryId(null); setShowEntryForm(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-all"
                                        >
                                            <Plus className="w-3 h-3" /> Log
                                        </button>
                                    </div>
                                </div>

                                {/* Search bar */}
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search entries..."
                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Filters */}
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-3 bg-zinc-900/40 border-b border-zinc-800/80 space-y-2.5">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Min ({displayUnit})</label>
                                                    <input type="number" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} placeholder="0" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Max ({displayUnit})</label>
                                                    <input type="number" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} placeholder="0" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="text" value={filterNotes} onChange={(e) => setFilterNotes(e.target.value)} placeholder="Search notes..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600" />
                                                {(filterAmountMin || filterAmountMax || filterNotes) && (
                                                    <button onClick={() => { setFilterAmountMin(""); setFilterAmountMax(""); setFilterNotes(""); }} className="p-1.5 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg hover:text-zinc-200 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Entry Form */}
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <AnimatePresence>
                                    {showEntryForm && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="m-3 p-4 bg-zinc-900/80 border border-accent/20 rounded-xl">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-semibold text-zinc-200">{editingEntryId ? "Edit Entry" : "Log Rainfall"}</h4>
                                                    <button onClick={() => setShowEntryForm(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X className="w-4 h-4" /></button>
                                                </div>
                                                <form onSubmit={handleSaveEntry} className="space-y-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Amount ({displayUnit})</label>
                                                        <input
                                                            type="number" step="0.01" min="0" autoFocus
                                                            value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)}
                                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-lg font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-accent/50 tabular-nums transition-colors"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Date</label>
                                                            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent/50 transition-colors" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Time</label>
                                                            <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent/50 transition-colors" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Source</label>
                                                            <select value={entrySource} onChange={(e) => setEntrySource(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent/50 transition-colors">
                                                                <option value="manual">Manual</option>
                                                                <option value="sensor">Sensor</option>
                                                                <option value="imported">Imported</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Notes</label>
                                                            <input value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Optional" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-accent/50 transition-colors" />
                                                        </div>
                                                    </div>
                                                    {formError && <p className="text-xs text-danger">{formError}</p>}
                                                    <button type="submit" disabled={isSaving} className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                                                        {isSaving ? "Saving..." : editingEntryId ? "Update Entry" : "Save Entry"}
                                                    </button>
                                                </form>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {selectedAreaEntries.length === 0 && !showEntryForm ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
                                        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                            <CloudRain className="w-8 h-8 text-zinc-700" />
                                        </div>
                                        <p className="text-zinc-500 text-sm text-center">No entries yet</p>
                                        <p className="text-zinc-600 text-xs text-center">Click &quot;Log&quot; to record rainfall</p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-1.5">
                                        <AnimatePresence>
                                            {selectedAreaEntries.map((entry, i) => {
                                                const intensity = getRainIntensity(entry.payload.rainfall_amount);
                                                const IntensityIcon = intensity.icon;
                                                const entryDate = new Date(entry.payload.date);
                                                return (
                                                    <motion.div
                                                        key={entry._id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.2, delay: i * 0.02 }}
                                                        className="group flex items-center gap-3 p-3 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl transition-all cursor-default"
                                                    >
                                                        {/* Date Badge */}
                                                        <div className="hidden sm:flex flex-col items-center justify-center min-w-[44px] py-1.5 bg-zinc-950 rounded-lg border border-zinc-800">
                                                            <span className="text-[10px] text-zinc-500 font-medium leading-none">{entryDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                                                            <span className="text-sm font-bold text-zinc-200 leading-tight">{entryDate.getDate()}</span>
                                                        </div>

                                                        {/* Intensity indicator */}
                                                        <div className={cn("p-1.5 rounded-lg border shrink-0", intensity.bgColor)}>
                                                            <IntensityIcon className={cn("w-3.5 h-3.5", intensity.color)} />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-base font-bold text-zinc-100 tabular-nums">
                                                                    {displayValue(entry.payload.rainfall_amount, displayUnit)}
                                                                </span>
                                                                <span className="text-[11px] font-medium text-zinc-500">{displayUnit}</span>
                                                                <span className={cn("text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", intensity.bgColor, intensity.color)}>
                                                                    {intensity.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className="text-[10px] text-zinc-600 capitalize">{entry.payload.source}</span>
                                                                {entry.payload.notes && (
                                                                    <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">{entry.payload.notes}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <button onClick={() => openEditEntry(entry)} className="p-1.5 text-zinc-500 hover:text-accent rounded-lg transition-colors">
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => handleDeleteEntry(entry._id)} className="p-1.5 text-zinc-500 hover:text-danger rounded-lg transition-colors">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center border border-zinc-800 border-dashed rounded-2xl bg-zinc-950/30"
                >
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl scale-150" />
                        <div className="relative p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                            <CloudRain className="w-10 h-10 text-zinc-600" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-400">No Area Selected</h3>
                    <p className="text-sm text-zinc-600 max-w-xs text-center mt-2">Select or create a rain tracking area to view rainfall data and history.</p>
                </motion.div>
            )}
        </div>
    );
}
