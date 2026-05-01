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
});
