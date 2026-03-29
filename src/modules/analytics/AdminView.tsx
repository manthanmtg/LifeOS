"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Monitor,
  Smartphone,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Layers,
  Activity,
  Users,
  Zap,
  ChevronRight,
  Tablet,
  Clock,
  Globe,
  FileText,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
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
  is_admin?: boolean;
  timestamp: string;
}

const COLORS = [
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
];

export default function AnalyticsAdminView() {
  const [metrics, setMetrics] = useState<MetricEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [trafficSource, setTrafficSource] = useState<
    "all" | "admin" | "public"
  >("all");
  const [metricType, setMetricType] = useState<"all" | "views" | "actions">(
    "views",
  );

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

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Compute stats
  const stats = useMemo(() => {
    let filtered =
      selectedModule === "all"
        ? metrics
        : metrics.filter((m) => m.module === selectedModule);

    // Filter by traffic source
    if (trafficSource === "admin") {
      filtered = filtered.filter((m) => m.is_admin === true);
    } else if (trafficSource === "public") {
      filtered = filtered.filter((m) => m.is_admin === false);
    }

    // Filter by metric type
    let leaderboardMetrics = filtered;
    if (metricType === "views") {
      leaderboardMetrics = filtered.filter((m) =>
        ["page_view", "session_start"].includes(m.action),
      );
    } else if (metricType === "actions") {
      leaderboardMetrics = filtered.filter(
        (m) => !["page_view", "session_start"].includes(m.action),
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    const todayActions = filtered.filter((m) =>
      m.timestamp?.startsWith(today),
    ).length;
    const yesterdayActions = filtered.filter((m) =>
      m.timestamp?.startsWith(yesterday),
    ).length;

    const uniqueSessions = new Set(filtered.map((m) => m.session_id)).size;

    // Module activity (Leaderboard) - using leaderboardMetrics
    const moduleCounts: Record<string, number> = {};
    leaderboardMetrics.forEach((m) => {
      moduleCounts[m.module] = (moduleCounts[m.module] || 0) + 1;
    });
    const moduleChartData = Object.entries(moduleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Daily trend - using filtered
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
        displayDate: new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        count: dailyAgg[d] || 0,
      });
    }

    // Device breakdown
    const deviceData = [
      {
        name: "Desktop",
        value: filtered.filter((m) => m.device_type === "desktop").length,
      },
      {
        name: "Mobile",
        value: filtered.filter((m) => m.device_type === "mobile").length,
      },
      {
        name: "Tablet",
        value: filtered.filter((m) => m.device_type === "tablet").length,
      },
    ].filter((d) => d.value > 0);

    // Top actions
    const actionCounts: Record<string, number> = {};
    filtered.forEach((m) => {
      const key = `${m.module}:${m.action}`;
      actionCounts[key] = (actionCounts[key] || 0) + 1;
    });
    const topActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // ─── Referrer Intelligence ───
    const referrerGroups: Record<string, number> = {
      Direct: 0,
      Search: 0,
      Social: 0,
      Other: 0,
    };
    const referrerDetails: Record<string, number> = {};
    filtered.forEach((m) => {
      const ref = m.referrer;
      if (!ref || ref === "null") {
        referrerGroups["Direct"]++;
      } else {
        const lower = ref.toLowerCase();
        if (
          lower.includes("google") ||
          lower.includes("bing") ||
          lower.includes("duckduckgo") ||
          lower.includes("yahoo")
        ) {
          referrerGroups["Search"]++;
        } else if (
          lower.includes("twitter") ||
          lower.includes("x.com") ||
          lower.includes("facebook") ||
          lower.includes("linkedin") ||
          lower.includes("reddit") ||
          lower.includes("instagram")
        ) {
          referrerGroups["Social"]++;
        } else {
          referrerGroups["Other"]++;
        }
        // Domain-level detail
        try {
          const domain = new URL(ref).hostname.replace("www.", "");
          referrerDetails[domain] = (referrerDetails[domain] || 0) + 1;
        } catch {
          referrerDetails[ref.slice(0, 40)] =
            (referrerDetails[ref.slice(0, 40)] || 0) + 1;
        }
      }
    });
    const referrerData = Object.entries(referrerGroups)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const topReferrers = Object.entries(referrerDetails)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // ─── Hourly Activity Heatmap ───
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const heatmapData: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0),
    );
    let heatmapMax = 1;
    filtered.forEach((m) => {
      if (!m.timestamp) return;
      const d = new Date(m.timestamp);
      const day = d.getDay();
      const hour = d.getHours();
      heatmapData[day][hour]++;
      if (heatmapData[day][hour] > heatmapMax)
        heatmapMax = heatmapData[day][hour];
    });

    // ─── Top Pages ───
    const pageCounts: Record<string, number> = {};
    filtered.forEach((m) => {
      if (m.path) pageCounts[m.path] = (pageCounts[m.path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // ─── Average Session Duration ───
    const sessionEndEvents = metrics.filter(
      (m) => m.action === "session_end" && m.value,
    );
    const avgSessionMs =
      sessionEndEvents.length > 0
        ? sessionEndEvents.reduce((s, e) => s + (e.value || 0), 0) /
          sessionEndEvents.length
        : 0;
    const avgSessionSec = Math.round(avgSessionMs / 1000);
    const avgSessionFormatted =
      avgSessionSec > 0
        ? avgSessionSec >= 60
          ? `${Math.floor(avgSessionSec / 60)}m ${avgSessionSec % 60}s`
          : `${avgSessionSec}s`
        : "—";

    // ─── Public vs Admin Traffic (daily) ───
    const adminDailyAgg: Record<string, number> = {};
    const publicDailyAgg: Record<string, number> = {};
    metrics.forEach((m) => {
      const d = m.timestamp?.split("T")[0];
      if (!d) return;
      if (m.is_admin) adminDailyAgg[d] = (adminDailyAgg[d] || 0) + 1;
      else publicDailyAgg[d] = (publicDailyAgg[d] || 0) + 1;
    });
    const trafficSplitData = [];
    for (let j = parseInt(dateRange) - 1; j >= 0; j--) {
      const d = new Date(Date.now() - j * 86400000).toISOString().split("T")[0];
      trafficSplitData.push({
        date: d,
        displayDate: new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        admin: adminDailyAgg[d] || 0,
        public: publicDailyAgg[d] || 0,
      });
    }

    return {
      totalEvents: filtered.length,
      todayActions,
      yesterdayActions,
      uniqueSessions,
      moduleChartData,
      trendData,
      deviceData,
      topActions,
      recentEvents: filtered.slice(0, 15),
      referrerData,
      topReferrers,
      heatmapData,
      heatmapMax,
      DAY_NAMES,
      topPages,
      avgSessionFormatted,
      trafficSplitData,
    };
  }, [metrics, dateRange, selectedModule, trafficSource, metricType]);

  const trend = stats.todayActions - stats.yesterdayActions;

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-50 mb-2">
            OS Analytics
          </h1>
          <p className="text-zinc-500 font-medium">
            Real-time usage patterns and system intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/40 min-w-40 transition-all cursor-pointer"
          >
            <option value="all">Global System</option>
            {stats.moduleChartData.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name.charAt(0).toUpperCase() + m.name.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {[
              { id: "all", label: "All Traffic" },
              { id: "admin", label: "Admin Only" },
              { id: "public", label: "Public Only" },
            ].map((source) => (
              <button
                key={source.id}
                onClick={() =>
                  setTrafficSource(source.id as "all" | "admin" | "public")
                }
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  trafficSource === source.id
                    ? "bg-zinc-800 text-accent shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {source.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {[
              { id: "views", label: "Visitation" },
              { id: "actions", label: "Actions" },
              { id: "all", label: "Combined" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() =>
                  setMetricType(type.id as "all" | "views" | "actions")
                }
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  metricType === type.id
                    ? "bg-zinc-800 text-accent shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {["7", "30", "90"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  dateRange === range
                    ? "bg-zinc-800 text-accent shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {range}D
              </button>
            ))}
          </div>

          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2.5 bg-zinc-900 text-zinc-400 rounded-xl hover:text-accent hover:border-accent/40 border border-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {[
          {
            label: "Total Events",
            value: stats.totalEvents,
            icon: Activity,
            color: "text-accent",
            bg: "bg-accent/10",
          },
          {
            label: "Unique sessions",
            value: stats.uniqueSessions,
            icon: Users,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
          {
            label: "Avg. Session",
            value: stats.avgSessionFormatted,
            icon: Clock,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            isText: true,
          },
          {
            label: "Active Modules",
            value: stats.moduleChartData.length,
            icon: Layers,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Today's Events",
            value: stats.todayActions,
            icon: Zap,
            color: "text-warning",
            bg: "bg-warning/10",
            trend: trend,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl hover:border-zinc-800 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", card.bg)}>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
              {card.trend !== undefined && card.trend !== 0 && (
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-0.5",
                    card.trend > 0
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  )}
                >
                  {card.trend > 0 ? (
                    <ArrowUp className="w-2.5 h-2.5" />
                  ) : (
                    <ArrowDown className="w-2.5 h-2.5" />
                  )}
                  {Math.abs(card.trend)}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
              {card.label}
            </p>
            <p className="text-3xl font-black text-zinc-50">
              {"isText" in card && card.isText
                ? card.value
                : typeof card.value === "number"
                  ? card.value.toLocaleString()
                  : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="xl:col-span-8 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-zinc-50 mb-1">
                System Engagement
              </h3>
              <p className="text-xs text-zinc-500 font-medium tracking-wide italic">
                Activity trend for{" "}
                {selectedModule === "all" ? "Whole System" : selectedModule}
              </p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#18181b"
                />
                <XAxis
                  dataKey="displayDate"
                  stroke="#3f3f46"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(stats.trendData.length / 6)}
                />
                <YAxis
                  stroke="#3f3f46"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                  cursor={{ stroke: "rgba(255,255,255,0.05)", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-accent)"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Module distribution */}
        <div className="xl:col-span-4 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-zinc-50 mb-6">
            Module Leaderboard
          </h3>
          <div className="space-y-6">
            {stats.moduleChartData.slice(0, 6).map((item, idx) => (
              <div key={item.name} className="group">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-zinc-300 capitalize flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="text-zinc-500 font-mono">{item.value}</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${(item.value / stats.moduleChartData[0].value) * 100}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-900">
            <h4 className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-5">
              Device Breakdown
            </h4>
            <div className="flex items-center justify-around">
              {stats.deviceData.map((d) => (
                <div key={d.name} className="text-center">
                  <div className="text-lg font-black text-zinc-50 mb-1">
                    {((d.value / stats.totalEvents) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter flex items-center justify-center gap-1">
                    {d.name === "Desktop" ? (
                      <Monitor className="w-2.5 h-2.5" />
                    ) : d.name === "Mobile" ? (
                      <Smartphone className="w-2.5 h-2.5" />
                    ) : (
                      <Tablet className="w-2.5 h-2.5" />
                    )}
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
            <h3 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent animate-pulse" /> Live
              System Feed
            </h3>
            <p className="text-zinc-500 text-xs mt-1">
              Real-time interaction log updated just now.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] p-2 space-y-1 custom-scrollbar">
            {stats.recentEvents.map((event) => (
              <div
                key={event._id}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-900/40 transition-colors group"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-zinc-800 transition-colors group-hover:border-accent/20",
                    "bg-zinc-900",
                  )}
                >
                  {event.device_type === "mobile" ? (
                    <Smartphone className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <Monitor className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-bold text-zinc-200 capitalize truncate">
                      {event.module || "system"} •{" "}
                      <span className="text-accent">
                        {(event.action || "page_view").replace("_", " ")}
                      </span>
                    </p>
                    <span className="text-[10px] text-zinc-600 font-mono italic">
                      #{event.session_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate font-medium flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 shrink-0" /> {event.path}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-zinc-600">
                    {event.timestamp
                      ? new Date(event.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "00:00:00"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Action Analysis */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-zinc-50 mb-6">
            Action Intelligence
          </h3>
          <div className="space-y-3">
            {stats.topActions.map(([key, count], idx) => {
              const [mod, act] = key.split(":");
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl hover:border-zinc-800 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-200 uppercase tracking-tighter">
                        {mod}
                      </p>
                      <p className="text-sm font-bold text-zinc-400 capitalize">
                        {(act || "page_view").replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-50 leading-none">
                      {count}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                      Events
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Hourly Activity Heatmap ─── */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
        <h3 className="text-xl font-bold text-zinc-50 mb-2">Activity Heatmap</h3>
        <p className="text-xs text-zinc-500 font-medium mb-6 italic">
          When users interact most — darker cells mean more activity.
        </p>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex gap-[2px] mb-1 ml-12">
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[9px] text-zinc-600 font-mono"
                >
                  {h === 0
                    ? "12a"
                    : h < 12
                      ? `${h}a`
                      : h === 12
                        ? "12p"
                        : `${h - 12}p`}
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {stats.heatmapData.map((hours, dayIdx) => (
              <div
                key={dayIdx}
                className="flex items-center gap-[2px] mb-[2px]"
              >
                <span className="w-10 text-[10px] font-bold text-zinc-500 text-right pr-2 shrink-0">
                  {stats.DAY_NAMES[dayIdx]}
                </span>
                {hours.map((count, hourIdx) => {
                  const intensity =
                    stats.heatmapMax > 0 ? count / stats.heatmapMax : 0;
                  return (
                    <div
                      key={hourIdx}
                      className="flex-1 aspect-square rounded-sm transition-colors cursor-default"
                      style={{
                        backgroundColor:
                          intensity === 0
                            ? "rgba(39, 39, 42, 0.3)"
                            : `rgba(var(--accent-rgb, 99, 102, 241), ${0.15 + intensity * 0.85})`,
                      }}
                      title={`${stats.DAY_NAMES[dayIdx]} ${hourIdx}:00 — ${count} events`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Top Pages ─── */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-zinc-50 mb-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> Top Pages
          </h3>
          <p className="text-xs text-zinc-500 font-medium mb-6 italic">
            Most visited paths across the system.
          </p>
          <div className="space-y-2">
            {stats.topPages.map(([path, count], idx) => {
              const pct =
                stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
              return (
                <div
                  key={path}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900/40 transition-colors relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-[0.04]"
                    style={{
                      background: `linear-gradient(90deg, var(--color-accent) ${pct}%, transparent ${pct}%)`,
                    }}
                  />
                  <span className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500 shrink-0 relative z-10">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-zinc-300 truncate flex-1 relative z-10 font-mono">
                    {path}
                  </span>
                  <div className="text-right shrink-0 relative z-10">
                    <span className="text-sm font-black text-zinc-50">
                      {count}
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-1.5 font-bold">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
            {stats.topPages.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-8">
                No page data yet.
              </p>
            )}
          </div>
        </div>

        {/* ─── Referrer Intelligence ─── */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-zinc-50 mb-1 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-400" /> Referrer Intelligence
          </h3>
          <p className="text-xs text-zinc-500 font-medium mb-6 italic">
            Where your traffic comes from.
          </p>

          {/* Category bars */}
          <div className="space-y-4 mb-8">
            {stats.referrerData.map(([category, count]) => {
              const pct =
                stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
              const colorMap: Record<string, string> = {
                Direct: "var(--color-accent)",
                Search: "#10b981",
                Social: "#a855f7",
                Other: "#f59e0b",
              };
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-zinc-300 flex items-center gap-2">
                      <Globe
                        className="w-3 h-3"
                        style={{ color: colorMap[category] }}
                      />
                      {category}
                    </span>
                    <span className="text-zinc-500 font-mono">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colorMap[category],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top referrer domains */}
          {stats.topReferrers.length > 0 && (
            <>
              <h4 className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                Top Referrer Domains
              </h4>
              <div className="space-y-1">
                {stats.topReferrers.map(([domain, count]) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="text-xs text-zinc-400 font-medium truncate">
                      {domain}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Public vs Admin Traffic ─── */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-zinc-50 mb-1">
              Public vs Admin Traffic
            </h3>
            <p className="text-xs text-zinc-500 font-medium tracking-wide italic">
              Side-by-side comparison of traffic sources.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-accent">
              <div className="w-2 h-2 rounded-full bg-accent" />
              Admin
            </span>
            <span className="flex items-center gap-1.5 text-success">
              <div className="w-2 h-2 rounded-full bg-success" />
              Public
            </span>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.trafficSplitData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorPublic" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-success)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-success)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#18181b"
              />
              <XAxis
                dataKey="displayDate"
                stroke="#3f3f46"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(stats.trafficSplitData.length / 6)}
              />
              <YAxis
                stroke="#3f3f46"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                itemStyle={{ fontWeight: "bold" }}
                cursor={{ stroke: "rgba(255,255,255,0.05)", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="admin"
                stroke="var(--color-accent)"
                fillOpacity={1}
                fill="url(#colorAdmin)"
                strokeWidth={2}
                name="Admin"
              />
              <Area
                type="monotone"
                dataKey="public"
                stroke="var(--color-success)"
                fillOpacity={1}
                fill="url(#colorPublic)"
                strokeWidth={2}
                name="Public"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
