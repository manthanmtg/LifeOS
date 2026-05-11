"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

function ZenModeController({
  wrapperRef,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [zen, setZen] = useState(false);

  const toggle = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
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
  }, [wrapperRef, zen]);

  if (!zen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-center text-xs text-zinc-400 animate-fade-in-up sm:left-auto sm:w-fit">
      Zen Mode · <kbd className="font-mono text-accent">⌘⇧Z</kbd> to exit
    </div>
  );
}
