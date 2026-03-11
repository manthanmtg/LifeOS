"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Clock3, FolderOpen, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    IDEA_PRIORITY_STYLES,
    IDEA_STATUS_LABELS,
    IDEA_STATUS_STYLES,
    type IdeaRecord,
    formatIdeaTimestamp,
} from "./shared";

interface IdeaDetailsModalProps {
    idea: IdeaRecord | null;
    isOpen: boolean;
    onClose: () => void;
}

function useDesktopDialog() {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mediaQuery = typeof window.matchMedia === "function"
            ? window.matchMedia("(min-width: 640px)")
            : null;
        const update = (event?: MediaQueryListEvent) => {
            setIsDesktop(event ? event.matches : mediaQuery?.matches ?? false);
        };

        update();
        mediaQuery?.addEventListener("change", update);
        return () => mediaQuery?.removeEventListener("change", update);
    }, []);

    return isDesktop;
}

export default function IdeaDetailsModal({ idea, isOpen, onClose }: IdeaDetailsModalProps) {
    // Removed mounted state
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const lastActiveElementRef = useRef<HTMLElement | null>(null);
    const isDesktop = useDesktopDialog();
    const titleId = useId();
    const descriptionId = useId();

    const timestampItems = useMemo(() => {
        if (!idea) return [];

        return [
            { label: "Created", value: formatIdeaTimestamp(idea.created_at), icon: Calendar },
            { label: "Updated", value: formatIdeaTimestamp(idea.updated_at), icon: Clock3 },
            { label: "Promoted", value: formatIdeaTimestamp(idea.payload.promoted_at), icon: Clock3 },
        ].filter((item) => item.value);
    }, [idea]);

// Removed useLayoutEffect for mounted

    useEffect(() => {
        if (!isOpen) return;

        lastActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusFrame = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== "Tab" || !dialogRef.current) return;

            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            cancelAnimationFrame(focusFrame);
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            lastActiveElementRef.current?.focus();
        };
    }, [isOpen, onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && idea ? (
                <div className="fixed inset-0 z-[140]" dir="auto">
                    <motion.button
                        type="button"
                        aria-label="Close idea details"
                        className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    <div className="absolute inset-0 flex items-end justify-center p-0 sm:p-4">
                        <motion.div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            aria-describedby={descriptionId}
                            initial={isDesktop ? { opacity: 0, scale: 0.98, y: 20 } : { opacity: 0, y: 48 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: swipeOffset,
                            }}
                            exit={isDesktop ? { opacity: 0, scale: 0.98, y: 20 } : { opacity: 0, y: 48 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onClick={(event) => event.stopPropagation()}
                            className={cn(
                                "relative flex w-full flex-col overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl",
                                "h-[100dvh] rounded-none border-x-0 border-b-0 sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-[2rem] sm:border"
                            )}
                        >
                            <div
                                className="flex justify-center border-b border-zinc-800/80 px-4 py-3 sm:hidden"
                                onTouchStart={(event) => setTouchStartY(event.touches[0]?.clientY ?? null)}
                                onTouchMove={(event) => {
                                    if (touchStartY === null) return;
                                    const delta = Math.max(0, (event.touches[0]?.clientY ?? 0) - touchStartY);
                                    setSwipeOffset(delta);
                                }}
                                onTouchEnd={() => {
                                    if (swipeOffset > 120) {
                                        onClose();
                                    }
                                    setTouchStartY(null);
                                    setSwipeOffset(0);
                                }}
                            >
                                <span className="h-1.5 w-14 rounded-full bg-zinc-700" aria-hidden="true" />
                            </div>

                            <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 px-5 py-4 sm:px-6 sm:py-5">
                                <div className="min-w-0 space-y-3 text-start">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", IDEA_STATUS_STYLES[idea.payload.status])}>
                                            {IDEA_STATUS_LABELS[idea.payload.status] ?? idea.payload.status}
                                        </span>
                                        <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium capitalize", IDEA_PRIORITY_STYLES[idea.payload.priority] ?? IDEA_PRIORITY_STYLES.medium)}>
                                            {idea.payload.priority}
                                        </span>
                                        {idea.payload.category ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400">
                                                <FolderOpen className="h-3 w-3" />
                                                {idea.payload.category}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="space-y-1">
                                        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                                            {idea.payload.title}
                                        </h2>
                                        <p id={descriptionId} className="text-sm text-zinc-400">
                                            Full idea details including description, notes, tags, and timeline metadata.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    ref={closeButtonRef}
                                    type="button"
                                    onClick={onClose}
                                    aria-label={`Close details for ${idea.payload.title}`}
                                    className="rounded-full border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
                                    <div className="space-y-5 text-start">
                                        <section className="space-y-2">
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Description</h3>
                                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-6 text-zinc-200">
                                                {idea.payload.description ? (
                                                    <p className="whitespace-pre-wrap break-words">{idea.payload.description}</p>
                                                ) : (
                                                    <p className="text-zinc-500">No description provided.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="space-y-2">
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Notes</h3>
                                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-6 text-zinc-200">
                                                {idea.payload.notes ? (
                                                    <p className="whitespace-pre-wrap break-words">{idea.payload.notes}</p>
                                                ) : (
                                                    <p className="text-zinc-500">No notes attached to this idea.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="space-y-5 text-start">
                                        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Timeline</h3>
                                            <div className="space-y-3">
                                                {timestampItems.length > 0 ? (
                                                    timestampItems.map((item) => {
                                                        const Icon = item.icon;
                                                        return (
                                                            <div key={item.label} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                                                                <span className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                                                                    <Icon className="h-4 w-4" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{item.label}</p>
                                                                    <p className="mt-1 text-sm text-zinc-200">{item.value}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-sm text-zinc-500">No timestamps available.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                                            <div className="flex items-center gap-2">
                                                <Tag className="h-4 w-4 text-zinc-500" />
                                                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Tags</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {idea.payload.tags.length > 0 ? (
                                                    idea.payload.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-zinc-500">No tags added.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            ) : null}
        </AnimatePresence>,
        document.body
    );
}
