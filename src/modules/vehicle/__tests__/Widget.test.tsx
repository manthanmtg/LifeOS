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

    const fuelState = await screen.findByText("No fuel logs");
    expect(fuelState).toHaveClass("text-zinc-500");
    expect(fuelState).not.toHaveClass("text-warning/80");
  });
});
