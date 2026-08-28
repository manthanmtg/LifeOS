import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { _resetSystemCache } from "@/hooks/useModuleSettings";
import RecurringExpensesAdminView from "../AdminView";

vi.mock("next/dynamic", async () => {
  const React = await import("react");

  return {
    default: (
      _loader: () => Promise<unknown>,
      options?: { loading?: () => React.ReactNode },
    ) => {
      const MockDynamic = ({ isOpen }: { isOpen: boolean }) => {
        const [loaded, setLoaded] = React.useState(false);

        React.useEffect(() => {
          setLoaded(true);
        }, []);

        if (!isOpen) return null;
        if (!loaded) return options?.loading?.() ?? null;

        return (
          <div role="dialog" aria-label="Recurring Expense Analytics">
            Analytics modal
          </div>
        );
      };

      return MockDynamic;
    },
  };
});

const mockResponse = (data: unknown): Promise<Response> =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);

describe("RecurringExpensesAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetSystemCache();
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

  it("shows a retryable error instead of an empty state when expenses fail to load", async () => {
    let expenseLoadAttempts = 0;
    global.fetch = vi.fn().mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/system") {
        return mockResponse({ data: {} });
      }

      if (requestUrl === "/api/content?module_type=recurring_expense") {
        expenseLoadAttempts += 1;

        if (expenseLoadAttempts === 1) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Service unavailable" }),
          });
        }

        return mockResponse({
          data: [
            {
              _id: "expense-1",
              payload: {
                name: "Netflix",
                cost: 500,
                currency: "INR",
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

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your recurring expenses/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No recurring expenses tracked yet"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /retry loading recurring expenses/i,
      }),
    );

    expect(await screen.findByText("Netflix")).toBeInTheDocument();
  });

  it("ignores a stale load failure after a newer sorted load succeeds", async () => {
    let resolveInitialLoad!: (response: Response) => void;
    const initialLoad = new Promise<Response>((resolve) => {
      resolveInitialLoad = resolve;
    });
    let expenseLoadAttempts = 0;

    global.fetch = vi.fn().mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/system") {
        return mockResponse({
          data: {
            recurringExpenseSettings: { defaultSort: "name-asc" },
          },
        });
      }

      if (requestUrl === "/api/content?module_type=recurring_expense") {
        expenseLoadAttempts += 1;
        if (expenseLoadAttempts === 1) return initialLoad;

        return mockResponse({
          data: [
            {
              _id: "expense-1",
              payload: {
                name: "Netflix",
                cost: 500,
                currency: "INR",
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

    expect(await screen.findByText("Netflix")).toBeInTheDocument();

    await act(async () => {
      resolveInitialLoad({
        ok: false,
        json: () => Promise.resolve({ error: "Service unavailable" }),
      } as Response);
      await initialLoad;
    });

    expect(
      screen.queryByRole("alert", {
        name: /couldn't load your recurring expenses/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("places the analytics icon immediately before settings", async () => {
    render(<RecurringExpensesAdminView />);

    const analyticsButton = await screen.findByRole("button", {
      name: "Open recurring expense analytics",
    });
    const settingsButton = screen.getByRole("button", {
      name: "Recurring expense settings",
    });

    expect(analyticsButton.compareDocumentPosition(settingsButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(analyticsButton).toHaveClass("h-11", "w-11");
    expect(settingsButton).toHaveClass("h-11", "w-11");
  });

  it("opens analytics without triggering another API request", async () => {
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
                name: "Netflix",
                cost: 500,
                currency: "INR",
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

    const analyticsButton = await screen.findByRole("button", {
      name: "Open recurring expense analytics",
    });

    const fetchCountBeforeOpen = vi.mocked(global.fetch).mock.calls.length;
    fireEvent.click(analyticsButton);

    expect(
      await screen.findByRole("dialog", {
        name: "Recurring Expense Analytics",
      }),
    ).toBeInTheDocument();
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(
      fetchCountBeforeOpen,
    );
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

  it("shows renewal notification offsets when notify is enabled", async () => {
    render(<RecurringExpensesAdminView />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).toBeNull();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /add recurring expense/i }),
    );

    expect(
      screen.getByRole("checkbox", { name: "Notify of renewal" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "1 day before" }),
    ).toBeChecked();
    expect(screen.getByLabelText(/custom day offset/i)).toBeInTheDocument();
  });
});
