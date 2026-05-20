import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BingeWidget from "../Widget";

describe("BingeWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses an accurate empty state when there are titles but nothing active", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            total: 4,
            watchingCount: 0,
            avgRating: 8.5,
            latest: null,
          },
        }),
    });

    render(React.createElement(BingeWidget));

    expect(await screen.findByText("No active watch")).toBeInTheDocument();
    expect(screen.queryByText("Nothing queued up")).not.toBeInTheDocument();
  });

  it("shows the unavailable state when the summary request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "failed" }),
    });

    render(React.createElement(BingeWidget));

    expect(
      await screen.findByText("Binge summary unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Open Binge to verify data and retry."),
    ).toBeInTheDocument();
  });
});
