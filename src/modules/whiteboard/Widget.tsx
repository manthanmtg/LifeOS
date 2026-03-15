"use client";

import { useMemo, useState, useEffect } from "react";
import { PenLine, Shapes, Star, Globe } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface WhiteboardDoc {
    is_public: boolean;
    payload: {
        name: string;
        elements: Record<string, unknown>[];
        is_favorite: boolean;
        tags: string[];
    };
    updated_at: string;
}

export default function WhiteboardWidget() {
    const [boards, setBoards] = useState<WhiteboardDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=whiteboard_note")
            .then((r) => r.json())
            .then((d) => setBoards(d.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => {
        const total = boards.length;
        const totalElements = boards.reduce((sum, b) => sum + (b.payload.elements?.length || 0), 0);
        const favorites = boards.filter((b) => b.payload.is_favorite).length;
        const publicCount = boards.filter((b) => b.is_public).length;
        return { total, totalElements, favorites, publicCount };
    }, [boards]);

    const latestBoard = useMemo(() => {
        if (boards.length === 0) return null;
        const favs = boards.filter((b) => b.payload.is_favorite);
        if (favs.length > 0) return [...favs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
        return [...boards].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
    }, [boards]);

    return (
        <WidgetCard
            title="Whiteboard"
            icon={PenLine}
            loading={loading}
            href="/admin/whiteboard"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <div className="flex items-center gap-3">
                        {stats.favorites > 0 && (
                            <span className="flex items-center gap-1 text-warning">
                                <Star className="w-3 h-3" fill="currentColor" /> {stats.favorites}
                            </span>
                        )}
                        {stats.publicCount > 0 && (
                            <span className="flex items-center gap-1 text-success">
                                <Globe className="w-3 h-3" /> {stats.publicCount}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Shapes className="w-3 h-3" /> {stats.totalElements}
                        </span>
                    </div>
                    <span>{stats.total} Canvas{stats.total !== 1 ? "es" : ""}</span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{stats.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">whiteboards</p>
                </div>

                {latestBoard && (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            {latestBoard.payload.is_favorite && <Star className="w-3 h-3 text-warning" fill="currentColor" />}
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                                {latestBoard.payload.is_favorite ? "Favorite" : "Last Edited"}
                            </p>
                        </div>
                        <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">
                            {latestBoard.payload.name}
                        </p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
