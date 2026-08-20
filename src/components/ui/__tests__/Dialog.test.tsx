import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Dialog from "../Dialog";

function DialogHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Dialog
        isOpen={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title">Example dialog</h2>
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("focuses the first action, traps tab focus, and restores the opener", () => {
    render(<DialogHarness />);

    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    fireEvent.click(opener);

    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("locks scrolling while open and closes from the backdrop", () => {
    render(<DialogHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByTestId("dialog-backdrop"));
    expect(document.body.style.overflow).toBe("");
  });

  it("supports alert dialogs and an explicit initial focus target", () => {
    const cancelRef = { current: null as HTMLButtonElement | null };

    render(
      <Dialog
        isOpen
        onClose={vi.fn()}
        role="alertdialog"
        aria-label="Delete item"
        initialFocusRef={cancelRef}
      >
        <button type="button">Delete</button>
        <button type="button" ref={cancelRef}>
          Cancel
        </button>
      </Dialog>,
    );

    expect(
      screen.getByRole("alertdialog", { name: "Delete item" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
