"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Palette, LayoutDashboard, FileText, DollarSign, User, Settings, Calculator, Wheat, CreditCard, BookOpen, Library, Lightbulb, Code, Target, BarChart3, CloudRain, CheckSquare, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderedAdminModules, type SystemConfig } from "@/lib/admin-modules";

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
}

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    User, FileText, DollarSign, LayoutDashboard, Settings, Palette, Calculator, Wheat, CreditCard, BookOpen, Library, Lightbulb, Code, Target, BarChart3, CloudRain, CheckSquare, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation
};

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/system")
            .then((r) => r.json())
            .then((d) => setConfig((d.data || null) as SystemConfig | null))
            .catch(() => { });
    }, []);

    const commands: CommandItem[] = [
        { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: () => router.push("/admin") },
        ...getOrderedAdminModules(config)
            .map((module) => ({
                id: `nav-${module.key}`,
                label: `Go to ${module.name}`,
                description: module.description,
                icon: IconMap[module.icon] || User,
                action: () => router.push(module.href),
            })),
        { id: "nav-settings", label: "Go to Settings", icon: Settings, action: () => router.push("/admin/settings") },
        { id: "action-theme", label: "Change Theme", description: "Open theme gallery", icon: Palette, action: () => router.push("/admin/settings") },
    ];

    const filtered = query
        ? commands.filter((cmd) =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.description?.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    // Cmd+K global shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((prev) => {
                    const next = !prev;
                    if (next) {
                        setQuery("");
                        setSelectedIndex(0);
                    }
                    return next;
                });
            }
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filtered.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === "Enter" && filtered[selectedIndex]) {
                e.preventDefault();
                filtered[selectedIndex].action();
                setOpen(false);
            }
        },
        [filtered, selectedIndex]
    );

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15 }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101]"
                    >
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Search input */}
                            <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
                                <Search className="w-5 h-5 text-zinc-500 shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Type a command or search..."
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 bg-transparent py-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                                />
                                <kbd className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">
                                    ESC
                                </kbd>
                            </div>

                            {/* Results */}
                            <div className="max-h-[320px] overflow-y-auto p-2">
                                {filtered.length === 0 && (
                                    <div className="py-8 text-center text-zinc-500 text-sm">No results found</div>
                                )}
                                {filtered.map((cmd, i) => {
                                    const Icon = cmd.icon;
                                    return (
                                        <button
                                            key={cmd.id}
                                            onClick={() => { cmd.action(); setOpen(false); }}
                                            onMouseEnter={() => setSelectedIndex(i)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                                i === selectedIndex
                                                    ? "bg-accent/15 text-accent"
                                                    : "text-zinc-400 hover:bg-zinc-800"
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{cmd.label}</p>
                                                {cmd.description && (
                                                    <p className="text-xs text-zinc-500 truncate">{cmd.description}</p>
                                                )}
                                            </div>
                                            {i === selectedIndex && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center gap-4 text-[11px] text-zinc-500">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">↑↓</kbd> Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">↵</kbd> Select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">esc</kbd> Close
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
