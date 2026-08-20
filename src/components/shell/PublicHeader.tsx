"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicModuleLink } from "@/lib/public-data";

interface Props {
  initialUserName?: string;
  publicModules?: PublicModuleLink[];
}

export default function PublicHeader({
  initialUserName = "Life OS",
  publicModules = [],
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = useMemo(
    () =>
      publicModules
        .filter((m) => m.slug !== "portfolio")
        .map((m) => ({ href: `/${m.slug}`, label: m.name })),
    [publicModules],
  );

  return (
    <header
      className={`border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-xl transition-all duration-300 [padding-top:env(safe-area-inset-top)] ${
        scrolled
          ? "bg-zinc-950/95 shadow-lg shadow-zinc-950/20"
          : "bg-zinc-950/80"
      }`}
    >
      <div
        className={`max-w-6xl mx-auto px-6 flex items-center justify-between transition-all duration-300 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        <Link
          href="/"
          className={`font-semibold tracking-tight hover:text-accent transition-all duration-300 min-w-0 flex-1 max-w-[65vw] md:max-w-none truncate ${
            scrolled ? "text-lg" : "text-xl"
          }`}
          title={initialUserName}
        >
          {initialUserName}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/70 transition-all duration-200 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/login"
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/70 transition-all duration-200 font-medium rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          >
            Admin
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
          aria-label={
            mobileOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileOpen}
          className="md:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-zinc-800"
          >
            <nav className="px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/admin/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 font-medium min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
              >
                Admin
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
