import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WhiteboardCard from "../WhiteboardCard";
import type { ContentDoc } from "../utils";

const board: ContentDoc = {
  _id: "board-1",
  module_type: "whiteboard_note",
  is_public: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  payload: {
    name: "Architecture Sketch",
    description: "System map",
    tags: ["planning"],
    is_favorite: false,
    color_label: "none",
    elements: [],
    app_state: {},
    files: {},
  },
};

function renderCard(
  overrides: Partial<React.ComponentProps<typeof WhiteboardCard>> = {},
) {
  const props: React.ComponentProps<typeof WhiteboardCard> = {
    board,
    isRenaming: false,
    renameValue: "",
    setRenameValue: vi.fn(),
    handleRename: vi.fn(),
    setRenamingId: vi.fn(),
    openBoard: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleVisibility: vi.fn(),
    duplicateBoard: vi.fn(),
    setColorLabel: vi.fn(),
    setDeleteTarget: vi.fn(),
    updatedMeta: { title: "January 2", relative: "1d ago" },
    ...overrides,
  };

  render(<WhiteboardCard {...props} />);
  return props;
}

describe("WhiteboardCard", () => {
  it("uses separate semantic controls for opening and card actions", () => {
    const props = renderCard();

    const openButton = screen.getByRole("button", {
      name: "Open Architecture Sketch",
    });
    fireEvent.click(openButton);
    expect(props.openBoard).toHaveBeenCalledWith(board);

    const article = screen.getByRole("article");
    expect(article.querySelector("button button")).toBeNull();
    expect(screen.getByRole("button", { name: "Favorite board" })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
  });

  it("opens the color picker on click and exposes its selected state", () => {
    const props = renderCard();
    const trigger = screen.getByRole("button", { name: /color label/i });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(
      screen.getByRole("button", { name: /color label/i }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Blue" }));
    expect(props.setColorLabel).toHaveBeenCalledWith(board, "blue");
    expect(
      screen.getByRole("button", { name: /color label/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps actions available on touch layouts and reveals them on keyboard focus", () => {
    renderCard();

    expect(screen.getByLabelText("Board actions")).toHaveClass(
      "opacity-100",
      "md:opacity-0",
      "md:group-focus-within:opacity-100",
    );
  });
});
