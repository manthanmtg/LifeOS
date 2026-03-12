"use client";

import { useState, useEffect } from "react";
import { Clock3, FileText, PenLine, Sparkles } from "lucide-react";
import { BlogPost } from "@/modules/blog/types";
import { estimateReadingTime } from "@/modules/blog/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";

export default function BlogWidget() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=blog_post")
            .then((r) => r.json())
            .then((d) => setPosts(d.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const published = posts.filter((p) => p.payload.status === "published");
    const drafts = posts.filter((p) => p.payload.status === "draft");
    const latest = [...published].sort(
        (a, b) =>
            new Date(b.payload.published_at || b.created_at).getTime() -
            new Date(a.payload.published_at || a.created_at).getTime()
    )[0];
    const totalMinutes = published.reduce(
        (sum, post) => sum + (post.payload.estimated_reading_time || estimateReadingTime(post.payload.content)),
        0
    );

    return (
        <WidgetCard
            title="Blog"
            icon={Sparkles}
            loading={loading}
            href="/admin/blog"
            accentColor="accent"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    {drafts.length > 0 && (
                        <span className="flex items-center gap-1 text-yellow-500">
                            <PenLine className="w-3 h-3" /> {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
                        </span>
                    )}
                    <span className="text-zinc-500 inline-flex items-center gap-1 ml-auto">
                        <FileText className="w-3 h-3" /> {posts.length} total
                    </span>
                </div>
            }
        >
            <div className="space-y-4 py-2">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{published.length}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">published posts · {totalMinutes} min read</p>
                </div>

                {latest && (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50 group/item transition-colors hover:border-accent/20">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1.5">Latest</p>
                        <p className="text-[13px] text-zinc-300 line-clamp-1 font-medium leading-relaxed">{latest.payload.title}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase inline-flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                {latest.payload.estimated_reading_time || estimateReadingTime(latest.payload.content)} min
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
