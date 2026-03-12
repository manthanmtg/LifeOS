"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, ArrowRight, User, FileText, DollarSign, LayoutDashboard, Settings, CreditCard, BookOpen, Library, Lightbulb, Code, Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrderedAdminModules, type SystemConfig } from "@/lib/admin-modules";
import { getModuleSearchResults, highlightText, type MatchRange } from "@/lib/module-search";

const IconMap: Record<string, LucideIcon> = {
    User, FileText, DollarSign, LayoutDashboard, Settings, CreditCard, BookOpen, Library, Lightbulb, Code, Target, BarChart3, Calculator, Wheat, CloudRain, CheckSquare, Bot, Users, Car, Wrench, Home, Map, ShoppingBag, HeartPulse, PenLine, Tv, Presentation
};

function HighlightedText({ value, matches }: { value: string; matches: MatchRange[] }) {
    const parts = highlightText(value, matches);

    return (
        <>
            {parts.map((part, index) => (
                <span
                    key={`${part.text}-${index}`}
                    className={part.highlighted ? "bg-accent/20 text-accent rounded-sm" : undefined}
                >
                    {part.text}
                </span>
            ))}
        </>
    );
}

export default function GlobalModuleSearch({ variant = "default" }: { variant?: "default" | "sidebar" }) {
    const pathname = usePathname();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [prevPathname, setPrevPathname] = useState(pathname);

    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        setQuery("");
        setFocused(false);
    }

    useEffect(() => {
        fetch("/api/system")
            .then((response) => response.json())
            .then((data) => setConfig((data.data || null) as SystemConfig | null))
            .catch(() => setConfig(null));
    }, []);

    const modules = getOrderedAdminModules(config);
    const hasQuery = query.trim().length > 0;
    const results = getModuleSearchResults(modules, query).slice(0, hasQuery ? 8 : 6);
    const showResults = focused || hasQuery;
    const activeIndex = results.length === 0 ? 0 : Math.min(selectedIndex, results.length - 1);
    const selectedResult = results[activeIndex];

    const isSidebar = variant === "sidebar";

    return (
        <section className={cn(isSidebar ? "px-4 mb-4" : "mb-8")}>
            <div className="relative">
                <div className={cn(
                    "rounded-xl border bg-zinc-950/40 backdrop-blur-md transition-all duration-200",
                    showResults ? "border-zinc-700 shadow-2xl shadow-black/40 ring-1 ring-zinc-700/50" : "border-zinc-800/50",
                    isSidebar ? "rounded-lg" : "rounded-2xl"
                )}>
                    <div className={cn(
                        "flex items-center gap-2.5",
                        isSidebar ? "px-2.5 py-1.5" : "px-4 py-3 sm:px-5"
                    )}>
                        <Search className={cn("shrink-0 text-zinc-500", isSidebar ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onFocus={() => setFocused(true)}
                            onBlur={() => {
                                window.setTimeout(() => setFocused(false), 120);
                            }}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "ArrowDown" && results.length > 0) {
                                    event.preventDefault();
                                    setSelectedIndex((current) => (current + 1) % results.length);
                                }

                                if (event.key === "ArrowUp" && results.length > 0) {
                                    event.preventDefault();
                                    setSelectedIndex((current) => (current - 1 + results.length) % results.length);
                                }

                                if (event.key === "Enter" && selectedResult) {
                                    event.preventDefault();
                                    router.push(selectedResult.item.href);
                                }
                            }}
                            placeholder={isSidebar ? "Search..." : "Search modules by name, description, or tag"}
                            aria-label="Search modules"
                            className={cn(
                                "min-w-0 flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 outline-none transition-all",
                                isSidebar ? "text-[13px]" : "text-sm sm:text-[15px]"
                            )}
                        />
                        {query.length > 0 && (
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setQuery("");
                                    inputRef.current?.focus();
                                }}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200",
                                    isSidebar ? "h-5 w-5" : "h-8 w-8"
                                )}
                                aria-label="Clear search"
                            >
                                <X className={cn(isSidebar ? "h-2.5 w-2.5" : "h-4 w-4")} />
                            </button>
                        )}
                    </div>
                    {!isSidebar && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-900 px-4 py-3 text-xs text-zinc-500 sm:px-5">
                            <span className="uppercase tracking-[0.22em] text-zinc-600">Global module search</span>
                            <span className="hidden sm:inline">Real-time fuzzy filtering across {modules.length} modules</span>
                        </div>
                    )}
                </div>

                {showResults && (
                    <div className={cn(
                        "absolute top-full z-[100] mt-2 rounded-xl border border-zinc-800/80 bg-zinc-950/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150",
                        isSidebar ? "left-0 min-w-[240px] w-full" : "inset-x-0"
                    )}>
                        {results.length > 0 ? (
                            <div className="space-y-0.5">
                                {results.map((result, index) => {
                                    const Icon = IconMap[result.item.icon] || User;
                                    const isActive = pathname === result.item.href;

                                    return (
                                        <Link
                                                key={result.item.key}
                                                href={result.item.href}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-all duration-100",
                                                index === activeIndex ? "bg-zinc-800/60 text-zinc-100 ring-1 ring-zinc-700/50" : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-300",
                                                isActive && !isSidebar && "ring-1 ring-accent/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center rounded-md border transition-colors",
                                                index === activeIndex ? "border-zinc-700 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-900/50 text-zinc-500",
                                                isSidebar ? "p-1.5" : "p-2"
                                            )}>
                                                <Icon className={cn(isSidebar ? "h-3.5 w-3.5" : "h-4 w-4")} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={cn("truncate font-medium", isSidebar ? "text-[13px]" : "text-sm text-zinc-100")}>
                                                        <HighlightedText value={result.item.name} matches={result.nameMatches} />
                                                    </p>
                                                    {isActive && !isSidebar && (
                                                        <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                                                            Current
                                                        </span>
                                                    )}
                                                    {index === activeIndex && isSidebar && (
                                                        <ArrowRight className="h-3 w-3 text-zinc-500" />
                                                    )}
                                                </div>
                                                {!isSidebar && (
                                                    <>
                                                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                                            <HighlightedText value={result.item.description} matches={result.descriptionMatches} />
                                                        </p>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {(result.matchedTags.length > 0 ? result.matchedTags : result.item.tags.slice(0, 3).map((tag) => ({ tag, matches: [] }))).map((tag) => (
                                                                <span
                                                                    key={tag.tag}
                                                                    className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                                                                >
                                                                    <HighlightedText value={tag.tag} matches={tag.matches} />
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {!isSidebar && (
                                                <ArrowRight className={cn(
                                                    "h-4 w-4 shrink-0 text-zinc-600 transition-transform",
                                                    index === activeIndex && "translate-x-0.5 text-zinc-300"
                                                )} />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-800/50 px-4 py-6 text-center">
                                <p className="text-xs font-medium text-zinc-400">No results</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
