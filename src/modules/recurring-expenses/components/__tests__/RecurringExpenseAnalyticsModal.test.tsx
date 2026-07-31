import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import RecurringExpenseAnalyticsModal from "../RecurringExpenseAnalyticsModal";
import type { RecurringExpense } from "../../types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 31);

function expense(
  id: string,
  overrides: Partial<RecurringExpense["payload"]>,
): RecurringExpense {
  return {
    _id: id,
    payload: {
      name: `Expense ${id}`,
      cost: 100,
      currency: "INR",
      billing_cycle: "monthly",
      next_renewal_date: new Date(NOW + 7 * DAY).toISOString(),
      category: "Streaming",
      is_active: true,
      enable_reminders: true,
      ...overrides,
    },
  };
}

const mixedExpenses = [
  expense("netflix", {
    name: "Netflix",
    cost: 500,
    category: "Streaming",
    currency: "INR",
  }),
  expense("github", {
    name: "GitHub",
    cost: 10,
    category: "Cloud/SaaS",
    currency: "USD",
  }),
  expense("paused", {
    name: "Paused",
    cost: 999,
    currency: "INR",
    is_active: false,
  }),
];

function renderModal(
  overrides: Partial<
    React.ComponentProps<typeof RecurringExpenseAnalyticsModal>
  > = {},
) {
  const onClose = vi.fn();
  render(
    <RecurringExpenseAnalyticsModal
      isOpen
      expenses={mixedExpenses}
      defaultCurrency="INR"
      numberFormat="indian"
      now={NOW}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onClose };
}

describe("RecurringExpenseAnalyticsModal", () => {
  it("renders a named dialog with selected-currency analytics and data tables", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", {
      name: "Recurring Expense Analytics",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(
        "Active commitments, normalized monthly and scoped by currency.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Currency scope")).toHaveValue("INR");
    expect(
      screen.getByText(/LifeOS does not apply exchange rates/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Committed monthly")).toBeInTheDocument();
    expect(screen.getByText("Dominant category")).toBeInTheDocument();
    expect(screen.getAllByText("Netflix").length).toBeGreaterThan(0);

    const categoryPanel = screen.getByRole("region", {
      name: /category allocation/i,
    });
    expect(
      within(categoryPanel).getAllByText("Streaming").length,
    ).toBeGreaterThan(0);
    expect(
      within(categoryPanel).getByText("View data table"),
    ).toBeInTheDocument();
  });

  it("falls back to the first active currency when the default is absent", () => {
    renderModal({ defaultCurrency: "EUR" });

    expect(screen.getByLabelText("Currency scope")).toHaveValue("INR");
  });

  it("shows a simple empty state when there are no active expenses", () => {
    renderModal({
      expenses: [
        expense("paused", {
          is_active: false,
          name: "Paused only",
        }),
      ],
    });

    expect(
      screen.getByText("No active recurring expenses to analyze."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /category allocation/i }),
    ).toBeNull();
  });

  it("closes from Escape and backdrop interactions", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("recurring-analytics-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps focus and restores focus to the opener after close", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open analytics
          </button>
          {open && (
            <RecurringExpenseAnalyticsModal
              isOpen={open}
              expenses={mixedExpenses}
              defaultCurrency="INR"
              numberFormat="western"
              now={NOW}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open analytics" });
    opener.focus();
    fireEvent.click(opener);

    const close = await screen.findByRole("button", {
      name: "Close analytics",
    });
    expect(close).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Tab",
      shiftKey: true,
    });
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement,
    );

    fireEvent.click(close);

    await waitFor(() => expect(opener).toHaveFocus());
  });
});
