"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { THEMES } from "@/components/ThemeProvider";
import { Check, Palette, Eye, EyeOff, Power, Download, Upload, AlertTriangle, GripVertical, Globe, Settings2, ImageIcon, LayoutGrid, CheckCircle2, Sun, Moon, Database, Server, HardDrive, FileStack, Layers, RefreshCw, X, Info, Link, Trash2 } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { moduleRegistry } from "@/registry";
import { motion, AnimatePresence, Reorder } from "framer-motion";

const THEME_META: Record<string, { label: string; colors: string[] }> = {
    "one-dark": { label: "One Dark", colors: ["#161b26", "#61afef", "#f2f4f8"] },
    "dracula": { label: "Dracula", colors: ["#1d1530", "#bd93f9", "#f7f5ff"] },
    "github-dark": { label: "GitHub Dark", colors: ["#0d1117", "#58a6ff", "#c9d1d9"] },
    "night-owl": { label: "Night Owl", colors: ["#011627", "#c792ea", "#d6deeb"] },
    "solarized-dark": { label: "Solarized Dark", colors: ["#002b36", "#268bd2", "#839496"] },
    "material-dark": { label: "Material Dark", colors: ["#121212", "#80cbc4", "#e0e0e0"] },
    "monokai": { label: "Monokai", colors: ["#272822", "#a6e22e", "#f8f8f2"] },
    "cyberpunk": { label: "Cyberpunk", colors: ["#240717", "#ff2d95", "#ffe6f6"] },
    "aurora": { label: "Aurora", colors: ["#0f003b", "#00d2ff", "#f3f0ff"] },
    "ocean-dark": { label: "Ocean Dark", colors: ["#16213e", "#48dbfb", "#eff6ff"] },
    "sunset": { label: "Sunset", colors: ["#1f0802", "#ff6b6b", "#fff4ec"] },
    "coffee": { label: "Coffee", colors: ["#1f100a", "#d4a574", "#fdfaf8"] },
    "minimal-light": { label: "Minimal Light", colors: ["#ffffff", "#404040", "#e5e5e5"] },
    "nordic-light": { label: "Nordic Light", colors: ["#eceff4", "#5e81ac", "#2e3440"] },
};

interface DbStats {
    database: {
        name: string;
        collections: number;
        documents: number;
        dataSize: number;
        storageSize: number;
        indexSize: number;
        avgObjSize: number;
    };
    collections: Array<{
        name: string;
        documentCount: number;
        size: number;
        avgObjSize: number;
        storageSize: number;
        indexSize: number;
    }>;
    server: {
        version: string;
        gitVersion: string;
        platform: string;
        engine: string;
    } | null;
    connection: {
        database: string;
        connectionString: string | null;
    };
    limits: {
        estimated: number;
        usagePercent: number;
        remaining: number;
    };
}

interface SystemConfig {
    active_theme: string;
    color_mode?: "light" | "dark";
    site_title: string;
    site_icon?: string;
    moduleRegistry: Record<string, { enabled: boolean; isPublic: boolean }>;
    moduleOrder?: string[];
    orderingStrategy?: "custom" | "name" | "visits";
    pageVisits?: Record<string, number>;
}

