"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

export default function MetricsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isFirstLoad = useRef(true);

    useEffect(() => {
        const recordPageView = async () => {
            // Determine active module from path
            // Pattern: /admin/module-name or /module-name
            const pathParts = pathname.split("/").filter(Boolean);
            let activeModule = "core";

            if (pathParts[0] === "admin" && pathParts[1]) {
                activeModule = pathParts[1];
            } else if (pathParts[0] && !["login", "admin", "resume", "blog"].includes(pathParts[0])) {
                activeModule = pathParts[0];
            }

            await trackEvent({
                module: activeModule,
                action: isFirstLoad.current ? "session_start" : "page_view",
                label: pathname,
                path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""),
            });

            isFirstLoad.current = false;
        };

        recordPageView();
    }, [pathname, searchParams]);

    return null;
}

