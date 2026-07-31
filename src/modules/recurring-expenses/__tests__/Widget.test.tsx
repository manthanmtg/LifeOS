import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetSystemCache } from "@/hooks/useModuleSettings";
import RecurringExpensesWidget from "../Widget";
import { RECURRING_EXPENSE_CURRENCY_CACHE_KEY } from "../settings-cache";

const mockResponse = (data: unknown): Promise<Response> =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);

describe("RecurringExpensesWidget", () => {
  let resolveSystem: (value: Response) => void;
  let values: Record<string, string>;

  beforeEach(() => {
    vi.resetAllMocks();
    _resetSystemCache();
    values = {
      [RECURRING_EXPENSE_CURRENCY_CACHE_KEY]: JSON.stringify({
        defaultCurrency: "INR",
      }),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => values[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          values[key] = value;
        }),
      },
    });

    const systemPromise = new Promise<Response>((resolve) => {
      resolveSystem = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/system") return systemPromise;
      if (requestUrl.includes("/api/widgets/summary")) {
        return mockResponse({
          data: {
            activeCount: 1,
            totalBurn: 500,
            overdueCount: 0,
            dueSoonCount: 1,
            nextRenewal: {
              name: "Netflix",
              next_renewal_date: new Date().toISOString(),
            },
            daysUntilNext: 1,
          },
        });
      }
      return mockResponse({});
    });
  });

  it("uses cached default currency while system settings revalidate", async () => {
    render(<RecurringExpensesWidget />);

    expect(await screen.findByText("₹500")).toBeInTheDocument();
    expect(screen.queryByText("$500")).toBeNull();

    resolveSystem(
      new Response(
        JSON.stringify({
          data: {
            recurringExpenseSettings: {
              defaultCurrency: "GBP",
              numberFormat: "western",
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await waitFor(() => expect(screen.getByText("£500")).toBeInTheDocument());
  });
});
