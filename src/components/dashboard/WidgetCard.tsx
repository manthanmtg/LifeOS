"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { WIDGET_MAX_HEIGHT } from "./widget-primitives";
import { SkeletonBlock } from "@/components/ui/Skeletons";

const COLOR_MAP: Record<string, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

function resolveColor(color: string): string {
  return COLOR_MAP[color] || color;
}

interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  href?: string;
  className?: string;
  headerAction?: ReactNode;
  accentColor?: string;
}

export default function WidgetCard({
  title,
  icon: Icon,
  children,
  footer,
  loading,
  href,
  className,
  headerAction,
  accentColor = "accent",
}: WidgetCardProps) {
  const resolved = resolveColor(accentColor);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const el = cardRef.current;
    if (!el || loading) return;

    let observer: ResizeObserver | null = null;
    const timer = setTimeout(() => {
      const check = () => {
        const overflow = el.scrollHeight - el.clientHeight;
        if (overflow > 4) {
          setIsOverflowing(true);
          console.warn(
            `[WidgetContract] "${title}" overflows by ${overflow}px ` +
              `(${el.scrollHeight}px content > ${WIDGET_MAX_HEIGHT}px max). ` +
              `Reduce content to honor the widget contract.`,
          );
        } else {
          setIsOverflowing(false);
        }
      };
      check();
      observer = new ResizeObserver(check);
      observer.observe(el);
    }, 150);

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [loading, title]);

  const showOverflow = isOverflowing && !loading;

  const CardContent = (
    <div
      ref={cardRef}
      style={{ maxHeight: WIDGET_MAX_HEIGHT }}
      className={cn(
        "relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between h-full transition-all group",
        href &&
          "hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01]",
        showOverflow && "ring-2 ring-danger/60",
        className,
      )}
    >
      {/* Dev-only overflow warning */}
      {showOverflow && (
        <div className="absolute inset-x-0 bottom-0 z-50 bg-danger/90 text-zinc-50 text-[9px] font-bold uppercase tracking-wider text-center py-1">
          ⚠ Widget overflow — reduce content to fit contract
        </div>
      )}

      {/* Background Decoration */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-30"
        style={{ backgroundColor: resolved }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 relative z-10 min-w-0">
        <span className="min-w-0 truncate text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              backgroundColor: `color-mix(in srgb, ${resolved} 10%, transparent)`,
              color: resolved,
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 min-h-0">
        {loading ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-8 w-1/3" />
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && !loading && (
        <div className="mt-4 pt-3 border-t border-zinc-800 relative z-10">
          {footer}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
