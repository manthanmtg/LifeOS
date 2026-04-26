import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import SlidesAdminView from "../AdminView";

vi.mock("../DeckPreview", () => ({
  DeckPreview: () => <div data-testid="deck-preview" />,
}));

vi.mock("../Viewer", () => ({
  SlideViewer: () => <div data-testid="slide-viewer" />,
}));

describe("SlidesAdminView", () => {
  it("shows a skeleton instead of loading text during the initial fetch", () => {
    global.fetch = vi.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as typeof fetch;

    render(<SlidesAdminView />);

    expect(screen.queryByText(/Loading your decks/i)).toBeNull();
  });
});
