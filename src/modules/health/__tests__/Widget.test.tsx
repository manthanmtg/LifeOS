import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HealthWidget from "../Widget";

describe("HealthWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("surfaces the profile that needs attention when health alerts exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
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
