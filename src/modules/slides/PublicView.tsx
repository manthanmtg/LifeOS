"use client";

import { useState, useEffect } from "react";
import { Play, Presentation, Tag, Folder, User, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeckItem } from "./types";
import { FORMAT_LABELS, FORMAT_STYLES, VISIBILITY_LABELS, VISIBILITY_STYLES } from "./types";

export default function SlidesPublicView({ items }: { items: Record<string, unknown>[] }) {
    const data = items as unknown as DeckItem[];
    const [viewingDeck, setViewingDeck] = useState<DeckItem | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && viewingDeck) {
                setViewingDeck(null);
                setIsFullscreen(false);
            }
            if (e.key === "f" && viewingDeck) {
                setIsFullscreen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewingDeck]);

    if (data.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Presentation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No decks shared yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((item) => (
                <article
                    key={item._id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
                >
                    <div className="w-full h-28 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center mb-3">
                        {item.payload.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.payload.thumbnail_url}
                                alt={item.payload.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Presentation className="w-7 h-7 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                        )}
                    </div>

                    <h3 className="text-white font-medium line-clamp-1">{item.payload.title}</h3>
                    {item.payload.description && (
                        <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{item.payload.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", FORMAT_STYLES[item.payload.format])}>
                            {FORMAT_LABELS[item.payload.format]}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", VISIBILITY_STYLES[item.payload.visibility])}>
                            {VISIBILITY_LABELS[item.payload.visibility]}
                        </span>
                    </div>

                    {item.payload.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Tag className="w-3 h-3 text-zinc-600 shrink-0" />
                            {item.payload.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {tag}
                                </span>
                            ))}
                            {item.payload.tags.length > 3 && (
                                <span className="text-[10px] text-zinc-600">+{item.payload.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    {item.payload.folder && (
                        <div className="flex items-center gap-1 mt-1.5">
                            <Folder className="w-3 h-3 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500">{item.payload.folder}</span>
                        </div>
                    )}

                    {item.payload.author && (
                        <div className="flex items-center gap-1 mt-1.5">
                            <User className="w-3 h-3 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500">{item.payload.author}</span>
                        </div>
                    )}

                    {item.payload.deck_url && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                            <button
                                onClick={() => setViewingDeck(item)}
                                className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                            >
                                <Play className="w-4 h-4" /> Play Deck
                            </button>
                        </div>
                    )}
                </article>
            ))}

            {viewingDeck && (
                <div
                    className={cn(
                        "fixed inset-0 z-50 bg-black/95 flex items-center justify-center",
                        isFullscreen ? "p-0" : "p-4"
                    )}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setViewingDeck(null);
                            setIsFullscreen(false);
                        }
                    }}
                >
                    <div className={cn(
                        "relative bg-zinc-900 rounded-2xl overflow-hidden flex flex-col",
                        isFullscreen ? "w-full h-full" : "w-full max-w-6xl h-[90vh]"
                    )}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-50">{viewingDeck.payload.title}</h2>
                                {viewingDeck.payload.author && (
                                    <p className="text-xs text-zinc-500 mt-0.5">{viewingDeck.payload.author}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsFullscreen((prev) => !prev)}
                                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                    title="Toggle fullscreen (F)"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setViewingDeck(null);
                                        setIsFullscreen(false);
                                    }}
                                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                    title="Close (Esc)"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden bg-white">
                            {viewingDeck.payload.format === "pdf" && viewingDeck.payload.deck_url?.startsWith("data:") ? (
                                <iframe
                                    src={viewingDeck.payload.deck_url}
                                    className="w-full h-full"
                                    title={viewingDeck.payload.title}
                                />
                            ) : viewingDeck.payload.format === "html" && viewingDeck.payload.deck_url?.startsWith("data:") ? (
                                <iframe
                                    srcDoc={atob(viewingDeck.payload.deck_url.split(",")[1])}
                                    className="w-full h-full"
                                    title={viewingDeck.payload.title}
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            ) : viewingDeck.payload.deck_url ? (
                                <iframe
                                    src={viewingDeck.payload.deck_url}
                                    className="w-full h-full"
                                    title={viewingDeck.payload.title}
                                    allow="fullscreen"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-zinc-950">
                                    <div className="text-center text-zinc-500">
                                        <Presentation className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No deck URL available</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur">
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Esc</kbd> to close • <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">F</kbd> for fullscreen</span>
                                <span className={cn("px-2 py-0.5 rounded-md border", FORMAT_STYLES[viewingDeck.payload.format])}>
                                    {FORMAT_LABELS[viewingDeck.payload.format]}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
