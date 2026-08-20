import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EmiTrackerAdminView from "../AdminView";
import React from "react";
import { navigationState, routerMocks } from "@/test/mocks/navigation";
import type { EmiLoan } from "../types";

// Mock the hook and components that might cause issues
vi.mock("@/hooks/useModuleSettings", () => ({
  useModuleSettings: vi.fn(() => ({
    settings: {
      defaultCurrency: "INR",
      numberFormat: "indian",
      roundingDecimals: 2,
      categories: ["Home", "Car"],
      defaultRecastStrategy: "keep_tenure_adjust_emi",
    },
    updateSettings: vi.fn(),
    saving: false,
    loaded: true,
  })),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Calculator: () => <div data-testid="calculator-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Info: () => <div data-testid="info-icon" />,
  History: () => <div data-testid="history-icon" />,
  Files: () => <div data-testid="files-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  BarChart3: () => <div data-testid="barchart-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Landmark: () => <div data-testid="landmark-icon" />,
  CreditCard: () => <div data-testid="credit-card-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  ArrowDownToLine: () => <div data-testid="arrow-down-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  CalendarClock: () => <div data-testid="calendar-clock-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Link: () => <div data-testid="link-icon" />,
  PiggyBank: () => <div data-testid="piggy-bank-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  UploadCloud: () => <div data-testid="upload-icon" />,
  WalletCards: () => <div data-testid="wallet-icon" />,
  Percent: () => <div data-testid="percent-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
    h3: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <h3 {...props}>{children}</h3>
    ),
    h4: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <h4 {...props}>{children}</h4>
    ),
    section: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <section {...props}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("EmiTrackerAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not show the empty loan prompt during the initial load", () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise<Response>(() => {}),
    );

    render(<EmiTrackerAdminView />);

    expect(screen.queryByText(/Intelligent EMI Tracking/i)).toBeNull();
    expect(
      screen.queryByText(
        /No loans yet\. Add your first loan to get started\./i,
      ),
    ).toBeNull();
  });

  it("loads a loan into the list", async () => {
    const mockData = {
      success: true,
      data: [
        {
          _id: "loan-1",
          module_type: "emi_loan",
          is_public: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
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
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    render(<EmiTrackerAdminView />);

    // Wait for the data to be rendered (e.g. check for lender name)
    const el = await screen.findByText(/HDFC/i, {}, { timeout: 10000 });
    expect(el).toBeTruthy();
  }, 15000);

  it("uses portfolio mode without the old empty workspace when no loan is selected", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [makeLoan("loan-1", "Home Loan", "HDFC")],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    render(<EmiTrackerAdminView />);

    expect(await screen.findByText(/Total outstanding/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Select a loan to open the payoff workspace/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /home loan/i })).toBeVisible();
  }, 15000);

  it("keeps closed loans in a collapsed secondary section", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [
                makeLoan("loan-1", "Home Loan", "HDFC"),
                makeLoan("loan-2", "Car Loan", "SBI", {
                  status: "closed",
                  closed_at: "2025-01-01T00:00:00.000Z",
                }),
              ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    render(<EmiTrackerAdminView />);

    expect(
      await screen.findByRole("button", { name: /home loan/i }),
    ).toBeVisible();
    const closedLoansToggle = screen.getByRole("button", {
      name: /closed loans 1/i,
    });

    expect(closedLoansToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", { name: /car loan/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(closedLoansToggle);

    expect(screen.getByRole("button", { name: /car loan/i })).toBeVisible();
  }, 15000);

  it("keeps schedule-complete loans out of the active tab", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [
                makeLoan("loan-active", "Active Loan", "HDFC", {
                  principal: 1200,
                  tenure_months: 3,
                  monthly_emi: 400,
                  annual_interest_rate: 0,
                  interest_type: "fixed",
                  first_due_date: "2099-01-05T00:00:00.000Z",
                }),
                makeLoan("loan-paid-off", "Paid Off Loan", "SBI", {
                  principal: 1200,
                  tenure_months: 3,
                  monthly_emi: 400,
                  annual_interest_rate: 0,
                  interest_type: "fixed",
                  first_due_date: "2000-01-05T00:00:00.000Z",
                  status: "active",
                }),
              ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    render(<EmiTrackerAdminView />);

    expect(
      await screen.findByRole("button", { name: /active loan/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^active 1$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^closed 1$/i })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /paid off loan/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /closed loans 1/i }));

    expect(
      screen.getByRole("button", { name: /paid off loan/i }),
    ).toBeVisible();
    expect(screen.getByText("Closed")).toBeVisible();
  }, 15000);

  it("keeps PortfolioHero out of selected-loan mode and renders a back action", async () => {
    navigationState.searchParams = new URLSearchParams("loan=loan-1");
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [makeLoan("loan-1", "Home Loan", "HDFC")],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    render(<EmiTrackerAdminView />);

    expect(
      await screen.findByRole("heading", { level: 2, name: /home loan/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Total outstanding/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to loans/i }));
    expect(routerMocks.push).toHaveBeenCalledWith("/admin/emi-tracker");
  }, 15000);

  it("shows pending feedback when opening a loan workspace", async () => {
    const mockData = {
      success: true,
      data: [
        {
          _id: "loan-1",
          module_type: "emi_loan",
          is_public: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
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
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    render(<EmiTrackerAdminView />);

    fireEvent.click(await screen.findByRole("button", { name: /home loan/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/opening home loan/i);
  }, 15000);
});

function makeLoan(
  id: string,
  title: string,
  lender: string,
  payload: Partial<EmiLoan["payload"]> = {},
) {
  return {
    _id: id,
    module_type: "emi_loan",
    is_public: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    payload: {
      title,
      lender_name: lender,
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
      ...payload,
    },
  };
}
