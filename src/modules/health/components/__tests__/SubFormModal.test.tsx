import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import SubFormModal from "../SubFormModal";

function SubFormModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open editor
      </button>
      <SubFormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add vaccination"
        onSave={() => undefined}
      >
        <input aria-label="Vaccination name" />
      </SubFormModal>
    </>
  );
}

describe("SubFormModal", () => {
  it("restores focus to its opener after Escape", () => {
    render(<SubFormModalHarness />);

    const opener = screen.getByRole("button", { name: "Open editor" });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
