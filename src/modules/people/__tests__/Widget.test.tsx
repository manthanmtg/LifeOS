import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PeopleWidget from "../Widget";

describe("PeopleWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("keeps the dashboard tile to one hero metric and one detail", async () => {
    global.fetch = vi.fn().mockResolvedValue({
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

    render(<PeopleWidget />);

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("people you know")).toBeInTheDocument();
    expect(screen.getByText("2 to catch up with")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/favorites/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/health/i)).not.toBeInTheDocument();
    });
  });
});
