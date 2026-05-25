import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RecurringExpensesAdminView from "../AdminView";

const mockResponse = (data: unknown): Promise<Response> =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);

describe("RecurringExpensesAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/system") {
        return mockResponse({ data: {} });
      }
      if (requestUrl.includes("/api/content")) {
        return mockResponse({ data: [] });
      }
      return mockResponse({});
    });
  });

  it("renders the Recurring Expenses view", async () => {
    render(<RecurringExpensesAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(screen.getByRole("heading", { name: /Recurring/i })).toBeDefined();
  });

  it("allows recurring expense card actions to wrap with larger mobile tap targets", async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/system") {
        return mockResponse({ data: {} });
      }
      if (requestUrl.includes("/api/content")) {
        return mockResponse({
          data: [
            {
              _id: "expense-1",
              payload: {
                name: "Long recurring subscription name for mobile layout",
                cost: 12,
                currency: "USD",
                billing_cycle: "monthly",
                next_renewal_date: new Date().toISOString(),
                category: "Streaming",
                is_active: true,
                enable_reminders: true,
              },
            },
          ],
        });
      }
      return mockResponse({});
    });

    render(<RecurringExpensesAdminView />);

    const editButton = await screen.findByRole("button", {
      name: "Edit expense",
    });
    const actionToolbar = editButton.parentElement?.parentElement;

    expect(actionToolbar).toHaveClass("flex-wrap", "justify-end");
    expect(editButton).toHaveClass("min-h-11", "min-w-11");
  });
});
