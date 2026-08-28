import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExpenseAdminView from "../AdminView";

describe("ExpenseAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders the Expense Tracker view", async () => {
    render(<ExpenseAdminView />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).toBeNull();
    });
    expect(
      screen.getByRole("heading", { name: /Expense Intelligence/i }),
    ).toBeDefined();
  });

  it("shows a retryable error when expenses fail to load", async () => {
    let expenseLoadAttempts = 0;
    let resolveRetryLoad!: (value: {
      ok: boolean;
      json: () => Promise<unknown>;
    }) => void;
    const retryLoad = new Promise<{
      ok: boolean;
      json: () => Promise<unknown>;
    }>((resolve) => {
      resolveRetryLoad = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url === "/api/content?module_type=expense") {
        expenseLoadAttempts += 1;
        if (expenseLoadAttempts === 1) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Service unavailable" }),
          });
        }
        return retryLoad;
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ExpenseAdminView />);

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your expenses/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Net Flow")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /retry loading expenses/i }),
    );

    expect(
      screen.getByRole("alert", { name: /couldn't load your expenses/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();

    await act(async () => {
      resolveRetryLoad({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                _id: "expense-1",
                payload: {
                  amount: 500,
                  currency: "INR",
                  description: "Groceries",
                  category: "Food",
                  date: "2026-08-01T00:00:00.000Z",
                  type: "expense",
                  is_recurring: false,
                },
              },
            ],
          }),
      });
      await retryLoad;
    });

    await waitFor(() => {
      expect(expenseLoadAttempts).toBe(2);
      expect(screen.getByText("Groceries")).toBeInTheDocument();
      expect(
        screen.queryByRole("alert", { name: /couldn't load your expenses/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps settings available when expenses fail to load", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url === "/api/content?module_type=expense") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Service unavailable" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ExpenseAdminView />);

    await screen.findByRole("alert", {
      name: /couldn't load your expenses/i,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));

    expect(
      await screen.findByRole("tabpanel", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Categories" }),
    ).toBeInTheDocument();
  });
});
