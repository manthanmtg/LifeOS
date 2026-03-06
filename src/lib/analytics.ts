"use client";

export interface AnalyticsEvent {
    module?: string;
    action?: string;
    label?: string | null;
    value?: number | null;
    metadata?: Record<string, unknown>;
    path?: string;
}

/**
 * Global tracking utility for Rich Analytics.
 * Can be used anywhere in the client-side code to record custom actions.
 */
export const trackEvent = async (event: AnalyticsEvent) => {
    if (typeof window === "undefined") return;

    try {
        // Basic device detection
        let deviceType = "desktop";
        if (window.innerWidth < 768) deviceType = "mobile";
        else if (window.innerWidth < 1024) deviceType = "tablet";

        const payload = {
            ...event,
            path: event.path || window.location.pathname + window.location.search,
            referrer: document.referrer || null,
            device_type: deviceType,
        };

        // Fire and forget
        fetch("/api/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }).catch(() => { }); // Explicitly catch to prevent unhandled rejections
    } catch {
        // Silently fail to not interrupt user experience
    }
};
