"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { PenLine, Search, Tag, X, Star, Shapes } from "lucide-react";
import { cn } from "@/lib/utils";
import WhiteboardPreview from "./WhiteboardPreview";

const Excalidraw = dynamic(
    async () => (await import("@excalidraw/excalidraw")).Excalidraw,
    { ssr: false }
);

interface WhiteboardDoc {
    _id: string;
    is_public: boolean;
    payload: {
        name: string;
        description?: string;
        tags: string[];
        is_favorite: boolean;
        color_label: string;
        elements: Record<string, unknown>[];
        app_state: Record<string, unknown>;
        files: Record<string, unknown>;
    };
    updated_at: string;
}

export default function WhiteboardPublicView({ items }: { items: Record<string, unknown>[] }) {
    const boards = (items as unknown as WhiteboardDoc[]).filter((b) => b.is_public);
    const [searchQuery, setSearchQuery] = useState("");
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [viewingBoard, setViewingBoard] = useState<WhiteboardDoc | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const allTags = useMemo(() => {
        const set = new Set(boards.flatMap((b) => b.payload.tags || []));
        return Array.from(set).sort();
    }, [boards]);

    const filtered = useMemo(() => {
        let result = [...boards];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((b) =>
                b.payload.name.toLowerCase().includes(q) ||
                (b.payload.description || "").toLowerCase().includes(q) ||
                b.payload.tags.some((t) => t.toLowerCase().includes(q))
            );
        }
        if (tagFilter) {
            result = result.filter((b) => b.payload.tags.includes(tagFilter));
        }
        return result.sort((a, b) => {
            if (a.payload.is_favorite !== b.payload.is_favorite) return a.payload.is_favorite ? -1 : 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }, [boards, searchQuery, tagFilter]);

    const closeViewer = useCallback(() => setViewingBoard(null), []);

    if (boards.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <PenLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No whiteboards shared yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search whiteboards..."
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                </div>

                {allTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        <button
                            onClick={() => setTagFilter(null)}
                            className={cn(
                                "px-3 py-1 rounded-lg text-xs border transition-colors",
                                !tagFilter ? "bg-accent/15 border-accent/35 text-accent" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All
                        </button>
                        {allTags.map((t) => (
                            <button
                                key={t}
                                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs border transition-colors",
                                    tagFilter === t ? "bg-accent/15 border-accent/35 text-accent" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <PenLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No whiteboards found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((board) => {
                        const elementCount = board.payload.elements?.length || 0;
                        return (
                            <article
                                key={board._id}
                                onClick={() => setViewingBoard(board)}
                                className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-zinc-700 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01] transition-all"
                            >
                                {/* Preview */}
                                <div className="h-40 rounded-xl bg-zinc-950/60 border border-zinc-800/50 mb-4 flex items-center justify-center overflow-hidden">
                                    <WhiteboardPreview elements={board.payload.elements} files={board.payload.files} />
                                </div>

                                {/* Title */}
                                <div className="flex items-center gap-2">
                                    {board.payload.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="currentColor" />}
                                    <h3 className="font-semibold text-zinc-100 truncate">{board.payload.name}</h3>
                                </div>

                                {board.payload.description && (
                                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{board.payload.description}</p>
                                )}

                                {/* Tags + meta */}
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {board.payload.tags.slice(0, 3).map((t) => (
                                            <span key={t} className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded-md font-medium">{t}</span>
                                        ))}
                                    </div>
                                    {elementCount > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                                            <Shapes className="w-3 h-3" /> {elementCount}
                                        </span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Full-screen read-only viewer */}
            {viewingBoard && (
                <div ref={overlayRef} className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col">
                    {/* Viewer header */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <PenLine className="w-5 h-5 text-accent shrink-0" />
                            <h2 className="text-lg font-bold text-zinc-50 truncate">{viewingBoard.payload.name}</h2>
                        </div>
                        <button
                            onClick={closeViewer}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Excalidraw read-only */}
                    <div className="flex-1">
                        <Excalidraw
                            initialData={{
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                elements: viewingBoard.payload.elements as any,
                                appState: {
                                    ...viewingBoard.payload.app_state,
                                    theme: "dark",
                                    viewModeEnabled: true,
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                } as any,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                files: viewingBoard.payload.files as any,
                            }}
                            viewModeEnabled={true}
                            theme="dark"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
