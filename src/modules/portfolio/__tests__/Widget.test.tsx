import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioWidget from "../Widget";

describe("PortfolioWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the empty state when the summary endpoint has no profile payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {},
        }),
    });

    render(React.createElement(PortfolioWidget));

    expect(await screen.findByText("No profile yet")).toBeInTheDocument();
    expect(
      await screen.findByText("Set up your first portfolio profile"),
    ).toBeInTheDocument();
  });
});
