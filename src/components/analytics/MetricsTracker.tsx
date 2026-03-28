"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

export default function MetricsTracker() {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);
  const sessionStart = useRef(0);

  // Set session start time on mount (must be in effect for React Compiler purity)
  useEffect(() => {
    sessionStart.current = Date.now();
  }, []);

  // Track page views
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
      } else if (pathParts[0] && pathParts[0] !== "login") {
        // Track all public pages as modules (blog, resume, etc.)
        activeModule = pathParts[0];
      }

      await trackEvent({
        module: activeModule,
        action: isFirstLoad.current ? "session_start" : "page_view",
        label: pathname,
        path: pathname,
        is_admin: isAdmin,
      });

      isFirstLoad.current = false;
    };

    recordPageView();
  }, [pathname]);

  // Track session duration on page unload
  useEffect(() => {
    const handleUnload = () => {
      const duration = Date.now() - sessionStart.current;
      // Use sendBeacon for reliable delivery during page unload
      const payload = JSON.stringify({
        module: "core",
        action: "session_end",
        value: duration,
        path: window.location.pathname,
        device_type:
          window.innerWidth < 768
            ? "mobile"
            : window.innerWidth < 1024
              ? "tablet"
              : "desktop",
        referrer: document.referrer || null,
      });
      navigator.sendBeacon("/api/metrics", payload);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return null;
}
