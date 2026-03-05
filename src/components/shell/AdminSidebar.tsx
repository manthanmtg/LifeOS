"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleRegistry } from "@/registry";
import { LayoutDashboard, Settings, User, FileText, DollarSign, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const IconMap: Record<string, any> = {
    User, FileText, DollarSign, LayoutDashboard, Settings
};

export default function AdminSidebar() {
    const pathname = usePathname();

    const modules = Object.entries(moduleRegistry).map(([key, config]) => ({
        href: `/admin/${key}`,
        name: config.name,
        icon: IconMap[config.icon] || User
    }));

    const links = [
        { href: "/admin", name: "Dashboard", icon: LayoutDashboard },
        ...modules,
        { href: "/admin/settings", name: "System Settings", icon: Settings }
    ];

    return (
        <div className="h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col text-sm text-zinc-400">
            <div className="p-6">
                <h2 className="text-zinc-50 font-semibold tracking-tight text-lg">Life OS</h2>
                <p className="text-xs text-zinc-600 mt-1">Admin Command Center</p>
            </div>

            <div className="flex-1 px-4 space-y-1 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                                isActive
                                    ? "bg-zinc-800/50 text-white font-medium"
                                    : "hover:bg-zinc-900 hover:text-zinc-200"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {link.name}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-zinc-800 mt-auto">
                <button
                    onClick={async () => {
                        // To implement logout, clear the cookie
                        document.cookie = "lifeos_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        window.location.href = "/login";
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </div>
    );
}
