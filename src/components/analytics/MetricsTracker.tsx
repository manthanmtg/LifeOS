"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

export default function MetricsTracker() {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const recordPageView = async () => {
      // Determine active module from path
      // Pattern: /admin/module-name or /module-name
      const pathParts = pathname.split("/").filter(Boolean);
      let activeModule = "core";
      let isAdmin = false;

      if (pathParts[0] === "admin") {
        isAdmin = true;
        activeModule = pathParts[1] || "core";
      } else if (
        pathParts[0] &&
        !["login", "resume", "blog"].includes(pathParts[0])
      ) {
        activeModule = pathParts[0];
      }

      await trackEvent({
        module: activeModule,
        action: isFirstLoad.current ? "session_start" : "page_view",
        label: pathname,
        path: pathname, // Exclude searchParams to prevent over-counting during search/filtering
        is_admin: isAdmin,
      });

      isFirstLoad.current = false;
    };

    recordPageView();
  }, [pathname]); // Removed searchParams to fix over-counting

  return null;
}
