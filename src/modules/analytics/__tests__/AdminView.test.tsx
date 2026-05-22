import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AnalyticsAdminView, {
  getAverageSessionFormatted,
  getDeviceData,
} from "../AdminView";

describe("AnalyticsAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders the Analytics view", async () => {
    render(<AnalyticsAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(screen.getByText(/OS Analytics/i)).toBeDefined();
  });

  it("shows an admin skeleton while metrics are loading", () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // Keep the initial metrics request pending so the loading state is observable.
        }),
    );

    render(<AnalyticsAdminView />);

    expect(
      screen.getByRole("status", { name: /loading analytics/i }),
    ).toBeDefined();
    expect(screen.queryByText(/OS Analytics/i)).toBeNull();
  });

  it("aggregates device data in display order", () => {
    const deviceData = getDeviceData([
      { device_type: "mobile" },
      { device_type: "desktop" },
      { device_type: "tablet" },
      { device_type: "mobile" },
      { device_type: "unknown" },
    ]);

    expect(deviceData).toEqual([
      { name: "Desktop", value: 1 },
      { name: "Mobile", value: 2 },
      { name: "Tablet", value: 1 },
    ]);
  });

  it("formats average session duration from the provided metric subset", () => {
    const avgSession = getAverageSessionFormatted([
      { action: "session_end", value: 30_000 },
      { action: "page_view", value: 10_000 },
      { action: "session_end", value: 90_000 },
    ]);

    expect(avgSession).toBe("1m 0s");
  });
});
