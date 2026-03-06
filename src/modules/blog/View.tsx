"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, FileText, Search, Sparkles } from "lucide-react";
import { BlogPost } from "@/modules/blog/types";
import { estimateReadingTime, formatPostDate, getExcerpt } from "@/modules/blog/utils";
import { cn } from "@/lib/utils";
import { BlogListSkeleton } from "@/components/ui/Skeletons";

export default function BlogView() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [tagFilter, setTagFilter] = useState<string>("all");

    useEffect(() => {
        fetch("/api/content?module_type=blog_post")
            .then((r) => r.json())
            .then((d) => {
                const published = (d.data || []).filter((p: BlogPost) => p.payload.status === "published") as BlogPost[];
                setPosts(published.sort((a, b) =>
                    new Date(b.payload.published_at || b.created_at).getTime() -
                    new Date(a.payload.published_at || a.created_at).getTime()
                ));
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        for (const post of posts) {
            for (const tag of post.payload.tags || []) {
                if (tag.trim()) tags.add(tag.trim());
            }
        }
        return Array.from(tags).sort((a, b) => a.localeCompare(b));
    }, [posts]);

    const filteredPosts = useMemo(() => {
        const search = query.trim().toLowerCase();
        return posts.filter((post) => {
            const matchesTag = tagFilter === "all" || post.payload.tags.includes(tagFilter);
            if (!matchesTag) return false;
            if (!search) return true;
            const haystack = `${post.payload.title} ${post.payload.seo_description || ""} ${post.payload.tags.join(" ")}`.toLowerCase();
            return haystack.includes(search);
        });
    }, [posts, query, tagFilter]);

    const featured = filteredPosts[0];
    const rest = filteredPosts.slice(1);
    const totalMinutes = posts.reduce(
        (total, item) => total + (item.payload.estimated_reading_time || estimateReadingTime(item.payload.content)),
        0
    );

    if (loading) {
        return <BlogListSkeleton />;
    }

    return (
        <div className="flex-1 px-6 py-14 md:py-16">
            <div className="max-w-6xl mx-auto">
                <section className="relative overflow-hidden border border-zinc-800 rounded-3xl bg-zinc-900/70 p-6 md:p-8 mb-8">
                    <div className="absolute -top-16 right-0 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
                    <div className="relative">
                        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-accent" /> Journal
                        </p>
                        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-100">Long-form ideas, guides, and build notes.</h1>
                        <p className="text-zinc-400 mt-3 max-w-2xl">
                            A reading-focused archive with practical writeups and experiments from Life OS.
                        </p>

                        <div className="mt-6 grid grid-cols-3 gap-3 md:max-w-xl">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
                                <p className="text-lg md:text-xl font-semibold text-zinc-100">{posts.length}</p>
                                <p className="text-xs text-zinc-500">Published posts</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
                                <p className="text-lg md:text-xl font-semibold text-zinc-100">{totalMinutes}</p>
                                <p className="text-xs text-zinc-500">Total min read</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
                                <p className="text-lg md:text-xl font-semibold text-zinc-100">{allTags.length}</p>
                                <p className="text-xs text-zinc-500">Topics</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-6">
                    <div className="relative mb-3">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search posts, tags, and keywords..."
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setTagFilter("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs border transition-colors",
                                tagFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All topics
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setTagFilter(tag)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs border transition-colors",
                                    tagFilter === tag
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </section>

                {posts.length === 0 ? (
                    <div className="text-center text-zinc-500 py-20">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No published posts yet.</p>
                    </div>
                ) : (
                    <>
                        {filteredPosts.length === 0 && (
                            <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-8 text-center text-zinc-400 mb-6">
                                <p>No posts match your current filters.</p>
                            </div>
                        )}

                        {featured && (
                            <Link href={`/blog/${featured.payload.slug}`} className="group block mb-6">
                                <article className="relative overflow-hidden border border-zinc-800 rounded-3xl bg-zinc-900/60 hover:border-zinc-700 transition-colors">
                                    {featured.payload.cover_image_url && (
                                        <>
                                            <img src={featured.payload.cover_image_url} alt={featured.payload.title} className="h-64 md:h-80 w-full object-cover opacity-70" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
                                        </>
                                    )}
                                    <div className={cn("relative p-6 md:p-8", !featured.payload.cover_image_url && "bg-gradient-to-br from-zinc-900 to-zinc-950")}>
                                        <p className="text-xs uppercase tracking-widest text-accent mb-3">Featured</p>
                                        <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 group-hover:text-accent transition-colors max-w-3xl">
                                            {featured.payload.title}
                                        </h2>
                                        <p className="text-zinc-300 mt-3 max-w-3xl line-clamp-3">
                                            {featured.payload.seo_description || getExcerpt(featured.payload.content, 220)}
                                        </p>
                                        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                                            <span>{formatPostDate(featured.payload.published_at || featured.created_at)}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="w-3.5 h-3.5" />
                                                {featured.payload.estimated_reading_time || estimateReadingTime(featured.payload.content)} min read
                                            </span>
                                            {featured.payload.tags.slice(0, 3).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        )}

                        {rest.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rest.map((post) => (
                                    <Link key={post._id} href={`/blog/${post.payload.slug}`} className="group">
                                        <article className="h-full border border-zinc-800 rounded-2xl bg-zinc-900/40 p-5 hover:border-zinc-700 transition-colors">
                                            <h3 className="text-lg font-medium text-zinc-100 group-hover:text-accent transition-colors line-clamp-2">
                                                {post.payload.title}
                                            </h3>
                                            <p className="text-sm text-zinc-400 mt-2 line-clamp-3">
                                                {post.payload.seo_description || getExcerpt(post.payload.content, 140)}
                                            </p>
                                            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                                                <span>{formatPostDate(post.payload.published_at || post.created_at)}</span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="w-3.5 h-3.5" />
                                                    {post.payload.estimated_reading_time || estimateReadingTime(post.payload.content)} min
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {post.payload.tags.slice(0, 2).map((tag) => (
                                                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </article>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
