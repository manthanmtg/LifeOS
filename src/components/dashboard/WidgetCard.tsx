"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Link from "next/link";

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
    accentColor = "accent"
}: WidgetCardProps) {
    const CardContent = (
        <div className={cn(
            "relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between h-full transition-all group",
            href && "hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01]",
            className
        )}>
            {/* Background Decoration */}
            <div className={cn(
                "absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-30",
                `bg-${accentColor}`
            )} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{title}</span>
                <div className="flex items-center gap-2">
                    {headerAction}
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        `bg-${accentColor}/10 text-${accentColor}`
                    )}>
                        <Icon className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10">
                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-8 w-1/3 bg-zinc-800 rounded-lg" />
                        <div className="h-4 w-2/3 bg-zinc-800 rounded-md" />
                        <div className="h-4 w-1/2 bg-zinc-800 rounded-md" />
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
