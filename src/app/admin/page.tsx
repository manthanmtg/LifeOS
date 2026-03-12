"use client";

import { useState, useEffect, ComponentType } from "react";
import dynamic from "next/dynamic";
import { Settings2, X, Check, LayoutGrid } from "lucide-react";
import { moduleRegistry } from "@/registry";
import { WidgetSkeleton, DashboardSkeleton } from "@/components/ui/Skeletons";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const widgetImports: Record<string, ComponentType> = {
    expenses: dynamic(() => import("@/modules/expenses/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    "recurring-expenses": dynamic(() => import("@/modules/recurring-expenses/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    "emi-tracker": dynamic(() => import("@/modules/emi-tracker/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    calculators: dynamic(() => import("@/modules/calculators/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    blog: dynamic(() => import("@/modules/blog/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    portfolio: dynamic(() => import("@/modules/portfolio/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    reading: dynamic(() => import("@/modules/reading/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    bookshelf: dynamic(() => import("@/modules/bookshelf/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    ideas: dynamic(() => import("@/modules/ideas/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    snippets: dynamic(() => import("@/modules/snippets/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    habits: dynamic(() => import("@/modules/habits/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    analytics: dynamic(() => import("@/modules/analytics/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    compass: dynamic(() => import("@/modules/compass/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    "rain-tracker": dynamic(() => import("@/modules/rain-tracker/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    todo: dynamic(() => import("@/modules/todo/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    "ai-usage": dynamic(() => import("@/modules/ai-usage/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    people: dynamic(() => import("@/modules/people/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    vehicle: dynamic(() => import("@/modules/vehicle/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    maintenance: dynamic(() => import("@/modules/maintenance/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    health: dynamic(() => import("@/modules/health/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    whiteboard: dynamic(() => import("@/modules/whiteboard/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
    slides: dynamic(() => import("@/modules/slides/Widget"), { ssr: false, loading: () => <WidgetSkeleton /> }),
};

interface ModuleVisibility {
    enabled: boolean;
    isPublic: boolean;
}

export default function AdminDashboard() {
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [widgetRegistry, setWidgetRegistry] = useState<Record<string, boolean>>({});
    const [isSettingsMode, setIsSettingsMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/system")
            .then((r) => r.json())
            .then((d) => {
                const registry: Record<string, ModuleVisibility> = d.data?.moduleRegistry || {};
                const widgets: Record<string, boolean> = d.data?.widgetRegistry || {};
                const order: string[] = d.data?.moduleOrder || [];
                const strategy: string = d.data?.orderingStrategy || "custom";
                const pageVisits: Record<string, number> = d.data?.pageVisits || {};

                setWidgetRegistry(widgets);

                const enabled = Object.keys(moduleRegistry).filter((key) => {
                    const vis = registry[key];
                    return vis ? vis.enabled : true;
                });

                // Sort by strategy
                if (strategy === "name") {
                    enabled.sort((a, b) => {
                        const nameA = moduleRegistry[a]?.name || "";
                        const nameB = moduleRegistry[b]?.name || "";
                        return nameA.localeCompare(nameB);
                    });
                } else if (strategy === "visits") {
                    enabled.sort((a, b) => {
                        const va = pageVisits[a] || 0;
                        const vb = pageVisits[b] || 0;
                        return vb - va;
                    });
                } else if (order.length > 0) {
                    enabled.sort((a, b) => {
                        const ia = order.indexOf(a);
                        const ib = order.indexOf(b);
                        if (ia === -1 && ib === -1) return 0;
                        if (ia === -1) return 1;
                        if (ib === -1) return -1;
                        return ia - ib;
                    });
                }

                setEnabledModules(enabled);
            })
            .catch(() => {
                setEnabledModules(Object.keys(moduleRegistry));
            })
            .finally(() => setLoaded(true));
    }, []);

    const saveWidgetSettings = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/system", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ widgetRegistry }),
            });
            setIsSettingsMode(false);
        } catch (error) {
            console.error("Failed to save widget settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleWidget = (key: string) => {
        setWidgetRegistry((prev) => ({
            ...prev,
            [key]: prev[key] === false ? true : false,
        }));
    };

    const visibleWidgets = enabledModules.filter((key) => widgetRegistry[key] !== false);

    return (
        <div className="animate-fade-in-up">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-2">Command Center</h1>
                    <p className="text-zinc-400">Welcome back. Here is your Life OS overview.</p>
                </div>
                <div className="flex items-center gap-2">
                    {isSettingsMode ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSettingsMode(false)}
                                className="h-9 px-4 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            >
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={saveWidgetSettings}
                                disabled={isSaving}
                                className="h-9 px-4 bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                            >
                                {isSaving ? "Saving..." : <><Check className="w-4 h-4 mr-2" /> Save Layout</>}
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSettingsMode(true)}
                            className="h-9 px-4 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all"
                        >
                            <Settings2 className="w-4 h-4 mr-2" /> Customize Dashboard
                        </Button>
                    )}
                </div>
            </header>

            {!loaded ? (
                <DashboardSkeleton />
            ) : isSettingsMode ? (
                <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-start gap-4">
                        <div className="p-2 bg-accent/10 rounded-lg">
                            <LayoutGrid className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Layout Configuration</p>
                            <p className="text-xs text-zinc-500 mt-1">Enable or disable widgets to personalize your dashboard flow.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enabledModules.map((key) => {
                            const config = moduleRegistry[key];
                            const isEnabled = widgetRegistry[key] !== false;
                            return (
                                <div
                                    key={key}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group",
                                        isEnabled
                                            ? "bg-zinc-900 border-zinc-700 shadow-xl shadow-accent/5"
                                            : "bg-zinc-950/50 border-zinc-800 opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
                                            isEnabled ? "bg-accent/10 border-accent/20 text-accent" : "bg-zinc-900 border-zinc-800 text-zinc-600"
                                        )}>
                                            <LayoutGrid className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-200 uppercase tracking-[0.1em]">{config.name}</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Widget Protocol</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={() => toggleWidget(key)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleWidgets.map((key) => {
                        const Widget = widgetImports[key];
                        if (!Widget) return null;
                        return <Widget key={key} />;
                    })}
                </div>
            )}
        </div>
    );
}
