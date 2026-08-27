import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import CompassSubtaskModal from "../CompassSubtaskModal";
import type { CompassTask } from "../../types";

const subtask: NonNullable<CompassTask["payload"]["checklist"]>[number] = {
  id: "subtask-1",
  text: "Write accessibility regression tests",
  completed: false,
  comments: [],
};

function SubtaskModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open subtask editor
      </button>
      {open && (
        <CompassSubtaskModal
          subtask={subtask}
          onClose={() => setOpen(false)}
          onUpdate={vi.fn()}
        />
      )}
    </>
  );
}

describe("CompassSubtaskModal", () => {
  it("traps keyboard focus and returns it to the opener after Escape", () => {
    render(<SubtaskModalHarness />);

    const opener = screen.getByRole("button", {
      name: "Open subtask editor",
    });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", {
      name: "Write accessibility regression tests details",
    });
    const closeButton = screen.getByRole("button", {
      name: "Close subtask details",
    });
    const completeButton = screen.getByRole("button", {
      name: "Complete Subtask",
    });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(closeButton).toHaveFocus();

    completeButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("exposes description and comment editors as keyboard-operable buttons", () => {
    render(
      <CompassSubtaskModal
        subtask={subtask}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Edit subtask description" }),
    );
    expect(
      screen.getByPlaceholderText("Add more details about this subtask..."),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));
    expect(screen.getByPlaceholderText("Add a comment...")).toHaveFocus();
  });
});
