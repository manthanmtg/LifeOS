import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import ExpenseSpaceForm from "../ExpenseSpaceForm";

describe("ExpenseSpaceForm", () => {
  it("keeps keyboard focus in the form and closes with Escape", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open space form
          </button>
          <ExpenseSpaceForm
            open={open}
            onClose={() => setOpen(false)}
            onSave={vi.fn()}
          />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open space form" });
    opener.focus();
    fireEvent.click(opener);

    const nameInput = screen.getByLabelText(/^name/i);
    const createSpace = screen.getByRole("button", {
      name: "Create space",
    });

    expect(document.body.style.overflow).toBe("hidden");
    expect(nameInput).toHaveFocus();

    createSpace.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(
      screen.getByRole("button", { name: "Close expense space form" }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
