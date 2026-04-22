"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Max height for any widget card (in pixels).
 * The WidgetCard component enforces this as a hard constraint — content
 * that exceeds this height is clipped, and a dev-mode warning appears.
 *
 * Content budget with a footer: ~148px
 * Content budget without a footer: ~192px
 *
 * Recommended layouts (pick ONE per widget):
 *   A) WidgetStat + WidgetHighlight            (~112px)
 *   B) WidgetStat + WidgetMiniStats            (~136px)
 *   C) WidgetStat + WidgetList (max 2 items)   (~142px)
 *   D) WidgetStat alone                        (~60px)
 */
export const WIDGET_MAX_HEIGHT = 280;

type SemanticColor = "accent" | "warning" | "success" | "danger";

const TEXT_COLOR: Record<SemanticColor, string> = {
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
};

/** Hero number with label — the primary metric every widget must show. */
export function WidgetStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div>
      <p className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-widest leading-none">
        {label}
      </p>
    </div>
  );
}

/** A compact spotlight / alert row for one key detail. */
export function WidgetHighlight({
  icon: Icon,
  text,
  subtext,
  variant = "default",
}: {
  icon: LucideIcon;
  text: string;
  subtext?: string;
  variant?: "default" | SemanticColor;
}) {
  const styles: Record<string, string> = {
    default: "border-zinc-800 bg-zinc-950/50",
    warning: "border-warning/15 bg-warning/10",
    success: "border-success/15 bg-success/10",
    danger: "border-danger/15 bg-danger/10",
    accent: "border-accent/20 bg-accent/5",
  };
  const iconStyles: Record<string, string> = {
    default: "text-zinc-500",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
    accent: "text-accent",
  };

  return (
    <div className={cn("p-2.5 rounded-xl border", styles[variant])}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", iconStyles[variant])} />
        <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-snug">
          {text}
        </p>
      </div>
      {subtext && (
        <p className="text-[10px] text-zinc-600 mt-0.5 ml-[22px] line-clamp-1">
          {subtext}
        </p>
      )}
    </div>
  );
}

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

/** Up to 3 mini stat cells in a horizontal row. */
export function WidgetMiniStats({
  stats,
}: {
  stats: Array<{
    value: string | number;
    label: string;
    icon?: LucideIcon;
    color?: SemanticColor;
  }>;
}) {
  const capped = stats.slice(0, 3);
  return (
    <div
      className={cn("grid gap-2", GRID_COLS[capped.length] ?? "grid-cols-3")}
    >
      {capped.map((stat, i) => {
        const color = stat.color ?? "accent";
        return (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
          >
            {stat.icon && (
              <stat.icon className={cn("w-3 h-3 mb-1", TEXT_COLOR[color])} />
            )}
            <p
              className={cn(
                "text-sm font-bold tabular-nums",
                TEXT_COLOR[color],
              )}
            >
              {stat.value}
            </p>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Compact list — hard-capped at 2 items. */
export function WidgetList({
  items,
}: {
  items: Array<{ label: string; icon?: LucideIcon }>;
}) {
  const capped = items.slice(0, 2);
  return (
    <div className="space-y-1.5">
      {capped.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 p-2 bg-zinc-950/40 border border-zinc-800/40 rounded-lg"
        >
          {item.icon && (
            <item.icon className="w-3 h-3 text-zinc-600 shrink-0" />
          )}
          <span className="text-[11px] text-zinc-300 truncate font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
