import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PeopleWidget from "../Widget";

describe("PeopleWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the dashboard tile to one hero metric and one detail", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            total: 12,
            favorites: 3,
            staleCount: 2,
            healthScore: 88,
          },
        }),
    });

    render(React.createElement(PeopleWidget));

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("people you know")).toBeInTheDocument();
    expect(screen.getByText("2 to catch up with")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/favorites/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/health/i)).not.toBeInTheDocument();
    });
  });

  it("skips summary parsing when the tile unmounts before the fetch resolves", async () => {
    let resolveFetch: (response: { json: () => Promise<unknown> }) => void;
    const json = vi.fn().mockResolvedValue({
      data: {
        total: 12,
        staleCount: 2,
      },
    });
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { unmount } = render(React.createElement(PeopleWidget));

    unmount();
    resolveFetch!({ json });

    await Promise.resolve();
    await Promise.resolve();

    expect(json).not.toHaveBeenCalled();
  });
});
