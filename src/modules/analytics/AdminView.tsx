"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Monitor, Smartphone, ArrowUp, ArrowDown, RefreshCw,
    Layers, Activity, Users, Zap, ChevronRight, Tablet
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from "recharts";

interface MetricEvent {
    _id: string;
    path: string;
    module: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, unknown>;
    referrer?: string;
    device_type: string;
    session_id: string;
    timestamp: string;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export default function AnalyticsAdminView() {
    const [metrics, setMetrics] = useState<MetricEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30");
    const [selectedModule, setSelectedModule] = useState<string>("all");

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/metrics?days=${dateRange}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "Failed to fetch metrics");
            setMetrics(d.data || []);
        } catch (err: unknown) {
            console.error("fetchMetrics failed:", err);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

    // Compute stats
    const stats = useMemo(() => {
        const filtered = selectedModule === "all"
            ? metrics
            : metrics.filter(m => m.module === selectedModule);

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        const todayActions = filtered.filter((m) => m.timestamp?.startsWith(today)).length;
        const yesterdayActions = filtered.filter((m) => m.timestamp?.startsWith(yesterday)).length;

        const uniqueSessions = new Set(filtered.map(m => m.session_id)).size;

        // Module activity
        const moduleCounts: Record<string, number> = {};
        metrics.forEach((m) => { moduleCounts[m.module] = (moduleCounts[m.module] || 0) + 1; });
        const moduleChartData = Object.entries(moduleCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));

        // Daily trend
        const dailyAgg: Record<string, number> = {};
        filtered.forEach((m) => {
            const d = m.timestamp?.split("T")[0];
            if (d) dailyAgg[d] = (dailyAgg[d] || 0) + 1;
        });
        const trendData = [];
        for (let j = parseInt(dateRange) - 1; j >= 0; j--) {
            const d = new Date(Date.now() - j * 86400000).toISOString().split("T")[0];
            trendData.push({
                date: d,
                displayDate: new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                count: dailyAgg[d] || 0
            });
        }

        // Device breakdown
        const deviceData = [
            { name: 'Desktop', value: filtered.filter(m => m.device_type === 'desktop').length },
            { name: 'Mobile', value: filtered.filter(m => m.device_type === 'mobile').length },
            { name: 'Tablet', value: filtered.filter(m => m.device_type === 'tablet').length },
        ].filter(d => d.value > 0);

        // Top actions
        const actionCounts: Record<string, number> = {};
        filtered.forEach(m => {
            const key = `${m.module}:${m.action}`;
            actionCounts[key] = (actionCounts[key] || 0) + 1;
        });
        const topActions = Object.entries(actionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            totalEvents: filtered.length,
            todayActions,
            yesterdayActions,
            uniqueSessions,
            moduleChartData,
            trendData,
            deviceData,
            topActions,
            recentEvents: filtered.slice(0, 15)
        };
    }, [metrics, dateRange, selectedModule]);

    const trend = stats.todayActions - stats.yesterdayActions;

    return (
        <div className="animate-fade-in space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-2">OS Analytics</h1>
                    <p className="text-zinc-500 font-medium">Real-time usage patterns and system intelligence.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/40 min-w-40 transition-all cursor-pointer">
                        <option value="all">Global System</option>
                        {stats.moduleChartData.map(m => (
                            <option key={m.name} value={m.name}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</option>
                        ))}
                    </select>

                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                        {["7", "30", "90"].map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    dateRange === range ? "bg-zinc-800 text-accent shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {range}D
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchMetrics}
                        disabled={loading}
                        className="p-2.5 bg-zinc-900 text-zinc-400 rounded-xl hover:text-accent hover:border-accent/40 border border-zinc-800 transition-all disabled:opacity-50">
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { label: "Total Events", value: stats.totalEvents, icon: Activity, color: "text-accent", bg: "bg-accent/10" },
                    { label: "Unique sessions", value: stats.uniqueSessions, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
                    { label: "Active Modules", value: stats.moduleChartData.length, icon: Layers, color: "text-success", bg: "bg-success/10" },
                    { label: "Today's Events", value: stats.todayActions, icon: Zap, color: "text-warning", bg: "bg-warning/10", trend: trend }
                ].map((card, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl hover:border-zinc-800 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2.5 rounded-xl", card.bg)}>
                                <card.icon className={cn("w-5 h-5", card.color)} />
                            </div>
                            {card.trend !== undefined && card.trend !== 0 && (
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-0.5",
                                    card.trend > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                )}>
                                    {card.trend > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                                    {Math.abs(card.trend)}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-3xl font-black text-white">{card.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Main Chart */}
                <div className="xl:col-span-8 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">System Engagement</h3>
                            <p className="text-xs text-zinc-500 font-medium tracking-wide italic">Activity trend for {selectedModule === "all" ? "Whole System" : selectedModule}</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                                <XAxis
                                    dataKey="displayDate"
                                    stroke="#3f3f46"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={Math.floor(stats.trendData.length / 6)}
                                />
                                <YAxis stroke="#3f3f46" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="count" stroke="var(--color-accent)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Module distribution */}
                <div className="xl:col-span-4 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-6">Module Leaderboard</h3>
                    <div className="space-y-6">
                        {stats.moduleChartData.slice(0, 6).map((item, idx) => (
                            <div key={item.name} className="group">
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="font-bold text-zinc-300 capitalize flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        {item.name}
                                    </span>
                                    <span className="text-zinc-500 font-mono">{item.value}</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${(item.value / stats.moduleChartData[0].value) * 100}%`,
                                            backgroundColor: COLORS[idx % COLORS.length]
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-zinc-900">
                        <h4 className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-5">Device Breakdown</h4>
                        <div className="flex items-center justify-around">
                            {stats.deviceData.map((d) => (
                                <div key={d.name} className="text-center">
                                    <div className="text-lg font-black text-white mb-1">{((d.value / stats.totalEvents) * 100).toFixed(0)}%</div>
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter flex items-center justify-center gap-1">
                                        {d.name === 'Desktop' ? <Monitor className="w-2.5 h-2.5" /> :
                                            d.name === 'Mobile' ? <Smartphone className="w-2.5 h-2.5" /> :
                                                <Tablet className="w-2.5 h-2.5" />}
                                        {d.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Event Feed */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-8 pb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-accent animate-pulse" /> Live System Feed
                        </h3>
                        <p className="text-zinc-500 text-xs mt-1">Real-time interaction log updated just now.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[500px] p-2 space-y-1 custom-scrollbar">
                        {stats.recentEvents.map((event) => (
                            <div key={event._id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-900/40 transition-colors group">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-zinc-800 transition-colors group-hover:border-accent/20",
                                    "bg-zinc-900"
                                )}>
                                    {event.device_type === 'mobile' ? <Smartphone className="w-4 h-4 text-zinc-500" /> : <Monitor className="w-4 h-4 text-zinc-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-sm font-bold text-zinc-200 capitalize truncate">
                                            {event.module || 'system'} • <span className="text-accent">{(event.action || 'page_view').replace('_', ' ')}</span>
                                        </p>
                                        <span className="text-[10px] text-zinc-600 font-mono italic">#{event.session_id}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 truncate font-medium flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3 shrink-0" /> {event.path}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-bold text-zinc-600">
                                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '00:00:00'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detailed Action Analysis */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-6">Action Intelligence</h3>
                    <div className="space-y-3">
                        {stats.topActions.map(([key, count], idx) => {
                            const [mod, act] = key.split(':');
                            return (
                                <div key={key} className="flex items-center justify-between p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl hover:border-zinc-800 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-zinc-200 uppercase tracking-tighter">
                                                {mod}
                                            </p>
                                            <p className="text-sm font-bold text-zinc-400 capitalize">
                                                {(act || 'page_view').replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white leading-none">{count}</p>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Events</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

