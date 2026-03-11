"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    Maximize2,
    Minimize2,
    Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { getIframeSrc } from "./utils";
import type { DeckItem } from "./types";

interface ViewerProps {
    decks: DeckItem[];
    startIndex: number;
    onClose: () => void;
}

export function SlideViewer({ decks, startIndex, onClose }: ViewerProps) {
    const initialIndex = Math.max(0, Math.min(startIndex, decks.length - 1));
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [showUI, setShowUI] = useState(true);
    const uiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const current = decks[currentIndex];
    const total = decks.length;

    const goTo = useCallback(
        (idx: number, dir: 1 | -1 = 1) => {
            if (idx < 0 || idx >= total) return;
            setDirection(dir);
            setCurrentIndex(idx);
        },
        [total]
    );

    const prev = useCallback(() => goTo(currentIndex - 1, -1), [currentIndex, goTo]);
    const next = useCallback(() => goTo(currentIndex + 1, 1), [currentIndex, goTo]);

    const handleMouseMove = useCallback(() => {
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const node = containerRef.current;
        node.addEventListener("mousemove", handleMouseMove);
        return () => {
            node.removeEventListener("mousemove", handleMouseMove);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        };
    }, [handleMouseMove]);

    // Fullscreen handling
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            try {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error("Error entering fullscreen:", err);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    onClose();
                }
            }
            if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") next();
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
            if (e.key === "f" || e.key === "F") toggleFullscreen();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [next, prev, onClose, toggleFullscreen]);

    // Body scroll lock
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    // Mouse click navigation
    const handleMouseClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;

        const { clientX } = e;
        const width = window.innerWidth;
        if (clientX > width * 0.7) {
            next();
        } else if (clientX < width * 0.3) {
            prev();
        }
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
            className={cn(
                "fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden",
                isFullscreen ? "cursor-none" : "p-4 md:p-12"
            )}
            onClick={handleMouseClick}
        >
            {/* Header - Global & Floating, visible on mouse move */}
            <AnimatePresence>
                {showUI && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-8 left-8 right-8 flex items-center justify-between z-30 pointer-events-none"
                    >
                        <div className="bg-white/5 backdrop-blur-2xl rounded-2xl px-6 py-4 border border-white/10 pointer-events-auto">
                            <h2 className="text-white font-medium text-xl tracking-tight">{current.payload.title}</h2>
                            {current.payload.author && (
                                <p className="text-white/40 text-xs font-light mt-1 uppercase tracking-widest">{current.payload.author}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                                className="p-4 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 text-white/50 hover:text-white transition-all hover:bg-white/10"
                                title="Fullscreen (F)"
                            >
                                {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="p-4 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 text-white/50 hover:text-red-400 transition-all hover:bg-white/10"
                                title="Close (Esc)"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={cn(
                "relative flex-1 rounded-3xl overflow-hidden bg-black shadow-2xl transition-all duration-500",
                isFullscreen ? "rounded-none" : "border border-white/5"
            )}>
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={current._id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute inset-0"
                    >
                        {(() => {
                            const src = getIframeSrc(current);
                            if (!src) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                                        <Presentation className="w-24 h-24 mb-4" />
                                        <p>No content available</p>
                                    </div>
                                );
                            }
                            return (
                                <div className="w-full h-full flex items-center justify-center bg-black">
                                    <iframe
                                        src={src.type === "src" ? src.value : undefined}
                                        srcDoc={src.type === "srcDoc" ? src.value : undefined}
                                        className="max-w-full max-h-full w-full h-full border-none overflow-hidden"
                                        title={current.payload.title}
                                        allow="fullscreen autoplay"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                        loading="lazy"
                                    />
                                </div>
                            );
                        })()}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Overlays (Invisible) */}
                <div className="absolute inset-y-0 left-0 w-1/2 cursor-w-resize z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-1/2 cursor-e-resize z-10 pointer-events-none" />

                {/* Subtle Progress Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 z-20">
                    <motion.div
                        className="h-full bg-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Subtle Counter */}
                {total > 0 && (
                    <div className="absolute bottom-8 right-8 px-4 py-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full text-[10px] text-white/40 z-20 tabular-nums uppercase tracking-widest">
                        {currentIndex + 1} / {total}
                    </div>
                )}
            </div>

            {/* Hint for Fullscreen */}
            <AnimatePresence>
                {isFullscreen && showUI && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 text-white/20 text-[10px] pointer-events-none select-none uppercase tracking-widest bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5"
                    >
                        Click sides to navigate · ESC to exit
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
