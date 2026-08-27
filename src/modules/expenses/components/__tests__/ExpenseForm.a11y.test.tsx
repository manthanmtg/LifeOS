import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import ExpenseForm from "../ExpenseForm";
import type { ExpenseSettings } from "../types";

const settings: ExpenseSettings = {
  categories: ["Food"],
  defaultCurrency: "INR",
  monthlyBudget: 0,
  numberFormat: "indian",
};

describe("ExpenseForm", () => {
  it("traps focus, closes with Escape, and restores the opener", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open expense form
          </button>
          {open ? (
            <ExpenseForm
              expenses={[]}
              settings={settings}
              editingId={null}
              onClose={() => setOpen(false)}
              onSave={vi.fn()}
            />
          ) : null}
        </>
      );
    }

    render(<Harness />);

    const opener = screen.getByRole("button", { name: "Open expense form" });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole("dialog", { name: "Master Entry" })).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");

    const amount = screen.getByLabelText("Amount");
    await waitFor(() => expect(amount).toHaveFocus());

    const submit = screen.getByRole("button", { name: "Secure Entry" });

    submit.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(
      screen.getByRole("button", { name: "Close expense form" }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
