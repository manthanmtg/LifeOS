"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const trackVisit = async (
      moduleKey: string,
      source: "admin" | "public",
    ) => {
      try {
        await fetch("/api/system/track-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleKey, source }),
        });
      } catch (error) {
        console.error("Failed to track visit", error);
      }
    };

    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 2 && segments[0] === "admin") {
      // Admin module pages: /admin/[module]
      const moduleKey = segments[1];
      if (moduleKey !== "settings") {
        trackVisit(moduleKey, "admin");
      }
    } else if (
      segments.length >= 1 &&
      segments[0] !== "admin" &&
      segments[0] !== "login"
    ) {
      // Public module pages: /[module] or /[module]/...
      trackVisit(segments[0], "public");
    }
  }, [pathname]);

  return null;
}
