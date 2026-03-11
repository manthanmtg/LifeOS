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

export default function GlobalModuleSearch() {
    const pathname = usePathname();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    return (
        <section className="mb-8">
            <div className="relative">
                <div className={cn(
                    "rounded-2xl border bg-zinc-950/60 backdrop-blur-sm transition-colors",
                    showResults ? "border-zinc-700 shadow-2xl shadow-black/20" : "border-zinc-800"
                )}>
                    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
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
                            placeholder="Search modules by name, description, or tag"
                            aria-label="Search modules"
                            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none sm:text-[15px]"
                        />
                        {query.length > 0 && (
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setQuery("");
                                    inputRef.current?.focus();
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-900 px-4 py-3 text-xs text-zinc-500 sm:px-5">
                        <span className="uppercase tracking-[0.22em] text-zinc-600">Global module search</span>
                        <span className="hidden sm:inline">Real-time fuzzy filtering across {modules.length} modules</span>
                    </div>
                </div>

                {showResults && (
                    <div className="absolute inset-x-0 top-full z-30 mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/98 p-2 shadow-2xl shadow-black/30">
                        {results.length > 0 ? (
                            <div className="space-y-1">
                                {results.map((result, index) => {
                                    const Icon = IconMap[result.item.icon] || User;
                                    const isActive = pathname === result.item.href;

                                    return (
                                        <Link
                                                key={result.item.key}
                                                href={result.item.href}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            className={cn(
                                                "flex items-start gap-3 rounded-xl px-3 py-3 transition-colors sm:items-center",
                                                index === activeIndex ? "bg-zinc-900 text-zinc-100" : "text-zinc-300 hover:bg-zinc-900/70",
                                                isActive && "ring-1 ring-accent/30"
                                            )}
                                        >
                                            <div className="mt-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-2 sm:mt-0">
                                                <Icon className="h-4 w-4 text-zinc-300" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-medium text-zinc-100">
                                                        <HighlightedText value={result.item.name} matches={result.nameMatches} />
                                                    </p>
                                                    {isActive && (
                                                        <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
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
                                            </div>
                                            <ArrowRight className={cn(
                                                "mt-1 h-4 w-4 shrink-0 text-zinc-600 transition-transform sm:mt-0",
                                                index === activeIndex && "translate-x-0.5 text-zinc-300"
                                            )} />
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
                                <p className="text-sm font-medium text-zinc-200">No matching modules</p>
                                <p className="mt-1 text-xs text-zinc-500">Try a module name, a short description phrase, or tags like finance, tasks, or writing.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
