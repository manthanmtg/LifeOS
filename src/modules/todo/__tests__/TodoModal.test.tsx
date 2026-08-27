import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodoModal from "../TodoModal";

describe("TodoModal", () => {
  it("keeps keyboard focus in the editor and closes with Escape", () => {
    const onClose = vi.fn();

    render(<TodoModal onClose={onClose} onSave={vi.fn()} />);

    const title = screen.getByLabelText(/title of conquest/i);
    const save = screen.getByRole("button", { name: /manifest task/i });

    expect(document.body.style.overflow).toBe("hidden");
    expect(title).toHaveFocus();

    save.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: /close modal/i })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
