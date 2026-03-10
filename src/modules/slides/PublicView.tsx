"use client";

import { useState } from "react";
import {
    Presentation,
    Tag,
    Folder,
    ChevronLeft,
    ChevronRight,
    X,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlideDeckItem } from "./types";
import { FORMAT_LABELS, FORMAT_STYLES, VISIBILITY_LABELS, VISIBILITY_STYLES } from "./types";

export default function SlidesPublicView({ items }: { items: Record<string, unknown>[] }) {
    const data = items as unknown as SlideDeckItem[];
    const [viewingDeck, setViewingDeck] = useState<SlideDeckItem | null>(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    if (data.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Presentation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No slide decks shared yet.</p>
            </div>
        );
    }

    if (viewingDeck) {
        const slides = viewingDeck.payload.slides || [];
        const currentSlide = slides[currentSlideIndex];
        const totalSlides = slides.length;

        return (
            <div className="space-y-4">
                <button
                    onClick={() => { setViewingDeck(null); setCurrentSlideIndex(0); }}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to decks
                </button>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-50">{viewingDeck.payload.title}</h2>
                            {viewingDeck.payload.author && (
                                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                    <User className="w-3 h-3" /> {viewingDeck.payload.author}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500">
                                {currentSlideIndex + 1} / {totalSlides}
                            </span>
                            <button
                                onClick={() => { setViewingDeck(null); setCurrentSlideIndex(0); }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Slide content */}
                    {totalSlides > 0 ? (
                        <div className="relative min-h-[400px] flex items-center justify-center p-8">
                            <button
                                onClick={() => setCurrentSlideIndex((p) => Math.max(p - 1, 0))}
                                disabled={currentSlideIndex === 0}
                                className="absolute left-4 p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="w-full max-w-3xl mx-auto text-center">
                                {currentSlide?.title && (
                                    <h3 className="text-2xl font-bold text-white mb-4">{currentSlide.title}</h3>
                                )}
                                <div
                                    className="prose prose-invert prose-lg max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: currentSlide?.content || "<p class='text-zinc-500'>Empty slide</p>",
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => setCurrentSlideIndex((p) => Math.min(p + 1, totalSlides - 1))}
                                disabled={currentSlideIndex === totalSlides - 1}
                                className="absolute right-4 p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="py-16 text-center text-zinc-500">
                            <p>This deck has no slides.</p>
                        </div>
                    )}

                    {/* Thumbnail strip */}
                    {totalSlides > 1 && (
                        <div className="border-t border-zinc-800 px-4 py-3">
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {slides.map((slide, idx) => (
                                    <button
                                        key={slide.id}
                                        onClick={() => setCurrentSlideIndex(idx)}
                                        className={cn(
                                            "shrink-0 w-20 h-14 rounded-lg border text-[10px] font-medium p-2 text-left transition-all truncate",
                                            idx === currentSlideIndex
                                                ? "border-accent bg-accent/10 text-accent"
                                                : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"
                                        )}
                                    >
                                        {slide.title || `Slide ${idx + 1}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((item) => (
                <button
                    key={item._id}
                    onClick={() => { setViewingDeck(item); setCurrentSlideIndex(0); }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition-colors group"
                >
                    {/* Thumbnail */}
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
                        <span className="text-[10px] text-zinc-500">
                            {item.payload.slide_count} slide{item.payload.slide_count !== 1 ? "s" : ""}
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
                </button>
            ))}
        </div>
    );
}
