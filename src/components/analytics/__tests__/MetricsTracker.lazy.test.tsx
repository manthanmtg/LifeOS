import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { navigationState } from "@/test/mocks/navigation";

describe("MetricsTracker lazy loading", () => {
  it("defers loading the analytics helper until a page view is recorded", async () => {
    vi.resetModules();
    navigationState.pathname = "/admin/todo";

    let analyticsLoaded = false;
    const trackEventMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/analytics", () => {
      analyticsLoaded = true;
      return { trackEvent: trackEventMock };
    });

    const { default: MetricsTracker } = await import("../MetricsTracker");

    expect(analyticsLoaded).toBe(false);

    render(<MetricsTracker />);

    await waitFor(() => expect(analyticsLoaded).toBe(true));
    await waitFor(() => expect(trackEventMock).toHaveBeenCalledTimes(1));
  });
});
