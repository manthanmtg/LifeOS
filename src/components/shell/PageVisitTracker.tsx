"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageVisitTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const trackVisit = async (moduleKey: string) => {
            try {
                await fetch("/api/system/track-visit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ moduleKey }),
                });
            } catch (error) {
                console.error("Failed to track visit", error);
            }
        };

        // Only track admin module pages: /admin/[module]
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length === 2 && segments[0] === "admin") {
            const moduleKey = segments[1];
            if (moduleKey !== "settings") {
                trackVisit(moduleKey);
            }
        }
    }, [pathname]);

    return null;
}
