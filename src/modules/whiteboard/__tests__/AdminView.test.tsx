import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WhiteboardAdminView from "../AdminView";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockDynamic = () => <div data-testid="mock-excalidraw" />;
    return MockDynamic;
  },
}));

const whiteboard = {
  _id: "board-1",
  module_type: "whiteboard_note",
  is_public: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  payload: {
    name: "Architecture Sketch",
    description: "",
    tags: ["planning"],
    is_favorite: true,
    color_label: "none",
    elements: [],
    app_state: {},
    files: {},
  },
};

describe("WhiteboardAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [whiteboard] }),
    } as Response);
  });

  it("exposes the pressed state of the favorites filter", async () => {
    render(<WhiteboardAdminView />);

    const favoritesFilter = await screen.findByRole("button", {
      name: /favorites/i,
    });

    expect(favoritesFilter).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(favoritesFilter);

    await waitFor(() =>
      expect(favoritesFilter).toHaveAttribute("aria-pressed", "true"),
    );
  });
});
