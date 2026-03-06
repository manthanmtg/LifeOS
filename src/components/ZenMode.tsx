"use client";

import { useState, useEffect, useCallback } from "react";

export default function ZenModeProvider({ children }: { children: React.ReactNode }) {
    const [zen, setZen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const toggle = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
            e.preventDefault();
            setZen((prev) => !prev);
        }
    }, []);

    useEffect(() => {
        const id = setTimeout(() => setMounted(true), 0);
        window.addEventListener("keydown", toggle);
        return () => {
            clearTimeout(id);
            window.removeEventListener("keydown", toggle);
        };
    }, [toggle]);

    // Suppress hydration mismatch by not applying class until mounted
    return (
        <div className={mounted && zen ? "zen-mode" : ""} suppressHydrationWarning>
            {children}
            {mounted && zen && (
                <div className="fixed bottom-4 right-4 z-50 bg-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded-full border border-zinc-700 animate-fade-in-up">
                    Zen Mode · <kbd className="font-mono text-accent">⌘⇧Z</kbd> to exit
                </div>
            )}
        </div>
    );
}
