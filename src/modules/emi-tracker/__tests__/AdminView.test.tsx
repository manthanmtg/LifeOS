import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EmiTrackerAdminView from "../AdminView";
import React from "react";

// Mock the hook and components that might cause issues
vi.mock("@/hooks/useModuleSettings", () => ({
  useModuleSettings: vi.fn(() => ({
    settings: {
      defaultCurrency: "INR",
      numberFormat: "indian",
      roundingDecimals: 2,
      categories: ["Home", "Car"],
      defaultRecastStrategy: "keep_tenure_adjust_emi"
    },
    updateSettings: vi.fn(),
    saving: false,
    loaded: true
  }))
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => <button {...props}>{children}</button>,
    h3: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => <h3 {...props}>{children}</h3>,
    h4: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => <h4 {...props}>{children}</h4>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("EmiTrackerAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads a loan into the list", async () => {
    const mockData = {
      success: true,
      data: [{
        _id: "loan-1",
        payload: {
          title: "Home Loan",
          lender_name: "HDFC",
          category: "Home",
          principal: 5000000,
          currency: "INR",
          tenure_months: 240,
          annual_interest_rate: 8.5,
          interest_type: "floating",
          monthly_emi: 43391,
          start_date: "2024-01-01",
          due_day_of_month: 5,
          processing_fee_financed: false,
          status: "active",
          payments: [],
          documents: [],
          rate_adjustments: [],
          recast_strategy: "keep_tenure_adjust_emi",
        }
      }]
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });

    render(<EmiTrackerAdminView />);
    
    // Wait for the loan to load
    await waitFor(() => {
      const el = screen.queryByText(/Home Loan/i);
      expect(el).not.toBeNull();
    }, { timeout: 4000 });

    expect(screen.getByText(/Home Loan/i)).toBeTruthy();
  });
});
