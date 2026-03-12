"use client";

import { useState, Suspense } from "react";
import {
    Play,
    Presentation,
    Tag,
    Folder,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { SlideViewer } from "./Viewer";
import { DeckPreview } from "./DeckPreview";
import type { DeckItem } from "./types";
import { FORMAT_LABELS, FORMAT_STYLES, VISIBILITY_LABELS, VISIBILITY_STYLES } from "./types";

// ─── Public View (deck grid) ───────────────────────────────────────────────────

export default function SlidesPublicView({ items }: { items: Record<string, unknown>[] }) {
    const data = (items as unknown as DeckItem[]).filter((item) => item.is_public);
    const [viewingIndex, setViewingIndex] = useState<number | null>(null);

    if (data.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Presentation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No decks shared yet.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Suspense fallback={<Presentation className="w-10 h-10 mx-auto opacity-30 animate-pulse" />}>
                    {data.map((item, idx) => (
                        <motion.article
                            key={item._id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05, duration: 0.3 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group cursor-pointer"
                            onClick={() => item.payload.deck_url && setViewingIndex(idx)}
                        >
                            {/* Live Preview */}
                            <div className="w-full aspect-video rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center mb-2.5 relative">
                                <Suspense fallback={<Presentation className="w-8 h-8 text-zinc-600 animate-pulse" />}>
                                    <DeckPreview
                                        deck={item}
                                        className="w-full h-full"
                                    />
                                </Suspense>

                                {/* Play overlay */}
                                {item.payload.deck_url && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur rounded-full p-3 border border-white/20">
                                            <Play className="w-5 h-5 text-white fill-white" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-white font-medium line-clamp-1 text-sm">{item.payload.title}</h3>
                            {item.payload.description && (
                                <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{item.payload.description}</p>
                            )}

                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                                <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-medium border", FORMAT_STYLES[item.payload.format])}>
                                    {FORMAT_LABELS[item.payload.format]}
                                </span>
                                <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-medium border", VISIBILITY_STYLES[item.payload.visibility])}>
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
                                <div className="mt-2.5 pt-2.5 border-t border-zinc-800">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingIndex(idx);
                                        }}
                                        className="flex items-center gap-2 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                                    >
                                        <Play className="w-3.5 h-3.5" /> Present
                                    </button>
                                </div>
                            )}
                        </motion.article>
                    ))}
                </Suspense>
            </div>

            {/* Full-screen viewer portal */}
            <AnimatePresence>
                {viewingIndex !== null && (
                    <Suspense fallback={null}>
                        <SlideViewer
                            decks={data}
                            startIndex={viewingIndex}
                            onClose={() => setViewingIndex(null)}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
        </>
    );
}
