"use client";

import { useMemo, useState, useEffect } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Idea {
    payload: {
        title: string;
        status: string;
        priority: string;
        promoted_to_portfolio?: boolean;
    };
}

export default function IdeasWidget() {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=idea")
            .then((response) => response.json())
            .then((data) => setIdeas(data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => {
        const total = ideas.length;
        const promoted = ideas.filter((idea) => idea.payload.promoted_to_portfolio).length;
        const exploring = ideas.filter((idea) => idea.payload.status === "exploring").length;
        return { total, promoted, exploring };
    }, [ideas]);

    const topIdea = useMemo(() => {
        const highPriority = ideas.filter((idea) => idea.payload.priority === "high" && idea.payload.status !== "archived");
        const exploring = ideas.filter((idea) => idea.payload.status === "exploring");
        const raw = ideas.filter((idea) => idea.payload.status === "raw");
        return highPriority[0] || exploring[0] || raw[0];
    }, [ideas]);

    return (
        <WidgetCard
            title="Nexus"
            icon={Lightbulb}
            loading={loading}
            href="/admin/ideas"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="flex items-center gap-1.5 text-green-400">
                        <Sparkles className="w-3 h-3" /> {stats.promoted} Promoted
                    </span>
                    <span>{stats.exploring} Exploring</span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{stats.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">captured concepts</p>
                </div>

                {topIdea && (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1.5">Top Focus</p>
                        <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">{topIdea.payload.title}</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
