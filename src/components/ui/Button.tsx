"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const variants = {
            default: "bg-zinc-50 text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/5",
            destructive: "bg-red-500 text-zinc-50 hover:bg-red-600 shadow-lg shadow-red-500/10",
            outline: "border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300",
            secondary: "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
            ghost: "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100",
            link: "text-zinc-400 underline-offset-4 hover:underline",
        };

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 px-3",
            lg: "h-11 px-8",
            icon: "h-10 w-10",
        };

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";
