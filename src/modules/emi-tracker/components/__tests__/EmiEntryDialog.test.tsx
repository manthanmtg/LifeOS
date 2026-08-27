import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import EmiEntryDialog from "../EmiEntryDialog";

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open loan editor
      </button>
      <button type="button">Outside action</button>
      <EmiEntryDialog
        isOpen={isOpen}
        title="Add loan"
        onClose={() => setIsOpen(false)}
      >
        <input aria-label="Loan name" />
        <button type="button">Save loan</button>
      </EmiEntryDialog>
    </>
  );
}

describe("EmiEntryDialog", () => {
  it("traps keyboard focus and restores the launcher after closing", () => {
    render(<DialogHarness />);

    const opener = screen.getByRole("button", { name: "Open loan editor" });
    opener.focus();
    fireEvent.click(opener);

    const closeButton = screen.getByRole("button", { name: "Close" });
    const saveButton = screen.getByRole("button", { name: "Save loan" });
    expect(closeButton).toHaveFocus();

    saveButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("restores an existing body scroll style after closing", () => {
    document.body.style.overflow = "scroll";
    render(<DialogHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open loan editor" }));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).toBe("scroll");
  });
});
