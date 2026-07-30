import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoanDetails from "../LoanDetails";
import type { EmiLoan, EmiTrackerSettings } from "../../types";
import type { LoanSection } from "../../lib/emi-view-model";

const settings: EmiTrackerSettings = {
  defaultCurrency: "INR",
  defaultDueDayOfMonth: 5,
  roundingDecimals: 2,
  numberFormat: "indian",
  defaultRecastStrategy: "keep_tenure_adjust_emi",
  categories: ["Home"],
};

const loan: EmiLoan = {
  _id: "loan-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  payload: {
    title: "Home loan",
    lender_name: "HDFC",
    category: "Home",
    currency: "INR",
    principal: 1200,
    tenure_months: 6,
    interest_type: "fixed",
    annual_interest_rate: 0,
    monthly_emi: 200,
    start_date: "2026-01-01T00:00:00.000Z",
    due_day_of_month: 5,
    processing_fee_financed: false,
    status: "active",
    payments: [],
    documents: [],
    rate_adjustments: [],
    recast_strategy: "keep_tenure_adjust_emi",
  },
};

function renderDetails(
  overrides: Partial<{
    activeSection: LoanSection;
    isSubmitting: boolean;
    onSectionChange: (section: LoanSection) => void;
  }> = {},
) {
  return render(
    <LoanDetails
      loan={loan}
      settings={settings}
      activeSection={overrides.activeSection ?? "overview"}
      isSubmitting={overrides.isSubmitting ?? false}
      onSectionChange={overrides.onSectionChange ?? vi.fn()}
      onBack={vi.fn()}
      onUpdate={vi.fn()}
      onEdit={vi.fn()}
    />,
  );
}

describe("LoanDetails", () => {
  it("shows saving feedback while nested loan updates are in progress", () => {
    renderDetails({ isSubmitting: true });

    expect(screen.getByRole("status")).toHaveTextContent(
      /saving loan updates/i,
    );
  });

  it("announces pending section changes when tab navigation has not settled yet", () => {
    const onSectionChange = vi.fn();
    renderDetails({ onSectionChange });

    fireEvent.click(screen.getByRole("tab", { name: /schedule/i }));

    expect(onSectionChange).toHaveBeenCalledWith("schedule");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(/loading schedule/i);
  });
});
