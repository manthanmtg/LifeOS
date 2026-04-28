import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AnalyticsAdminView, { getDeviceData } from "../AdminView";
import React from "react";

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
});
