"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { moduleRegistry } from "@/registry";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleVisibility {
    enabled: boolean;
    isPublic: boolean;
}

interface Props {
    initialUserName?: string;
}

export default function PublicHeader({ initialUserName = "Life OS" }: Props) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [publicModules, setPublicModules] = useState<{ slug: string; name: string }[]>([]);
    const [userName, setUserName] = useState(initialUserName);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

    useEffect(() => {
        // Fetch portfolio for branding
        fetch("/api/content?module_type=portfolio_profile", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (d.data?.length > 0 && d.data[0]?.payload?.full_name) {
                    setUserName(d.data[0].payload.full_name);
                }
            })
            .catch((err) => console.error("Header branding fetch failed:", err));

        // Fetch system config to get module visibility
        fetch("/api/system", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                const registry: Record<string, ModuleVisibility> = data.data?.moduleRegistry || {};
                const moduleOrder: string[] = data.data?.moduleOrder || [];
                const visible = Object.entries(moduleRegistry)
                    .filter(([key]) => {
                        const vis = registry[key];
                        // Show if explicitly isPublic, or if defaultPublic and no override
                        return vis ? vis.isPublic && vis.enabled : moduleRegistry[key].defaultPublic;
                    })
                    .sort(([a], [b]) => {
                        if (moduleOrder.length === 0) return 0;
                        const ia = moduleOrder.indexOf(a);
                        const ib = moduleOrder.indexOf(b);
                        if (ia === -1 && ib === -1) return 0;
                        if (ia === -1) return 1;
                        if (ib === -1) return -1;
                        return ia - ib;
                    })
                    .map(([key, config]) => ({ slug: key, name: config.name }));
                setPublicModules(visible);
            })
            .catch((err) => {
                console.error("Header system config fetch failed:", err);
                // Fallback: show modules with defaultPublic
                const visible = Object.entries(moduleRegistry)
                    .filter(([, c]) => c.defaultPublic)
                    .map(([key, c]) => ({ slug: key, name: c.name }));
                setPublicModules(visible);
            });
    }, []);

    const navLinks = publicModules
        .filter(m => m.slug !== "portfolio")
        .map((m) => ({ href: `/${m.slug}`, label: m.name }));

    if (!mounted) {
        return <div className="h-[69px]" />; // Height of the header to prevent layout shift
    }

    return (
        <header className="border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl" suppressHydrationWarning>
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="text-xl font-semibold tracking-tight hover:text-accent transition-colors">
                    {userName}
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
                            {link.label}
                        </Link>
                    ))}
                    <Link href="/admin/login" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors font-medium">
                        Admin
                    </Link>
                </nav>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-1 text-zinc-400">
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden overflow-hidden border-t border-zinc-800"
                    >
                        <nav className="px-6 py-4 space-y-1">
                            {navLinks.map((link) => (
                                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                                    className="block px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 min-h-[44px] flex items-center">
                                    {link.label}
                                </Link>
                            ))}
                            <Link href="/admin/login" onClick={() => setMobileOpen(false)}
                                className="block px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 font-medium min-h-[44px] flex items-center">
                                Admin
                            </Link>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
