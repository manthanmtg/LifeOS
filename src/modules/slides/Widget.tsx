"use client";

import { useMemo, useState, useEffect } from "react";
import { Presentation, Layers, Globe } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import type { DeckItem } from "./types";

export default function SlidesWidget() {
    const [items, setItems] = useState<DeckItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=deck")
            .then((res) => res.json())
            .then((data) => setItems(data.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const publicDecks = items.filter((i) => i.payload.visibility === "public").length;
        const latest = items.length > 0
            ? [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            : null;

        return {
            total: items.length,
            publicDecks,
            latest,
        };
    }, [items]);

    return (
        <WidgetCard
            title="Slides"
            icon={Presentation}
            loading={loading}
            href="/admin/slides"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-blue-400/80">
                        <Layers className="w-3 h-3" /> {summary.total} Decks
                    </span>
                    <span className="flex items-center gap-1.5 text-green-400/80">
                        <Globe className="w-3 h-3" /> {summary.publicDecks} Public
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">decks uploaded</p>
                </div>

                {summary.latest ? (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-2">Latest Deck</p>
                        <div className="flex items-center gap-2">
                            <Presentation className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">
                                {summary.latest.payload.title}
                            </p>
                        </div>
                        {summary.latest.payload.format && (
                            <p className="text-[10px] text-zinc-500 mt-1 pl-5">
                                {summary.latest.payload.format.toUpperCase()}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
                        <p className="text-[11px] text-zinc-500 text-center font-medium">No decks yet.</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
