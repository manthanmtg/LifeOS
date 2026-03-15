"use client";

import { useMemo, useState, useEffect } from "react";
import { Files, ArrowUpCircle, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Item {
    payload: {
        title: string;
        is_read: boolean;
        priority: string;
        type: string;
    };
}

export default function ReadingWidget() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=reading_item")
            .then((response) => response.json())
            .then((data) => setItems(data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const unread = items.filter((item) => !item.payload.is_read);
        const read = items.filter((item) => item.payload.is_read);
        const highPriority = unread.filter((item) => item.payload.priority === "high");
        const types = new Set(items.map((item) => item.payload.type)).size;

        return {
            unreadCount: unread.length,
            readCount: read.length,
            highPriorityCount: highPriority.length,
            types,
            topHighPriority: highPriority[0],
        };
    }, [items]);

    return (
        <WidgetCard
            title="Archive"
            icon={Files}
            loading={loading}
            href="/admin/reading"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                        <Sparkles className="w-3 h-3 text-accent/60" /> {summary.readCount} Absorbed
                    </span>
                    <span>{summary.types} Modules</span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.unreadCount}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">items in processing queue</p>
                </div>

                {summary.topHighPriority && (
                    <div className="p-3 rounded-xl border border-danger/10 bg-danger/5">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-danger/60 mb-1.5 inline-flex items-center gap-1.5">
                            <ArrowUpCircle className="w-3 h-3" /> Priority Load
                        </p>
                        <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">{summary.topHighPriority.payload.title}</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
