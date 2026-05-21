import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VehicleWidget from "../Widget";

describe("VehicleWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the missing fuel log footer as a neutral state", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: {
          total: 1,
          alertCount: 0,
          latestService: null,
          fuelCostThisMonth: 0,
        },
      }),
    });

    render(<VehicleWidget />);

    expect(
      await screen.findByText("No fuel logs this month · No service logs yet"),
    ).toBeInTheDocument();
    expect(screen.getByText("All vehicles are up to date")).toBeInTheDocument();
  });
});