const emojiToSvg = (emoji: string) =>
    `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;

const ICON_PRESETS = [
    { label: "Default", value: "/favicon.ico", emoji: null },
    { label: "Rocket", emoji: "🚀", value: emojiToSvg("🚀") },
    { label: "Sparkles", emoji: "✨", value: emojiToSvg("✨") },
    { label: "Brain", emoji: "🧠", value: emojiToSvg("🧠") },
    { label: "Leaf", emoji: "🌿", value: emojiToSvg("🌿") },
    { label: "Flame", emoji: "🔥", value: emojiToSvg("🔥") },
    { label: "Diamond", emoji: "💎", value: emojiToSvg("💎") },
    { label: "Lightning", emoji: "⚡", value: emojiToSvg("⚡") },
    { label: "Star", emoji: "⭐", value: emojiToSvg("⭐") },
    { label: "Globe", emoji: "🌍", value: emojiToSvg("🌍") },
    { label: "Crown", emoji: "👑", value: emojiToSvg("👑") },
    { label: "Atom", emoji: "⚛️", value: emojiToSvg("⚛️") },
];

type SettingsTab = "themes" | "modules" | "branding" | "data";

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "themes", label: "Themes", icon: Palette },
    { id: "modules", label: "Modules", icon: LayoutGrid },
    { id: "branding", label: "Branding", icon: Globe },
    { id: "data", label: "Data", icon: Database },
];

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [moduleOrder, setModuleOrder] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [themeSwitched, setThemeSwitched] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>("themes");
    const [dbStats, setDbStats] = useState<DbStats | null>(null);
    const [dbStatsLoading, setDbStatsLoading] = useState(false);
    const [dbStatsError, setDbStatsError] = useState<string | null>(null);
    const [infoModule, setInfoModule] = useState<string | null>(null);
    const [infoContent, setInfoContent] = useState<string>("");
    const [infoLoading, setInfoLoading] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);
    const iconFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        fetch("/api/system")
            .then((r) => r.json())
            .then((d) => {
                const conf = d.data as SystemConfig;
                setConfig(conf);
                const order = conf?.moduleOrder || [];
                const sorted = Object.keys(moduleRegistry).sort((a, b) => {
                    const ia = order.indexOf(a);
                    const ib = order.indexOf(b);
                    if (ia === -1 && ib === -1) return 0;
                    if (ia === -1) return 1;
                    if (ib === -1) return -1;
                    return ia - ib;
                });
                setModuleOrder(sorted);
            })
            .catch(console.error);
    }, []);

    const sortedModuleKeys = (() => {
        if (!config) return moduleOrder;
        const strategy = config.orderingStrategy || "custom";

        if (strategy === "name") {
            return [...moduleOrder].sort((a, b) => {
                const nameA = moduleRegistry[a]?.name || "";
                const nameB = moduleRegistry[b]?.name || "";
                return nameA.localeCompare(nameB);
            });
        }

        if (strategy === "visits") {
            return [...moduleOrder].sort((a, b) => {
                const visitsA = config.pageVisits?.[a] || 0;
                const visitsB = config.pageVisits?.[b] || 0;
                return visitsB - visitsA;
            });
        }

        return moduleOrder;
    })();

    const handleReorderEnd = () => {
        saveConfig({ moduleOrder });
    };

    const saveConfig = async (updates: Partial<SystemConfig>, silent = false) => {
        if (!silent) setSaving(true);
        try {
            await fetch("/api/system", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
        } catch (e) {
            console.error(e);
        } finally {
            if (!silent) setTimeout(() => setSaving(false), 600);
        }
    };

    const processIconFile = (file: File) => {
        if (file.size > 500 * 1024) {
            alert("Icon file too large. Please use an image under 500KB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            saveConfig({ site_icon: base64 });
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
        };
        reader.readAsDataURL(file);
    };

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processIconFile(file);
        if (iconFileRef.current) iconFileRef.current.value = "";
    };

    const handleIconDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            processIconFile(file);
        }
    };

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        saveConfig({ active_theme: newTheme }, true);

        setThemeSwitched(true);
        setTimeout(() => setThemeSwitched(false), 2000);
    };

    const handleModeChange = (newMode: "light" | "dark") => {
        saveConfig({ color_mode: newMode }, true);
        if (newMode === "light") {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
        } else {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
        }
    };

    const toggleModule = (key: string, field: "isPublic" | "enabled") => {
        if (!config) return;
        const current = config.moduleRegistry[key] || { enabled: true, isPublic: moduleRegistry[key]?.defaultPublic ?? false };
        const updated = {
            ...config.moduleRegistry,
            [key]: {
                ...current,
                [field]: !current[field],
            },
        };
        saveConfig({ moduleRegistry: updated });
    };

    const handleExport = async () => {
        try {
            const res = await fetch("/api/export");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lifeos-backup-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setImportResult("Export failed");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm("This will REPLACE all existing data. Are you sure?")) {
            if (fileRef.current) fileRef.current.value = "";
            return;
        }
        setImporting(true);
        setImportResult(null);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (result.success) {
                setImportResult(
                    `Restored: ${result.restored.system || 0} system, ${result.restored.content || 0} content, ${result.restored.metrics || 0} metrics docs`
                );
            } else {
                setImportResult(`Error: ${result.error}`);
            }
        } catch {
            setImportResult("Import failed — invalid JSON");
        } finally {
            setImporting(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const fetchDbStats = async () => {
        setDbStatsLoading(true);
        setDbStatsError(null);
        try {
            const res = await fetch("/api/db-stats");
            const result = await res.json();
            if (result.success) {
                setDbStats(result.data);
            } else {
                setDbStatsError(result.error || "Failed to load stats");
            }
        } catch (err) {
            console.error("Failed to fetch DB stats:", err);
            setDbStatsError("Network error");
        } finally {
            setDbStatsLoading(false);
        }
    };

    // Fetch DB stats when data tab is active
    useEffect(() => {
        if (activeTab === "data") {
            fetchDbStats();
        }
    }, [activeTab]);

    const openModuleInfo = async (slug: string) => {
        setInfoModule(slug);
        setInfoLoading(true);
        try {
            const res = await fetch(`/api/module-info/${slug}`);
            const data = await res.json();
            if (data.success && data.data?.content) {
                setInfoContent(data.data.content);
            } else {
                setInfoContent("*No documentation available for this module yet.*");
            }
        } catch {
            setInfoContent("*Failed to load module info.*");
        } finally {
            setInfoLoading(false);
        }
    };

    const currentIcon = config?.site_icon || "/favicon.ico";
    const isCustomIcon = config?.site_icon && !ICON_PRESETS.some(p => p.value === config.site_icon);
    const isCustomUrl = isCustomIcon && !config.site_icon.startsWith("data:");

    return (
        <div className="animate-fade-in-up pb-20">
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-zinc-50 mb-2 flex items-center gap-3">
                    <Settings2 className="w-8 h-8 text-accent" />
                    Settings
                </h1>
                <p className="text-zinc-400">Manage themes, modules, branding, and data.</p>
            </header>

            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-zinc-950/50 border border-zinc-800/80 p-1 rounded-2xl mb-8 w-fit">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                                isActive
                                    ? "text-accent"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeSettingsTab"
                                    className="absolute inset-0 bg-accent/10 border border-accent/20 rounded-xl"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <Icon className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                >
                    {/* ─── THEMES TAB ─── */}
                    {activeTab === "themes" && (
                        <section className="relative space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                                        <Palette className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-zinc-50 tracking-tight">Theme Engine</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">Select a unified color palette for your entire workspace.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 bg-zinc-950/50 border border-zinc-800/80 p-1 rounded-xl shadow-inner">
                                        <button
                                            onClick={() => handleModeChange("light")}
                                            className={cn("p-2 rounded-lg transition-all", config?.color_mode === "light" ? "bg-zinc-800 text-amber-300 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                                        >
                                            <Sun className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleModeChange("dark")}
                                            className={cn("p-2 rounded-lg transition-all", (!config?.color_mode || config?.color_mode === "dark") ? "bg-zinc-800 text-indigo-300 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                                        >
                                            <Moon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {themeSwitched && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="flex items-center gap-2 text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20 text-sm font-medium shadow-lg shadow-accent/5"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Theme applied
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 bg-zinc-950/30 p-6 rounded-3xl border border-white/5 shadow-inner">
                                {THEMES.map((t) => {
                                    const meta = THEME_META[t];
                                    const isActive = mounted && theme === t;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => handleThemeChange(t)}
                                            className={cn(
                                                "relative group flex flex-col items-center gap-3 focus:outline-none",
                                            )}
                                        >
                                            <div className={cn(
                                                "relative w-full aspect-square rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300",
                                                isActive ? "bg-zinc-900 border-zinc-800 shadow-xl" : "bg-zinc-900/40 border-transparent hover:bg-zinc-800/60"
                                            )}>
                                                <div className="relative w-16 h-16 transform group-hover:scale-110 transition-transform duration-500 ease-out">
                                                    <div className="absolute top-0 right-0 w-10 h-10 rounded-full shadow-lg border-2 border-zinc-900/80 z-20" style={{ backgroundColor: meta.colors[1] }} />
                                                    <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full shadow-lg border-2 border-zinc-900/80 z-10" style={{ backgroundColor: meta.colors[0] }} />
                                                    <div className="absolute bottom-2 right-1 w-6 h-6 rounded-full shadow-lg border-2 border-zinc-900/80 z-30" style={{ backgroundColor: meta.colors[2] }} />
                                                </div>

                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeThemeHighlight"
                                                        className="absolute inset-0 rounded-2xl border-2 border-accent"
                                                        initial={false}
                                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                    />
                                                )}
                                            </div>

                                            <span className={cn(
                                                "text-xs font-semibold px-2 py-1 rounded-md transition-colors",
                                                isActive ? "text-accent bg-accent/10" : "text-zinc-400 group-hover:text-zinc-300"
                                            )}>
                                                {meta.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ─── MODULES TAB ─── */}
                    {activeTab === "modules" && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                                    <LayoutGrid className="w-5 h-5 text-zinc-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-zinc-50 tracking-tight">Module Configuration</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Toggle, reorder, and control public access for each module. Disabled modules are hidden everywhere.</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 space-y-6">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Ordering Strategy</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: "custom", label: "Custom (Drag & Drop)", icon: GripVertical },
                                            { id: "name", label: "By Name", icon: LayoutGrid },
                                            { id: "visits", label: "By Page Visits", icon: Eye },
                                        ].map((strategy) => {
                                            const isActive = (config?.orderingStrategy || "custom") === strategy.id;
                                            const Icon = strategy.icon;
                                            return (
                                                <button
                                                    key={strategy.id}
                                                    onClick={() => saveConfig({ orderingStrategy: strategy.id as SystemConfig["orderingStrategy"] })}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                                                        isActive
                                                            ? "bg-accent/15 border-accent/30 text-accent shadow-sm"
                                                            : "bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {strategy.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {!config ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-20 bg-zinc-900/40 rounded-2xl animate-pulse border border-zinc-800/50" />
                                    ))}
                                </div>
                            ) : config.orderingStrategy === "custom" || !config.orderingStrategy ? (
                                <Reorder.Group axis="y" values={moduleOrder} onReorder={setModuleOrder} className="space-y-3">
                                    {moduleOrder.map((key) => {
                                        const mod = moduleRegistry[key];
                                        if (!mod) return null;
                                        const state = config?.moduleRegistry?.[key] || { enabled: true, isPublic: mod.defaultPublic ?? false };
                                        return (
                                            <Reorder.Item
                                                key={key}
                                                value={key}
                                                onDragEnd={handleReorderEnd}
                                                className={cn(
                                                    "bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-grab active:cursor-grabbing shadow-sm transition-all",
                                                    state.enabled ? "hover:border-zinc-700" : "opacity-50"
                                                )}
                                            >
                                                <div className="text-zinc-500 hover:text-zinc-50 transition-colors shrink-0 p-1">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <div
                                                    className="flex-1 cursor-pointer group/info"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={() => openModuleInfo(key)}
                                                >
                                                    <p className={cn("text-sm font-semibold mb-0.5 group-hover/info:text-accent transition-colors", state.enabled ? "text-zinc-300" : "text-zinc-500")}>
                                                        {mod.name}
                                                        <Info className="w-3 h-3 inline-block ml-1.5 text-zinc-600 group-hover/info:text-accent/60" />
                                                    </p>
                                                    <p className="text-xs font-medium text-zinc-500">
                                                        {!state.enabled ? "Disabled — hidden everywhere" : state.isPublic ? "Visible to public visitors" : "Only visible to Admin"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => toggleModule(key, "isPublic")}
                                                        disabled={!state.enabled}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-28 justify-center",
                                                            !state.enabled
                                                                ? "bg-zinc-950 text-zinc-600 border border-zinc-800/50 cursor-not-allowed"
                                                                : state.isPublic ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-950 text-zinc-500 border border-zinc-800/80"
                                                        )}
                                                    >
                                                        {state.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                        {state.isPublic ? "Public" : "Private"}
                                                    </button>
                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => toggleModule(key, "enabled")}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-24 justify-center",
                                                            state.enabled ? "bg-accent/10 text-accent border border-accent/20" : "bg-zinc-950 text-zinc-500 border border-zinc-800/80"
                                                        )}
                                                    >
                                                        <Power className="w-3.5 h-3.5" />
                                                        {state.enabled ? "Active" : "Off"}
                                                    </button>
                                                </div>
                                            </Reorder.Item>
                                        );
                                    })}
                                </Reorder.Group>
                            ) : (
                                <div className="space-y-3">
                                    {sortedModuleKeys.map((key) => {
                                        const mod = moduleRegistry[key];
                                        if (!mod) return null;
                                        const state = config?.moduleRegistry?.[key] || { enabled: true, isPublic: mod.defaultPublic ?? false };
                                        return (
                                            <div
                                                key={key}
                                                className={cn(
                                                    "bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm transition-all",
                                                    state.enabled ? "hover:border-zinc-700" : "opacity-50"
                                                )}
                                            >
                                                <div
                                                    className="flex-1 ml-2 cursor-pointer group/info"
                                                    onClick={() => openModuleInfo(key)}
                                                >
                                                    <p className={cn("text-sm font-semibold mb-0.5 group-hover/info:text-accent transition-colors", state.enabled ? "text-zinc-300" : "text-zinc-500")}>
                                                        {mod.name}
                                                        <Info className="w-3 h-3 inline-block ml-1.5 text-zinc-600 group-hover/info:text-accent/60" />
                                                    </p>
                                                    <p className="text-xs font-medium text-zinc-500">
                                                        {!state.enabled ? "Disabled — hidden everywhere" : state.isPublic ? "Visible to public visitors" : "Only visible to Admin"}
                                                        {config.orderingStrategy === "visits" && ` • ${config.pageVisits?.[key] || 0} visits`}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                                    <button
                                                        onClick={() => toggleModule(key, "isPublic")}
                                                        disabled={!state.enabled}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-28 justify-center",
                                                            !state.enabled
                                                                ? "bg-zinc-950 text-zinc-600 border border-zinc-800/50 cursor-not-allowed"
                                                                : state.isPublic ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-950 text-zinc-500 border border-zinc-800/80"
                                                        )}
                                                    >
                                                        {state.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                        {state.isPublic ? "Public" : "Private"}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleModule(key, "enabled")}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all w-24 justify-center",
                                                            state.enabled ? "bg-accent/10 text-accent border border-accent/20" : "bg-zinc-950 text-zinc-500 border border-zinc-800/80"
                                                        )}
                                                    >
                                                        <Power className="w-3.5 h-3.5" />
                                                        {state.enabled ? "Active" : "Off"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ─── BRANDING TAB ─── */}
                    {activeTab === "branding" && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                                    <Globe className="w-5 h-5 text-zinc-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-zinc-50 tracking-tight">Branding config</h2>
                                </div>
                            </div>

                            {/* Site Title */}
                            <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 lg:p-8">
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Site Title (Alternative)</label>
                                <input
                                    type="text"
                                    value={config?.site_title || ""}
                                    onChange={(e) => saveConfig({ site_title: e.target.value })}
                                    placeholder="Life OS"
                                    className="w-full max-w-lg bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-accent/50 shadow-inner"
                                />
                                <p className="text-[11px] text-zinc-500 mt-2 font-medium">Overrides title tags, but falls back to Portfolio name if set.</p>
                            </div>

                            {/* Site Icon (Favicon) — Rich Section */}
                            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/5 rounded-3xl p-6 lg:p-8 space-y-8 overflow-hidden relative">
                                <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/[0.03] rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-accent/[0.02] rounded-full blur-3xl pointer-events-none" />

                                <div className="relative z-10 space-y-8">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
                                                <ImageIcon className="w-5 h-5 text-accent" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-zinc-100">Site Icon</h3>
                                                <p className="text-xs text-zinc-500">Favicon displayed in browser tabs and bookmarks</p>
                                            </div>
                                        </div>
                                        {isCustomIcon && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={() => saveConfig({ site_icon: "/favicon.ico" })}
                                                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Reset to default
                                            </motion.button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                                        {/* Live Preview Panel */}
                                        <div className="flex flex-col items-center gap-5">
                                            {/* Browser Tab Mockup */}
                                            <div className="w-full max-w-[280px]">
                                                <div className="bg-zinc-800/80 rounded-t-xl border border-zinc-700/40 border-b-0 px-2.5 pt-2.5 pb-0">
                                                    <div className="flex items-center gap-1.5 mb-2 px-1">
                                                        <div className="w-2 h-2 rounded-full bg-red-500/60" />
                                                        <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                                                        <div className="w-2 h-2 rounded-full bg-green-500/60" />
                                                    </div>
                                                    <div className="flex items-center">
                                                        <div className="flex items-center gap-2 bg-zinc-900/80 rounded-t-lg px-3.5 py-2 border border-zinc-700/30 border-b-zinc-900/80 -mb-px relative z-10 max-w-[180px]">
                                                            <AnimatePresence mode="wait">
                                                                <motion.img
                                                                    key={currentIcon}
                                                                    src={currentIcon}
                                                                    alt=""
                                                                    className="w-3.5 h-3.5 shrink-0"
                                                                    initial={{ scale: 0, rotate: -180 }}
                                                                    animate={{ scale: 1, rotate: 0 }}
                                                                    exit={{ scale: 0, rotate: 180 }}
                                                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                                />
                                                            </AnimatePresence>
                                                            <span className="text-[11px] text-zinc-400 truncate">{config?.site_title || "Life OS"}</span>
                                                        </div>
                                                        <div className="flex-1 border-b border-zinc-700/30" />
                                                    </div>
                                                </div>
                                                <div className="bg-zinc-900/60 border border-zinc-700/40 border-t-0 rounded-b-xl px-3.5 py-2 flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-zinc-600">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-3-3m0 0l3-3m-3 3h12M4 19h.01M4 12h.01M4 5h.01" /></svg>
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                    </div>
                                                    <div className="flex-1 bg-zinc-950/60 rounded-md px-2.5 py-1 flex items-center gap-1.5">
                                                        <svg className="w-2.5 h-2.5 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                        <span className="text-[10px] text-zinc-600 truncate">yoursite.com</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Large Preview */}
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-accent/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className="relative w-28 h-28 rounded-2xl bg-[image:repeating-conic-gradient(#27272a_0%_25%,transparent_0%_50%)] bg-[length:14px_14px] overflow-hidden flex items-center justify-center border border-zinc-700/40 shadow-2xl">
                                                    <AnimatePresence mode="wait">
                                                        <motion.img
                                                            key={currentIcon}
                                                            src={currentIcon}
                                                            alt="Current favicon"
                                                            className="w-20 h-20 object-contain drop-shadow-lg"
                                                            initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                            exit={{ scale: 0.3, opacity: 0, rotate: 20 }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                                        />
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Multi-Size Strip */}
                                            <div className="flex items-end gap-4">
                                                {[48, 32, 24, 16].map((size) => (
                                                    <div key={size} className="flex flex-col items-center gap-1.5">
                                                        <div
                                                            className="bg-[image:repeating-conic-gradient(#27272a_0%_25%,transparent_0%_50%)] bg-[length:6px_6px] rounded-lg border border-zinc-800/50 flex items-center justify-center"
                                                            style={{ width: size + 8, height: size + 8 }}
                                                        >
                                                            <motion.img
                                                                key={`${currentIcon}-${size}`}
                                                                src={currentIcon}
                                                                alt=""
                                                                style={{ width: size, height: size }}
                                                                className="object-contain"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                transition={{ delay: size * 0.003 }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-zinc-600 font-mono tabular-nums">{size}px</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Column — Presets + Upload */}
                                        <div className="space-y-6">
                                            {/* Emoji Presets */}
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Presets</label>
                                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                    {ICON_PRESETS.map((icon) => {
                                                        const isSelected = config?.site_icon === icon.value || (!config?.site_icon && icon.value === "/favicon.ico");
                                                        return (
                                                            <motion.button
                                                                key={icon.value}
                                                                whileHover={{ scale: 1.06, y: -2 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => saveConfig({ site_icon: icon.value })}
                                                                className={cn(
                                                                    "relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-all border cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-accent/10 border-accent/40 shadow-[0_0_24px_-6px] shadow-accent/25 ring-1 ring-accent/20"
                                                                        : "bg-zinc-900/60 border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700/60"
                                                                )}
                                                            >
                                                                <span className="text-2xl leading-none">{icon.emoji || "🏠"}</span>
                                                                <span className={cn("text-[10px] font-medium leading-tight", isSelected ? "text-accent" : "text-zinc-500")}>{icon.label}</span>
                                                                <AnimatePresence>
                                                                    {isSelected && (
                                                                        <motion.div
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            exit={{ scale: 0 }}
                                                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30"
                                                                        >
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Drag & Drop Upload Zone */}
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Upload Custom Icon</label>
                                                <div
                                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                                    onDragLeave={() => setDragOver(false)}
                                                    onDrop={handleIconDrop}
                                                    onClick={() => iconFileRef.current?.click()}
                                                    className={cn(
                                                        "relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 cursor-pointer group",
                                                        dragOver
                                                            ? "border-accent/60 bg-accent/[0.06] scale-[1.01]"
                                                            : "border-zinc-700/30 hover:border-zinc-600/50 bg-zinc-950/20 hover:bg-zinc-900/20"
                                                    )}
                                                >
                                                    <div className="flex flex-col items-center gap-2.5 text-center">
                                                        <motion.div
                                                            animate={dragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                            className={cn(
                                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300",
                                                                dragOver ? "bg-accent/15 text-accent" : "bg-zinc-800/60 text-zinc-500 group-hover:text-zinc-400 group-hover:bg-zinc-800"
                                                            )}
                                                        >
                                                            <Upload className="w-5 h-5" />
                                                        </motion.div>
                                                        <div>
                                                            <p className={cn("text-sm font-medium transition-colors", dragOver ? "text-accent" : "text-zinc-300")}>
                                                                {dragOver ? "Drop to upload..." : "Drop an image here, or click to browse"}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-600 mt-0.5">PNG, JPG, SVG, ICO — max 500 KB</p>
                                                        </div>
                                                    </div>
                                                    <input
                                                        ref={iconFileRef}
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/gif,image/webp"
                                                        onChange={handleIconUpload}
                                                        className="hidden"
                                                    />
                                                    <AnimatePresence>
                                                        {uploadSuccess && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -8 }}
                                                                className="absolute inset-0 flex items-center justify-center bg-emerald-500/[0.06] rounded-2xl border-2 border-emerald-500/30 backdrop-blur-sm"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <motion.div
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                                                                        className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center"
                                                                    >
                                                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                                    </motion.div>
                                                                    <span className="text-sm font-semibold text-emerald-400">Icon uploaded!</span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Custom URL Input */}
                                            <div>
                                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Or paste image URL</label>
                                                <div className="relative">
                                                    <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                    <input
                                                        type="text"
                                                        value={isCustomUrl ? config.site_icon : ""}
                                                        onChange={(e) => saveConfig({ site_icon: e.target.value })}
                                                        placeholder="https://example.com/icon.png"
                                                        className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl pl-10 pr-14 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-accent/50 shadow-inner placeholder:text-zinc-700"
                                                    />
                                                    {isCustomUrl && (
                                                        <motion.img
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            src={config.site_icon}
                                                            alt=""
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md object-contain border border-zinc-700/40"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ─── DATA TAB ─── */}
                    {activeTab === "data" && (
                        <section className="space-y-6">
                            {/* MongoDB Cluster Card */}
                            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-zinc-800/60 rounded-3xl p-6 lg:p-8 overflow-hidden relative">
                                {/* Background glow effect */}
                                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

                                {/* Header */}
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                            <Server className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-zinc-50 tracking-tight">MongoDB Cluster</h2>
                                            <p className="text-sm text-zinc-500">{dbStats?.connection?.database || "lifeos"} • {dbStats?.server?.version || "v7.x"}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={fetchDbStats}
                                        disabled={dbStatsLoading}
                                        className="p-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw className={cn("w-4 h-4 text-zinc-400", dbStatsLoading && "animate-spin")} />
                                    </button>
                                </div>

                                {dbStatsError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 relative z-10">
                                        <p className="text-sm text-red-400">Error: {dbStatsError}</p>
                                    </div>
                                )}

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10">
                                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Layers className="w-4 h-4 text-zinc-500" />
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Collections</span>
                                        </div>
                                        <p className="text-2xl font-bold text-zinc-200">{dbStatsLoading ? "—" : dbStats?.database.collections || 0}</p>
                                    </div>
                                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileStack className="w-4 h-4 text-zinc-500" />
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Documents</span>
                                        </div>
                                        <p className="text-2xl font-bold text-zinc-200">{dbStatsLoading ? "—" : dbStats?.database.documents.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <HardDrive className="w-4 h-4 text-zinc-500" />
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Data Size</span>
                                        </div>
                                        <p className="text-2xl font-bold text-zinc-200">
                                            {dbStatsLoading ? "—" : dbStats ? `${(dbStats.database.dataSize / 1024 / 1024).toFixed(1)} MB` : "0 MB"}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Database className="w-4 h-4 text-zinc-500" />
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Storage</span>
                                        </div>
                                        <p className="text-2xl font-bold text-zinc-200">
                                            {dbStatsLoading ? "—" : dbStats ? `${(dbStats.database.storageSize / 1024 / 1024).toFixed(1)} MB` : "0 MB"}
                                        </p>
                                    </div>
                                </div>

                                {/* Usage Progress Bar */}
                                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 mb-6 relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-zinc-300">Cluster Storage Usage</span>
                                            <span className="text-xs text-zinc-500">• Estimated limit based on tier</span>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-bold",
                                            (dbStats?.limits?.usagePercent || 0) > 80 ? "text-red-400" : (dbStats?.limits?.usagePercent || 0) > 50 ? "text-amber-400" : "text-emerald-400"
                                        )}>
                                            {dbStatsLoading ? "—" : `${dbStats?.limits?.usagePercent?.toFixed(1) || "0.0"}%`}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${dbStats?.limits?.usagePercent || 0}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={cn(
                                                "h-full rounded-full",
                                                (dbStats?.limits?.usagePercent || 0) > 80 ? "bg-gradient-to-r from-red-500 to-red-400" : (dbStats?.limits?.usagePercent || 0) > 50 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            )}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-3 text-xs">
                                        <span className="text-zinc-500">
                                            Used: {dbStats ? `${(dbStats.database?.storageSize / 1024 / 1024).toFixed(1)} MB` : "—"}
                                        </span>
                                        <span className="text-zinc-500">
                                            Limit: {dbStats ? `${(dbStats.limits?.estimated / 1024 / 1024).toFixed(0)} MB` : "~512 MB"}
                                        </span>
                                    </div>
                                </div>

                                {/* Collection Breakdown */}
                                {dbStats && dbStats.collections.length > 0 && (
                                    <div className="bg-zinc-950/30 border border-zinc-800/30 rounded-2xl overflow-hidden relative z-10">
                                        <div className="px-5 py-4 border-b border-zinc-800/30">
                                            <h3 className="text-sm font-semibold text-zinc-300">Collection Breakdown</h3>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {dbStats.collections.map((col, idx) => (
                                                <div key={col.name} className={cn(
                                                    "flex items-center justify-between px-5 py-3",
                                                    idx !== dbStats.collections.length - 1 && "border-b border-zinc-800/20"
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-accent/60" />
                                                        <span className="text-sm font-medium text-zinc-400">{col.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-xs">
                                                        <span className="text-zinc-500">{col.documentCount.toLocaleString()} docs</span>
                                                        <span className="text-zinc-400 font-medium w-16 text-right">{(col.size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Data Integrity Section */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                                    <Database className="w-5 h-5 text-zinc-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-zinc-50 tracking-tight">Data Integrity</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-6 flex flex-col items-start gap-4 hover:bg-zinc-900/80 transition-colors">
                                    <div>
                                        <h3 className="text-base font-semibold text-zinc-300">Export Backup</h3>
                                        <p className="text-sm text-zinc-500 mt-1">Download all system, content, and metrics as a single JSON file. Critical for safe keeping.</p>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        className="mt-auto flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-accent/20"
                                    >
                                        <Download className="w-4 h-4" /> Export Complete Backup
                                    </button>
                                </div>

                                <div className="bg-zinc-900/60 border border-red-500/10 rounded-2xl p-6 flex flex-col items-start gap-4 hover:bg-zinc-900/80 transition-colors relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-base font-semibold text-zinc-300">Restore System</h3>
                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                        </div>
                                        <p className="text-sm text-zinc-500">Upload a JSON backup to overwrite the current database. This is an irreversible action.</p>
                                    </div>
                                    <label className="mt-auto flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-red-200 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer w-fit shadow-sm relative z-10">
                                        <Upload className="w-4 h-4 text-red-400" /> {importing ? "Importing Data..." : "Upload JSON Backup"}
                                        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
                                    </label>
                                    {importResult && (
                                        <p className={cn("text-xs font-semibold relative z-10", importResult.startsWith("Error") || importResult.includes("failed") ? "text-red-400" : "text-emerald-400")}>
                                            {importResult}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {saving && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-6 right-6 bg-accent border border-accent/20 text-white shadow-2xl flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl z-50 pointer-events-none"
                    >
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving System Config...
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Module Info Modal */}
            <AnimatePresence>
                {infoModule && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setInfoModule(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={() => setInfoModule(null)}
                        >
                            <div
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                                            <Info className="w-5 h-5 text-accent" />
                                        </div>
                                        <h3 className="text-lg font-bold text-zinc-50">
                                            {moduleRegistry[infoModule]?.name || infoModule}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setInfoModule(null)}
                                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    {infoLoading ? (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-6 w-1/3 bg-zinc-800 rounded" />
                                            <div className="h-4 w-full bg-zinc-800 rounded" />
                                            <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                                            <div className="h-4 w-full bg-zinc-800 rounded" />
                                            <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                                        </div>
                                    ) : (
                                        <MarkdownRenderer content={infoContent} />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
