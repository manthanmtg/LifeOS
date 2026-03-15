"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getOrderedAdminModules, type SystemConfig } from "@/lib/admin-modules";
import { LayoutDashboard, Settings, User, FileText, DollarSign, LogOut, CreditCard, X, BookOpen, Library, Lightbulb, Code, Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, ExternalLink, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import GlobalModuleSearch from "@/components/shell/GlobalModuleSearch";


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
    User, FileText, DollarSign, LayoutDashboard, Settings, CreditCard, BookOpen, Library, Lightbulb, Code, Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation
};

export default function AdminSidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [siteTitle, setSiteTitle] = useState("Life OS");
    const [config, setConfig] = useState<SystemConfig | null>(null);

    useEffect(() => {
        async function loadConfig() {
            try {
                const r = await fetch("/api/system");
                const d = await r.json();
                const cfg = d.data as SystemConfig | undefined;
                if (cfg?.site_title) {
                    setSiteTitle(cfg.site_title);
                }
                setConfig(cfg || null);
            } catch {
                // silently fail
            }
        }
        loadConfig();
    }, []);

    useEffect(() => {
        if (!config?.site_icon) return;
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (link) link.href = config.site_icon;
        const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
        if (apple) apple.href = config.site_icon;
    }, [config?.site_icon]);

    const sortedModules = getOrderedAdminModules(config).map((module) => ({
        href: module.href,
        name: module.name,
        icon: IconMap[module.icon] || User
    }));

    const links = [
        { href: "/admin", name: "Dashboard", icon: LayoutDashboard },
        ...sortedModules,
        { href: "/admin/settings", name: "System Settings", icon: Settings }
    ];

    useEffect(() => {
        const handler = () => setMobileOpen(true);
        window.addEventListener("open-mobile-sidebar", handler);
        return () => window.removeEventListener("open-mobile-sidebar", handler);
    }, []);

    return (
        <>
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
                                <div className="flex items-center gap-3 min-w-0">
                                    {config?.site_icon ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={config.site_icon} alt="" className="w-8 h-8 rounded-lg object-contain shrink-0" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                                            <LayoutDashboard className="w-4 h-4 text-accent" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h2 className="text-zinc-50 font-semibold tracking-tight text-lg leading-tight truncate">{siteTitle}</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">Admin Command Center</p>
                                    </div>
                                </div>
                                <button onClick={() => setMobileOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-300 shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="px-4 space-y-1 pb-2">
                                {renderNavLinks(links.slice(0, 1), pathname, setMobileOpen)}
                                <GlobalModuleSearch variant="sidebar" />
                            </div>
                            <div className="flex-1 px-4 space-y-1 overflow-y-auto min-h-0">
                                {renderNavLinks(links.slice(1), pathname, setMobileOpen)}
                            </div>
                            <div className="p-4 border-t border-zinc-800 space-y-1">
                                <Link
                                    href="/?public=1"
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
                    <div className="flex items-center gap-3 min-w-0">
                        {config?.site_icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={config.site_icon} alt="" className="w-8 h-8 rounded-lg object-contain shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                                <LayoutDashboard className="w-4 h-4 text-accent" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-zinc-50 font-semibold tracking-tight text-lg leading-tight truncate">{siteTitle}</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Admin Command Center</p>
                        </div>
                    </div>
                </div>
                <div className="px-4 space-y-1 pb-2">
                    {renderNavLinks(links.slice(0, 1), pathname, setMobileOpen)}
                    <GlobalModuleSearch variant="sidebar" />
                </div>
                <div className="flex-1 px-4 space-y-1 overflow-y-auto min-h-0">
                    {renderNavLinks(links.slice(1), pathname, setMobileOpen)}
                </div>
                <div className="p-4 border-t border-zinc-800 mt-auto space-y-1">
                    <Link
                        href="/?public=1"
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
