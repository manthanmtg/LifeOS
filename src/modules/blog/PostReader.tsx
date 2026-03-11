"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Copy, LinkIcon } from "lucide-react";
import MarkdownPreview from "@/modules/blog/MarkdownPreview";
import { BlogHeading, BlogPost } from "@/modules/blog/types";
import { formatPostDate, getExcerpt, headingToId } from "@/modules/blog/utils";
import { cn } from "@/lib/utils";

interface Props {
    post: BlogPost;
    relatedPosts: BlogPost[];
}

function getScrollContainer(element: HTMLElement): Window | HTMLElement {
    let current: HTMLElement | null = element.parentElement;
    while (current) {
        const styles = window.getComputedStyle(current);
        const overflowY = styles.overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
            return current;
        }
        current = current.parentElement;
    }
    return window;
}

function isElementScrollContainer(container: Window | HTMLElement | null): container is HTMLElement {
    return container !== null && container !== window;
}

function outlinesEqual(a: BlogHeading[], b: BlogHeading[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i].id !== b[i].id || a[i].text !== b[i].text || a[i].level !== b[i].level) return false;
    }
    return true;
}

export default function PostReader({ post, relatedPosts }: Props) {
    const articleRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<Window | HTMLElement | null>(null);
    const [headings, setHeadings] = useState<BlogHeading[]>([]);
    const [progress, setProgress] = useState(0);
    const [activeHeading, setActiveHeading] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const publishedDate = formatPostDate(post.payload.published_at || post.created_at);

    useEffect(() => {
        const collectHeadings = () => {
            const article = articleRef.current;
            if (!article) {
                setHeadings([]);
                setActiveHeading("");
                return;
            }
            scrollContainerRef.current = getScrollContainer(article);

            const nodes = Array.from(article.querySelectorAll("h2, h3"));
            const idCounts = new Map<string, number>();
            const outline: BlogHeading[] = nodes
                .map((node, index) => {
                    const text = node.textContent?.trim() || "";
                    if (!text) return null;
                    const baseId = headingToId(text) || `section-${index + 1}`;
                    const count = (idCounts.get(baseId) || 0) + 1;
                    idCounts.set(baseId, count);
                    const id = count === 1 ? baseId : `${baseId}-${count}`;
                    if (node.getAttribute("id") !== id) {
                        node.setAttribute("id", id);
                    }
                    return {
                        id,
                        text,
                        level: node.tagName === "H2" ? 2 : 3,
                    } as BlogHeading;
                })
                .filter((item): item is BlogHeading => item !== null);

            setHeadings((prev) => (outlinesEqual(prev, outline) ? prev : outline));
            setActiveHeading((prev) => {
                if (prev && outline.some((item) => item.id === prev)) return prev;
                return outline[0]?.id || "";
            });
        };

        const article = articleRef.current;
        if (!article) return;

        const raf1 = window.requestAnimationFrame(collectHeadings);
        const raf2 = window.requestAnimationFrame(() => {
            collectHeadings();
        });

        return () => {
            window.cancelAnimationFrame(raf1);
            window.cancelAnimationFrame(raf2);
        };
    }, [post.payload.content]);

    useEffect(() => {
        const getContainerMetrics = () => {
            const container = scrollContainerRef.current;
            if (!isElementScrollContainer(container)) {
                return { top: 0, height: window.innerHeight };
            }
            const rect = container.getBoundingClientRect();
            return { top: rect.top, height: container.clientHeight };
        };

        const onScroll = () => {
            const article = articleRef.current;
            if (!article) return;

            const metrics = getContainerMetrics();
            const rect = article.getBoundingClientRect();
            const articleTop = rect.top - metrics.top;
            const offset = metrics.height * 0.2;
            const total = Math.max(1, rect.height - metrics.height * 0.4);
            const consumed = Math.min(total, Math.max(0, offset - articleTop));
            setProgress(Math.max(0, Math.min(100, Math.round((consumed / total) * 100))));

            let current = headings[0]?.id ?? "";
            for (const heading of headings) {
                const el = document.getElementById(heading.id);
                if (!el) continue;
                const headingTop = el.getBoundingClientRect().top - metrics.top;
                if (headingTop <= 120) current = heading.id;
            }
            setActiveHeading((prev) => (prev === current ? prev : current));
        };

        onScroll();
        const container = scrollContainerRef.current;
        if (!isElementScrollContainer(container)) {
            window.addEventListener("scroll", onScroll, { passive: true });
            return () => window.removeEventListener("scroll", onScroll);
        }

        container.addEventListener("scroll", onScroll, { passive: true });
        return () => container.removeEventListener("scroll", onScroll);
    }, [headings]);

    const scrollToHeading = (id: string) => {
        const target = document.getElementById(id);
        if (!target) return;

        const container = scrollContainerRef.current;
        if (!isElementScrollContainer(container)) {
            const top = target.getBoundingClientRect().top + window.scrollY - 104;
            window.scrollTo({ top, behavior: "smooth" });
        } else {
            const containerRect = container.getBoundingClientRect();
            const targetTop = target.getBoundingClientRect().top - containerRect.top + container.scrollTop - 88;
            container.scrollTo({ top: targetTop, behavior: "smooth" });
        }

        window.history.replaceState(null, "", `#${id}`);
        setActiveHeading(id);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            setCopied(false);
        }
    };

    return (
        <main className="flex-1 pb-16">
            <div className="sticky top-0 z-30 h-1 bg-zinc-900/80 backdrop-blur">
                <div className="h-full bg-accent transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>

            <div className="px-6 pt-10 md:pt-14">
                <div className="max-w-6xl mx-auto">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" /> All posts
                    </Link>

                    <header className="relative overflow-hidden border border-zinc-800 rounded-3xl bg-zinc-900/70 p-6 md:p-10 mb-8">
                        <div className="absolute -top-12 right-0 w-60 h-60 rounded-full bg-accent/15 blur-3xl" />
                        <div className="relative">
                            {post.payload.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {post.payload.tags.slice(0, 5).map((tag) => (
                                        <span key={tag} className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight">
                                {post.payload.title}
                            </h1>
                            {post.payload.seo_description && (
                                <p className="mt-4 text-zinc-300 max-w-3xl">{post.payload.seo_description}</p>
                            )}

                            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="w-4 h-4" />
                                    {publishedDate}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="w-4 h-4" />
                                    {post.payload.estimated_reading_time || 1} min read
                                </span>
                                <button
                                    onClick={handleCopyLink}
                                    className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-300 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    {copied ? "Copied" : "Copy link"}
                                </button>
                            </div>
                        </div>
                    </header>

                    {post.payload.cover_image_url && (
                        <div className="mb-8 rounded-3xl overflow-hidden border border-zinc-800">
                            <img src={post.payload.cover_image_url} alt={post.payload.title} className="w-full h-64 md:h-96 object-cover" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px] gap-10">
                        <article ref={articleRef} className="bg-zinc-900/35 border border-zinc-800 rounded-3xl p-6 md:p-10">
                            <MarkdownPreview content={post.payload.content} />
                        </article>

                        <aside className="hidden lg:block">
                            <div className="sticky top-24 space-y-4">
                                <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 p-4">
                                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Reading progress</p>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent transition-all duration-150" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-2">{progress}% complete</p>
                                </div>

                                {headings.length > 0 && (
                                    <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 p-4">
                                        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">On this page</p>
                                        <nav className="space-y-1">
                                            {headings.map((heading) => (
                                                <button
                                                    key={heading.id}
                                                    type="button"
                                                    onClick={() => scrollToHeading(heading.id)}
                                                    className={cn(
                                                        "w-full text-left flex items-start gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors",
                                                        heading.level === 3 && "ml-3",
                                                        activeHeading === heading.id
                                                            ? "bg-accent/10 text-accent"
                                                            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/70"
                                                    )}
                                                >
                                                    <LinkIcon className="w-3 h-3 mt-1 shrink-0" />
                                                    <span>{heading.text}</span>
                                                </button>
                                            ))}
                                        </nav>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>

                    {relatedPosts.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-zinc-100">Continue Reading</h2>
                                <Link href="/blog" className="text-sm text-accent hover:text-accent-hover transition-colors">
                                    View all
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {relatedPosts.map((item) => (
                                    <Link
                                        key={item._id}
                                        href={`/blog/${item.payload.slug}`}
                                        className="group border border-zinc-800 rounded-2xl bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
                                    >
                                        <p className="text-xs text-zinc-500 mb-2">{formatPostDate(item.payload.published_at || item.created_at)}</p>
                                        <h3 className="text-sm font-medium text-zinc-100 group-hover:text-accent transition-colors line-clamp-2">
                                            {item.payload.title}
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-2 line-clamp-3">
                                            {item.payload.seo_description || getExcerpt(item.payload.content, 120)}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
