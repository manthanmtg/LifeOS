"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export default function AdminHeader() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = segments.map((seg, i) => {
        let label = seg.charAt(0).toUpperCase() + seg.slice(1);
        if (seg === "recurring-expenses" || seg === "subscriptions") label = "Recurring Expenses";
        return { label, isLast: i === segments.length - 1 };
    });

    return (
        <header className="flex items-center justify-between pb-6 mb-6 border-b border-zinc-800">
            <nav className="flex items-center gap-1.5 text-sm">
                <Home className="w-4 h-4 text-zinc-500" />
                {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                        <span className={crumb.isLast ? "text-zinc-100 font-medium" : "text-zinc-500"}>
                            {crumb.label}
                        </span>
                    </span>
                ))}
            </nav>
            <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-md font-mono">
                ⌘K
            </kbd>
        </header>
    );
}
