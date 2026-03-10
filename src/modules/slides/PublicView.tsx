"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Play,
    Presentation,
    Tag,
    Folder,
    User,
    X,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    Clock,
    LayoutGrid,
    EyeOff,
    Eye,
    SkipBack,
    SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { DeckItem } from "./types";
import { FORMAT_LABELS, FORMAT_STYLES, VISIBILITY_LABELS, VISIBILITY_STYLES } from "./types";

// ─── Slide Viewer ─────────────────────────────────────────────────────────────

interface ViewerProps {
    decks: DeckItem[];
    startIndex: number;
    onClose: () => void;
}

function SlideViewer({ decks, startIndex, onClose }: ViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [isPresMode, setIsPresMode] = useState(false);
    const [showThumbs, setShowThumbs] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(false);
    const [autoSeconds, setAutoSeconds] = useState(30);
    const [countdown, setCountdown] = useState(autoSeconds);
    const [isBrowserFS, setIsBrowserFS] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const current = decks[currentIndex];
    const total = decks.length;

    const goTo = useCallback(
        (idx: number, dir: 1 | -1 = 1) => {
            if (idx < 0 || idx >= total) return;
            setDirection(dir);
            setCurrentIndex(idx);
            setCountdown(autoSeconds);
        },
        [total, autoSeconds]
    );

    const prev = useCallback(() => goTo(currentIndex - 1, -1), [currentIndex, goTo]);
    const next = useCallback(() => goTo(currentIndex + 1, 1), [currentIndex, goTo]);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
            if (e.key === "f" || e.key === "F") toggleBrowserFS();
            if (e.key === "p" || e.key === "P") setIsPresMode((v) => !v);
            if (e.key === "t" || e.key === "T") setShowThumbs((v) => !v);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [next, prev, onClose]);

    // Touch / swipe
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // mostly vertical → ignore
        if (dx < -60) next();
        else if (dx > 60) prev();
    };

    // Auto-advance timer
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!autoAdvance) return;
        setCountdown(autoSeconds);
        timerRef.current = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    setDirection(1);
                    setCurrentIndex((i) => (i + 1 < total ? i + 1 : 0));
                    return autoSeconds;
                }
                return c - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [autoAdvance, autoSeconds, total]);

    // Browser fullscreen
    const toggleBrowserFS = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsBrowserFS(true);
        } else {
            document.exitFullscreen();
            setIsBrowserFS(false);
        }
    };

    useEffect(() => {
        const onChange = () => setIsBrowserFS(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    // iframe src helper
    const iframeSrc = (deck: DeckItem) => {
        if (!deck.payload.deck_url) return null;
        if (deck.payload.format === "html" && deck.payload.deck_url.startsWith("data:")) {
            return { type: "srcDoc", value: atob(deck.payload.deck_url.split(",")[1]) };
        }
        return { type: "src", value: deck.payload.deck_url };
    };

    const slideVariants = {
        enter: (d: number) => ({
            x: d > 0 ? "100%" : "-100%",
            opacity: 0,
        }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({
            x: d > 0 ? "-100%" : "100%",
            opacity: 0,
        }),
    };

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Top bar ── */}
            <AnimatePresence>
                {!isPresMode && (
                    <motion.div
                        key="topbar"
                        initial={{ y: -60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -60, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 px-4 py-3 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 z-10 shrink-0"
                    >
                        {/* Title */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                                {current.payload.title}
                            </h2>
                            {current.payload.author && (
                                <p className="text-[11px] text-zinc-500 mt-0.5">{current.payload.author}</p>
                            )}
                        </div>

                        {/* Progress counter */}
                        <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                            {currentIndex + 1} / {total}
                        </span>

                        {/* Auto-advance */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setAutoAdvance((v) => !v)}
                                title={`Auto-advance every ${autoSeconds}s (A)`}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-colors",
                                    autoAdvance
                                        ? "bg-accent/20 border-accent/40 text-accent"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                )}
                            >
                                <Clock className="w-3 h-3" />
                                {autoAdvance ? `${countdown}s` : `${autoSeconds}s`}
                            </button>
                        </div>

                        {/* Thumbnails toggle */}
                        <button
                            onClick={() => setShowThumbs((v) => !v)}
                            title="Toggle thumbnails (T)"
                            className={cn(
                                "p-2 rounded-lg border transition-colors",
                                showThumbs
                                    ? "bg-accent/20 border-accent/40 text-accent"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>

                        {/* Presentation mode */}
                        <button
                            onClick={() => setIsPresMode(true)}
                            title="Presentation mode – hide UI (P)"
                            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            <EyeOff className="w-4 h-4" />
                        </button>

                        {/* Browser fullscreen */}
                        <button
                            onClick={toggleBrowserFS}
                            title="Browser fullscreen (F)"
                            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            {isBrowserFS ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            title="Close (Esc)"
                            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Progress bar ── */}
            <div className="h-1 bg-zinc-800 shrink-0">
                <motion.div
                    className="h-full bg-accent"
                    animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                />
            </div>

            {/* ── Main content area ── */}
            <div className="flex flex-1 min-h-0">
                {/* Thumbnail sidebar */}
                <AnimatePresence>
                    {showThumbs && !isPresMode && (
                        <motion.div
                            key="thumbs"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 160, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="shrink-0 bg-zinc-950 border-r border-zinc-800 overflow-y-auto overflow-x-hidden flex flex-col gap-2 p-2"
                        >
                            {decks.map((deck, idx) => (
                                <button
                                    key={deck._id}
                                    onClick={() => goTo(idx, idx > currentIndex ? 1 : -1)}
                                    className={cn(
                                        "w-full rounded-lg overflow-hidden border text-left shrink-0 transition-all",
                                        idx === currentIndex
                                            ? "border-accent ring-1 ring-accent/50"
                                            : "border-zinc-800 hover:border-zinc-700"
                                    )}
                                >
                                    <div className="h-20 bg-zinc-800 flex items-center justify-center">
                                        {deck.payload.thumbnail_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={deck.payload.thumbnail_url}
                                                alt={deck.payload.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Presentation className="w-5 h-5 text-zinc-600" />
                                        )}
                                    </div>
                                    <div className="px-1.5 py-1">
                                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                                            {deck.payload.title}
                                        </p>
                                        <span className="text-[9px] text-zinc-600">{idx + 1}</span>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Slide frame */}
                <div className="flex-1 relative overflow-hidden bg-zinc-950">
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={current._id}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
                            className="absolute inset-0 flex"
                        >
                            {(() => {
                                const src = iframeSrc(current);
                                if (!src) {
                                    return (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-center text-zinc-500">
                                                <Presentation className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">No deck URL available</p>
                                            </div>
                                        </div>
                                    );
                                }
                                if (src.type === "srcDoc") {
                                    return (
                                        <iframe
                                            srcDoc={src.value}
                                            className="w-full h-full border-none"
                                            title={current.payload.title}
                                            sandbox="allow-scripts allow-same-origin"
                                        />
                                    );
                                }
                                return (
                                    <iframe
                                        src={src.value}
                                        className="w-full h-full border-none"
                                        title={current.payload.title}
                                        allow="fullscreen autoplay"
                                    />
                                );
                            })()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Prev / Next overlay buttons */}
                    {currentIndex > 0 && (
                        <button
                            onClick={prev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur transition-all opacity-60 hover:opacity-100 z-10"
                            title="Previous deck (←)"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    {currentIndex < total - 1 && (
                        <button
                            onClick={next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur transition-all opacity-60 hover:opacity-100 z-10"
                            title="Next deck (→)"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}

                    {/* Presentation mode – floating exit button */}
                    <AnimatePresence>
                        {isPresMode && (
                            <motion.div
                                key="pres-hud"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur rounded-full px-4 py-2 border border-white/10 z-20"
                            >
                                <button
                                    onClick={prev}
                                    disabled={currentIndex === 0}
                                    className="p-1 rounded-full text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                                >
                                    <SkipBack className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-white/50 tabular-nums w-12 text-center">
                                    {currentIndex + 1}/{total}
                                </span>
                                <button
                                    onClick={next}
                                    disabled={currentIndex === total - 1}
                                    className="p-1 rounded-full text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                                >
                                    <SkipForward className="w-4 h-4" />
                                </button>
                                <div className="w-px h-4 bg-white/20 mx-1" />
                                <button
                                    onClick={() => setIsPresMode(false)}
                                    className="p-1 rounded-full text-white/60 hover:text-white transition-colors"
                                    title="Exit presentation mode (P)"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-full text-white/60 hover:text-red-400 transition-colors"
                                    title="Close (Esc)"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Bottom status bar ── */}
            <AnimatePresence>
                {!isPresMode && (
                    <motion.div
                        key="bottombar"
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center justify-between px-5 py-2.5 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 shrink-0 gap-4"
                    >
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">← →</kbd> navigate
                            <span className="text-zinc-700">·</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">P</kbd> present
                            <span className="text-zinc-700">·</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">F</kbd> fullscreen
                            <span className="text-zinc-700">·</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">T</kbd> thumbnails
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            {/* Auto-advance speed */}
                            {autoAdvance && (
                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                    <span>Advance every</span>
                                    <select
                                        value={autoSeconds}
                                        onChange={(e) => setAutoSeconds(Number(e.target.value))}
                                        className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-300"
                                    >
                                        {[10, 15, 20, 30, 60, 120].map((s) => (
                                            <option key={s} value={s}>{s}s</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <span className={cn("px-2 py-0.5 rounded-md border text-[10px]", FORMAT_STYLES[current.payload.format])}>
                                {FORMAT_LABELS[current.payload.format]}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Public View (deck grid) ───────────────────────────────────────────────────

export default function SlidesPublicView({ items }: { items: Record<string, unknown>[] }) {
    const data = items as unknown as DeckItem[];
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((item, idx) => (
                    <motion.article
                        key={item._id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group cursor-pointer"
                        onClick={() => item.payload.deck_url && setViewingIndex(idx)}
                    >
                        {/* Thumbnail */}
                        <div className="w-full h-32 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center mb-3 relative">
                            {item.payload.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.payload.thumbnail_url}
                                    alt={item.payload.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Presentation className="w-8 h-8 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                            )}

                            {/* Play overlay */}
                            {item.payload.deck_url && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur rounded-full p-3 border border-white/20">
                                        <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                </div>
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingIndex(idx);
                                    }}
                                    className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                                >
                                    <Play className="w-4 h-4" /> Present
                                </button>
                            </div>
                        )}
                    </motion.article>
                ))}
            </div>

            {/* Full-screen viewer portal */}
            <AnimatePresence>
                {viewingIndex !== null && (
                    <SlideViewer
                        decks={data}
                        startIndex={viewingIndex}
                        onClose={() => setViewingIndex(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
