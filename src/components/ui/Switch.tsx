"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "peer inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:transition-none",
          className,
        )}
        {...props}
      >
        <span
          data-slot="switch-track"
          className={cn(
            "pointer-events-none inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent transition-all duration-200",
            checked
              ? "bg-accent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
              : "bg-zinc-800",
          )}
        >
          <span
            className={cn(
              "block h-4 w-4 rounded-full bg-zinc-50 shadow-lg ring-0 transition-all duration-200",
              checked ? "translate-x-4" : "translate-x-0",
            )}
          />
        </span>
      </button>
    );
  },
);

Switch.displayName = "Switch";
