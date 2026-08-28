import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HealthWidget from "../Widget";

describe("HealthWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows a recovery state when the health summary request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    render(React.createElement(HealthWidget));

    expect(
      await screen.findByText("Unable to load health summary"),
    ).toBeInTheDocument();
    expect(screen.getByText("Refresh to try again")).toBeInTheDocument();
    expect(screen.getByText("health summary unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No health data")).not.toBeInTheDocument();
  });

  it("shows a recovery state when the health summary cannot be reached", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network unavailable"));

    render(React.createElement(HealthWidget));

    expect(
      await screen.findByText("Unable to load health summary"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No health data")).not.toBeInTheDocument();
  });

  it("keeps a zero-profile summary distinct from the recovery state", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            total: 0,
            alertCount: 0,
            activeMedCount: 0,
            activeConditionCount: 0,
            upcomingVacCount: 0,
            latestVisit: null,
            profiles: [],
          },
        }),
    });

    render(React.createElement(HealthWidget));

    expect(await screen.findByText("all clear")).toBeInTheDocument();
    expect(screen.getByText("0 meds · 0 conditions")).toBeInTheDocument();
    expect(screen.getByText("0 profiles tracked")).toBeInTheDocument();
    expect(
      screen.queryByText("Unable to load health summary"),
    ).not.toBeInTheDocument();
  });

  it("surfaces the profile that needs attention when health alerts exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            total: 2,
            alertCount: 3,
            activeMedCount: 4,
            activeConditionCount: 2,
            upcomingVacCount: 1,
            latestVisit: null,
            profiles: [
              { name: "Avery", type: "self", alertCount: 1 },
              { name: "Maya", type: "family", alertCount: 2 },
            ],
          },
        }),
    });

    render(React.createElement(HealthWidget));

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("Maya needs attention")).toBeInTheDocument();
    expect(screen.getByText("2 alerts on this profile")).toBeInTheDocument();
    expect(screen.queryByText("4 meds · 2 conditions")).not.toBeInTheDocument();
  });
});
