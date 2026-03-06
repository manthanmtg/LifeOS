"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { moduleRegistry } from "@/registry";
import { LayoutDashboard, Settings, User, FileText, DollarSign, LogOut, CreditCard, Menu, X, BookOpen, Library, Lightbulb, Code, Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, ExternalLink, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LinkItem {
    href: string;
    name: string;
    icon: LucideIcon;
}

function renderNavLinks(links: LinkItem[], pathname: string, setMobileOpen: (v: boolean) => void) {
    return (
        <>
            {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors min-h-[44px]",
                            isActive
                                ? "bg-zinc-800/50 text-zinc-50 font-medium"
                                : "hover:bg-zinc-900 hover:text-zinc-300"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {link.name}
                    </Link>
                );
            })}
        </>
    );
}

const IconMap: Record<string, LucideIcon> = {
    User, FileText, DollarSign, LayoutDashboard, Settings, CreditCard, BookOpen, Library, Lightbulb, Code, Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse
};

interface ModuleVisibility {
    enabled: boolean;
    isPublic: boolean;
}

interface SystemConfig {
    site_title?: string;
    moduleOrder?: string[];
    moduleRegistry?: Record<string, ModuleVisibility>;
    orderingStrategy?: "custom" | "name" | "visits";
    pageVisits?: Record<string, number>;
}

export default function AdminSidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [moduleOrder, setModuleOrder] = useState<string[]>([]);
    const [disabledModules, setDisabledModules] = useState<Set<string>>(new Set());
    const [siteTitle, setSiteTitle] = useState("Life OS");
    const [config, setConfig] = useState<SystemConfig | null>(null);

    useEffect(() => {
        async function loadConfig() {
            try {
                const r = await fetch("/api/system");
                const d = await r.json();
                const config = d.data as SystemConfig | undefined;
                if (config?.moduleOrder) {
                    setModuleOrder(config.moduleOrder);
                }
                if (config?.moduleRegistry) {
                    const disabled = new Set<string>();
                    for (const [key, vis] of Object.entries(config.moduleRegistry)) {
                        if (!vis.enabled) disabled.add(key);
                    }
                    setDisabledModules(disabled);
                }
                if (config?.site_title) {
                    setSiteTitle(config.site_title);
                }
                setConfig(config || null);
            } catch {
                // silently fail
            }
        }
        loadConfig();
    }, []);

    const unsortedModules = Object.entries(moduleRegistry)
        .filter(([key]) => !disabledModules.has(key))
        .map(([key, config]) => ({
            key,
            href: `/admin/${key}`,
            name: config.name,
            icon: IconMap[config.icon] || User
        }));

    const sortedModules = [...unsortedModules].sort((a, b) => {
        const strategy = config?.orderingStrategy || "custom";

        if (strategy === "name") {
            return a.name.localeCompare(b.name);
        }

        if (strategy === "visits") {
            const va = config?.pageVisits?.[a.key] || 0;
            const vb = config?.pageVisits?.[b.key] || 0;
            return vb - va;
        }

        // Default to custom order
        if (moduleOrder.length === 0) return 0;
        const ia = moduleOrder.indexOf(a.key);
        const ib = moduleOrder.indexOf(b.key);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    const links = [
        { href: "/admin", name: "Dashboard", icon: LayoutDashboard },
        ...sortedModules,
        { href: "/admin/settings", name: "System Settings", icon: Settings }
    ];

    return (
        <>
            {/* Mobile hamburger trigger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile drawer overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-[280px] bg-zinc-950 border-r border-zinc-800 flex flex-col text-sm text-zinc-400 z-50"
                        >
                            <div className="flex items-center justify-between p-6">
                                <div>
                                    <h2 className="text-zinc-50 font-semibold tracking-tight text-lg">{siteTitle}</h2>
                                    <p className="text-xs text-zinc-500 mt-1">Admin Command Center</p>
                                </div>
                                <button onClick={() => setMobileOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 px-4 space-y-1 overflow-y-auto">
                                {renderNavLinks(links, pathname, setMobileOpen)}
                            </div>
                            <div className="p-4 border-t border-zinc-800 space-y-1">
                                <Link
                                    href="/"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 transition-colors min-h-[44px]"
                                >
                                    <ExternalLink className="w-4 h-4" /> Public View
                                </Link>
                                <button
                                    onClick={async () => {
                                        await fetch("/api/auth/logout", { method: "POST" });
                                        window.location.href = "/";
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 transition-colors min-h-[44px]"
                                >
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex h-full w-64 bg-zinc-950 border-r border-zinc-800 flex-col text-sm text-zinc-400 shrink-0">
                <div className="p-6">
                    <h2 className="text-zinc-50 font-semibold tracking-tight text-lg">{siteTitle}</h2>
                    <p className="text-xs text-zinc-500 mt-1">Admin Command Center</p>
                </div>
                <div className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {renderNavLinks(links, pathname, setMobileOpen)}
                </div>
                <div className="p-4 border-t border-zinc-800 mt-auto space-y-1">
                    <Link
                        href="/"
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> Public View
                    </Link>
                    <button
                        onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            window.location.href = "/";
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </div>
        </>
    );
}
