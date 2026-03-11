"use client";

import { useState, useEffect, ComponentType, Suspense } from "react";
import { useRouter, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { moduleRegistry } from "@/registry";
import { Briefcase } from "lucide-react";
import { PublicModuleSkeleton } from "@/components/ui/Skeletons";

/* ── Module-specific public views ─────────────────────────────── */
function ViewLoadingFallback() {
    return <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-zinc-900/40 rounded-xl border border-zinc-800/50" />)}</div>;
}

const publicViews: Record<string, ComponentType<{ items: Record<string, unknown>[] }>> = {
    portfolio: dynamic(() => import("@/modules/portfolio/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    bookshelf: dynamic(() => import("@/modules/bookshelf/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    snippets: dynamic(() => import("@/modules/snippets/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    ideas: dynamic(() => import("@/modules/ideas/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    reading: dynamic(() => import("@/modules/reading/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    habits: dynamic(() => import("@/modules/habits/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    expenses: dynamic(() => import("@/modules/expenses/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    "recurring-expenses": dynamic(() => import("@/modules/recurring-expenses/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    calculators: dynamic(() => import("@/modules/calculators/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    whiteboard: dynamic(() => import("@/modules/whiteboard/PublicView"), { loading: () => <ViewLoadingFallback /> }),
    slides: dynamic(() => import("@/modules/slides/PublicView"), { loading: () => <ViewLoadingFallback /> }),
};

/* ── Module descriptions for public pages ─────────────────────── */
const moduleDescriptions: Record<string, string> = {
    bookshelf: "Books I'm reading, have read, and want to read.",
    snippets: "Reusable code snippets and references.",
    ideas: "A collection of ideas and explorations.",
    reading: "Articles, papers, videos, and podcasts in my queue.",
    habits: "Tracking consistency and building streaks.",
    expenses: "Expense tracking and spending insights.",
    "recurring-expenses": "Recurring expenses and monthly burn.",
    calculators: "A rich collection of calculators for money, planning, and everyday conversions.",
    blog: "Thoughts, guides, and stories.",
    portfolio: "About me, skills, and social links.",
    analytics: "Site analytics and visitor insights.",
    whiteboard: "Sketches, diagrams, and visual brainstorms.",
    slides: "Presentation decks — upload or link to your slides.",
};

interface ModuleVisibility {
    enabled: boolean;
    isPublic: boolean;
}

interface Props {
    slug: string;
    userName: string;
}

export default function PublicModuleClient({ slug, userName }: Props) {
    const modConfig = moduleRegistry[slug];
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const router = useRouter();

    if (!modConfig) {
        notFound();
    }

    useEffect(() => {
        fetch("/api/system", { cache: "no-store" })
            .then((r) => {
                if (r.status === 401) {
                    setUnauthorized(true);
                    return { data: { moduleRegistry: {} } };
                }
                return r.json();
            })
            .then((data) => {
                const registry: Record<string, ModuleVisibility> = data.data?.moduleRegistry || {};
                const vis = registry[slug];
                const isAllowed = vis ? (vis.isPublic && vis.enabled) : modConfig.defaultPublic;

                setAllowed(isAllowed);

                // Always try to fetch content if it's potentially public, 
                // regardless of whether we got a 401 from system settings or not.
                return fetch(`/api/content?module_type=${modConfig.contentType}&is_public=true`, { cache: "no-store" });
            })
            .then((r) => {
                if (r.status === 401) {
                    // Content fetch specifically rejected this as unauthorized
                    setAllowed(false);
                    return { data: [] };
                }
                return r.json();
            })
            .then((d) => {
                setItems(d.data || []);
            })
            .catch((err) => {
                console.error("PublicModuleClient overall fetch failed:", err);
                // Don't necessarily block if content fetch fails, but log it
            })
            .finally(() => setLoading(false));
    }, [slug, modConfig]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <PublicHeader initialUserName={userName} />
                <PublicModuleSkeleton />
                <PublicFooter />
            </div>
        );
    }

    if (allowed === false) {
        if (unauthorized) {
            router.push("/login");
            return null;
        }
        notFound();
    }

    const PublicView = publicViews[slug];

    return (
        <div className="min-h-screen flex flex-col">
            <PublicHeader initialUserName={userName} />
            <main className="flex-1 py-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">{modConfig.name}</h1>
                        {moduleDescriptions[slug] && (
                            <p className="text-zinc-500 mt-1">{moduleDescriptions[slug]}</p>
                        )}
                    </div>

                    <Suspense key={slug} fallback={<ViewLoadingFallback />}>
                        {PublicView ? (
                            <PublicView items={items} />
                        ) : (
                            /* Fallback for modules without a dedicated public view */
                            items.length === 0 ? (
                                <div className="text-center text-zinc-500 py-20">
                                    <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nothing here yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item: Record<string, unknown>, i: number) => {
                                        const payload = item.payload as Record<string, unknown>;
                                        const title = (payload?.title || payload?.name || payload?.hero_title || `Item ${i + 1}`) as string;
                                        const desc = (payload?.description || payload?.bio || payload?.seo_description || "") as string;
                                        return (
                                            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                                                <h3 className="text-sm font-medium text-zinc-50 mb-1">{title}</h3>
                                                {desc && <p className="text-xs text-zinc-500 line-clamp-2">{desc}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </Suspense>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
