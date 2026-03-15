"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleRegistry } from "@/registry";
import { cn } from "@/lib/utils";
import {
    User, FileText, DollarSign, CreditCard, BookOpen, Library, Lightbulb, Code,
    Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, Bot, Users,
    Car, Wrench, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation,
    Sparkles, Menu, type LucideIcon
} from "lucide-react";

const IconMap: Record<string, LucideIcon> = {
    User, FileText, DollarSign, CreditCard, BookOpen, Library, Lightbulb, Code,
    Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, Bot, Users,
    Car, Wrench, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation
};

interface SystemConfig {
    pageVisits?: Record<string, number>;
    moduleRegistry?: Record<string, { enabled: boolean; isPublic: boolean }>;
}

export default function AdminHeader() {
    const pathname = usePathname();
    const [topModules, setTopModules] = useState<Array<{ slug: string; name: string; icon: LucideIcon; visits: number }>>([]);

    useEffect(() => {
        async function loadTopModules() {
            try {
                const r = await fetch("/api/system");
                const d = await r.json();
                const cfg = d.data as SystemConfig | undefined;
                
                const visits = cfg?.pageVisits || {};
                const moduleSettings = cfg?.moduleRegistry || {};
                
                const modules = Object.entries(moduleRegistry)
                    .filter(([slug]) => {
                        const settings = moduleSettings[slug];
                        return !settings || settings.enabled !== false;
                    })
                    .map(([slug, mod]) => ({
                        slug,
                        name: mod.name,
                        icon: IconMap[mod.icon] || User,
                        visits: visits[slug] || 0
                    }))
                    .sort((a, b) => b.visits - a.visits)
                    .slice(0, 8);
                
                setTopModules(modules);
            } catch {
                const modules = Object.entries(moduleRegistry)
                    .slice(0, 8)
                    .map(([slug, mod]) => ({
                        slug,
                        name: mod.name,
                        icon: IconMap[mod.icon] || User,
                        visits: 0
                    }));
                setTopModules(modules);
            }
        }
        loadTopModules();
    }, []);

    const currentModule = pathname.split("/")[2] || "";

    return (
        <>
            {/* Mobile: Unified top bar — hamburger + quick-access icons */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
                <div className="flex items-center h-12">
                    {/* Hamburger */}
                    <button
                        onClick={() => window.dispatchEvent(new Event("open-mobile-sidebar"))}
                        className="flex items-center justify-center w-12 h-12 text-zinc-400 hover:text-zinc-200 active:bg-zinc-800/60 transition-colors shrink-0"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-5 bg-zinc-800 shrink-0" />

                    {/* Quick Access Icons */}
                    <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar px-2 flex-1">
                        {topModules.map((mod) => {
                            const Icon = mod.icon;
                            const isActive = currentModule === mod.slug;
                            return (
                                <Link
                                    key={mod.slug}
                                    href={`/admin/${mod.slug}`}
                                    className={cn(
                                        "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 shrink-0",
                                        isActive
                                            ? "bg-accent/15 text-accent"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {isActive && (
                                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Desktop: Standard header */}
            <header className="hidden lg:block pb-6 mb-6 border-b border-zinc-800/50">
                <div className="flex items-center justify-between gap-4">
                    {/* Quick Access Modules */}
                    <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
                        {topModules.map((mod) => {
                            const Icon = mod.icon;
                            const isActive = currentModule === mod.slug;
                            return (
                                <Link
                                    key={mod.slug}
                                    href={`/admin/${mod.slug}`}
                                    className={cn(
                                        "group relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 shrink-0",
                                        isActive
                                            ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
                                            : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-4 h-4 transition-transform duration-200",
                                        !isActive && "group-hover:scale-110"
                                    )} />
                                    <span className={cn(
                                        "text-xs font-medium transition-colors",
                                        isActive ? "text-accent" : "text-zinc-400 group-hover:text-zinc-200"
                                    )}>
                                        {mod.name}
                                    </span>
                                    {isActive && (
                                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Command Palette Hint */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <Sparkles className="w-3 h-3" />
                            <span>Quick access</span>
                        </div>
                        <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-900/80 border border-zinc-800 rounded-lg font-mono">
                            ⌘K
                        </kbd>
                    </div>
                </div>
            </header>
        </>
    );
}
