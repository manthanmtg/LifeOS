"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";

export default function ZenModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={wrapperRef} suppressHydrationWarning>
      {children}
      <ZenModeController wrapperRef={wrapperRef} />
    </div>
  );
}

const ZenModeController = memo(function ZenModeController({
  wrapperRef,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [zen, setZen] = useState(false);

  const toggle = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      setZen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", toggle);
    return () => {
      window.removeEventListener("keydown", toggle);
    };
  }, [toggle]);

  useEffect(() => {
    wrapperRef.current?.classList.toggle("zen-mode", zen);
    if (wrapperRef.current) {
      wrapperRef.current.dataset.zenMode = String(zen);
    }
  }, [wrapperRef, zen]);

  if (!zen) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 [bottom:max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-2 pl-4 text-center text-xs text-zinc-300 shadow-2xl backdrop-blur animate-fade-in-up sm:left-auto sm:w-fit"
    >
      <span>Zen mode active</span>
      <button
        type="button"
        onClick={() => setZen(false)}
        aria-label="Exit Zen Mode"
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-800 px-3 font-semibold text-zinc-100 transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Exit
        <kbd aria-hidden="true" className="font-mono text-accent">
          Ctrl/⌘ ⇧ Z
        </kbd>
      </button>
    </div>
  );
});
