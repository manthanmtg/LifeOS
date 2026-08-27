import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import BillDetail from "../components/BillDetail";
import BillListRow from "../components/BillListRow";
import type { Bill } from "../types";

const bill: Bill = {
  _id: "bill-1",
  module_type: "bill",
  is_public: false,
  created_at: "2026-08-28T09:00:00.000Z",
  updated_at: "2026-08-28T09:00:00.000Z",
  payload: {
    name: "Internet service",
    bill_date: "2026-08-01T00:00:00.000Z",
    currency: "INR",
    attachments: [],
  },
};

const billWithPdf: Bill = {
  ...bill,
  payload: {
    ...bill.payload,
    attachments: [
      {
        id: "attachment-1",
        filename: "April statement.pdf",
        content_type: "application/pdf",
        data: "pdf-data",
        size: 1024,
        uploaded_at: "2026-08-28T09:00:00.000Z",
      },
    ],
  },
};

function BillDetailHarness({ sourceBill = bill }: { sourceBill?: Bill }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open bill details
      </button>
      {open && (
        <BillDetail
          bill={sourceBill}
          onClose={() => setOpen(false)}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onBillUpdated={vi.fn()}
        />
      )}
    </>
  );
}

function BillListDetailHarness({ sourceBill = bill }: { sourceBill?: Bill }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <BillListRow
        bill={sourceBill}
        onClick={() => setOpen(true)}
        onEdit={vi.fn()}
        onDragStart={vi.fn()}
      />
      {open && (
        <BillDetail
          bill={sourceBill}
          onClose={() => setOpen(false)}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onBillUpdated={vi.fn()}
          getReturnFocusTarget={() =>
            document.querySelector<HTMLElement>("[data-bill-trigger-id]")
          }
        />
      )}
    </>
  );
}

describe("BillDetail accessibility", () => {
  it("traps keyboard focus and restores the bill opener after Escape", () => {
    render(<BillListDetailHarness />);

    const opener = screen.getByRole("button", {
      name: "View details for Internet service",
    });
    opener.focus();
    fireEvent.keyDown(opener, { key: "Enter" });

    const dialog = screen.getByRole("dialog", {
      name: "Internet service details",
    });
    const close = screen.getByRole("button", { name: "Close details" });
    const firstAction = screen.getByRole("button", { name: "Edit bill" });
    const lastAction = screen.getByRole("button", { name: "Delete bill" });

    expect(close).toHaveFocus();

    lastAction.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(firstAction).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "View details for Internet service",
      }),
    ).toHaveFocus();
  });

  it("keeps the bill details open while Escape closes its attachment preview", async () => {
    render(<BillDetailHarness sourceBill={billWithPdf} />);

    fireEvent.click(screen.getByRole("button", { name: "Open bill details" }));
    const previewTrigger = screen.getByRole("button", {
      name: "Preview April statement.pdf",
    });
    previewTrigger.focus();
    expect(previewTrigger).toHaveFocus();
    fireEvent.click(previewTrigger);

    const preview = screen.getByRole("dialog", {
      name: "Preview April statement.pdf",
    });
    const previewClose = screen.getByRole("button", {
      name: "Close preview",
    });
    expect(previewClose).toHaveFocus();
    expect(
      screen.queryByRole("dialog", { name: "Internet service details" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Preview April statement.pdf" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Internet service details" }),
    ).toBeInTheDocument();
    expect(preview).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Preview April statement.pdf",
        }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("button", { name: "Delete April statement.pdf" }),
    ).toBeInTheDocument();
  });

  it("opens a list row with the Space key", () => {
    render(<BillListDetailHarness />);

    const opener = screen.getByRole("button", {
      name: "View details for Internet service",
    });
    opener.focus();
    fireEvent.keyDown(opener, { key: " " });

    expect(
      screen.getByRole("dialog", { name: "Internet service details" }),
    ).toBeInTheDocument();
  });

  it("does not open details from keyboard events on the list row edit control", () => {
    const onClick = vi.fn();
    const onEdit = vi.fn();
    render(
      <BillListRow
        bill={bill}
        onClick={onClick}
        onEdit={onEdit}
        onDragStart={vi.fn()}
      />,
    );

    const edit = screen.getByRole("button", {
      name: "Edit Internet service",
    });
    const detailsTrigger = screen.getByRole("button", {
      name: "View details for Internet service",
    });
    expect(detailsTrigger).not.toContainElement(edit);

    fireEvent.keyDown(edit, { key: "Enter" });
    fireEvent.keyDown(edit, { key: " " });

    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(edit);
    expect(onEdit).toHaveBeenCalledWith(bill);
  });
});
