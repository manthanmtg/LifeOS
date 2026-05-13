import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import SlidesAdminView from "../AdminView";

vi.mock("../DeckPreview", () => ({
  DeckPreview: () =>
    React.createElement("div", { "data-testid": "deck-preview" }),
}));

vi.mock("../Viewer", () => ({
  SlideViewer: () =>
    React.createElement("div", { "data-testid": "slide-viewer" }),
}));

describe("SlidesAdminView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a skeleton instead of loading text during the initial fetch", () => {
    global.fetch = vi.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as typeof fetch;

    render(React.createElement(SlidesAdminView));

    expect(screen.queryByText(/Loading your decks/i)).toBeNull();
  });

  it("validates tag limits before submitting a deck", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(React.createElement(SlidesAdminView));

    fireEvent.click(screen.getByRole("button", { name: /new deck/i }));
    const titleInput = await screen.findByLabelText(/title/i);
    fireEvent.change(titleInput, {
      target: { value: "Quarterly planning" },
    });
    fireEvent.change(screen.getByLabelText(/deck url/i), {
      target: { value: "https://example.com/deck" },
    });
    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: {
        value: Array.from({ length: 21 }, (_, index) => `tag-${index}`).join(
          ", ",
        ),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(
      await screen.findByText("Use 20 tags or fewer."),
    ).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });
});
