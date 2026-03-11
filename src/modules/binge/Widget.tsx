"use client";

import { useMemo, useState, useEffect } from "react";
import { Tv, Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import type { BingeItem } from "./types";

export default function BingeWidget() {
    const [items, setItems] = useState<BingeItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=binge_item")
            .then((res) => res.json())
            .then((data) => setItems(data.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const watching = items.filter((i) => i.payload.status === "watching");
        const rated = items.filter((i) => !!i.payload.rating);
        const avgRating =
            rated.length > 0
                ? rated.reduce((sum, i) => sum + (i.payload.rating || 0), 0) / rated.length
                : 0;

        const latest = watching[watching.length - 1] ?? null;

        return {
            total: items.length,
            watchingCount: watching.length,
            avgRating: Number.isFinite(avgRating) ? avgRating : 0,
            latest,
        };
    }, [items]);

    return (
        <WidgetCard
            title="Binge"
            icon={Tv}
            loading={loading}
            href="/admin/binge"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-yellow-400/80">
                        <Play className="w-3 h-3" fill="currentColor" /> {summary.watchingCount} Watching
                    </span>
                    <span className={cn("inline-flex items-center gap-1", summary.avgRating > 0 ? "text-yellow-500/80" : "text-zinc-500")}>
                        <Star className="w-3 h-3" fill={summary.avgRating > 0 ? "currentColor" : "none"} />
                        {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "N/A"}
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">titles tracked</p>
                </div>

                {summary.latest ? (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-2">Now Watching</p>
                        <div className="flex items-center gap-2">
                            <Tv className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">
                                {summary.latest.payload.title}
                            </p>
                        </div>
                        {(summary.latest.payload.type === "series" || summary.latest.payload.type === "anime") &&
                            summary.latest.payload.current_season && (
                                <p className="text-[10px] text-zinc-500 mt-1 pl-5">
                                    S{summary.latest.payload.current_season}
                                    {summary.latest.payload.current_episode
                                        ? ` · E${summary.latest.payload.current_episode}`
                                        : ""}
                                </p>
                            )}
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
                        <p className="text-[11px] text-zinc-500 text-center font-medium">Nothing queued up.</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
