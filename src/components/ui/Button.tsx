"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-zinc-50 text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-zinc-50/5",
  destructive:
    "bg-danger text-zinc-50 hover:bg-danger shadow-lg shadow-danger/10",
  outline:
    "border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300",
  secondary: "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
  ghost: "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100",
  link: "text-zinc-400 underline-offset-4 hover:underline",
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

const ButtonBase = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

ButtonBase.displayName = "Button";

export const Button = React.memo(ButtonBase);

Button.displayName = "Button";
